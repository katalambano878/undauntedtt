import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import {
    checkHubtelStatus,
    hubtelAmountMatches,
    isHubtelPaid,
    makeHubtelClientReference,
} from '@/lib/hubtel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Payment reconciler — the safety net behind the gateway callbacks.
 *
 * For every unpaid order created in the last 24h that has a known gateway,
 * we query that gateway's status endpoint. If the gateway says the customer
 * paid (and the amount matches), we run the same `mark_order_paid` RPC the
 * callbacks use. The RPC is idempotent so even concurrent calls from a slow
 * callback and this cron are safe.
 *
 * Every decision lands in `payment_reconcile_log` keyed by a per-run UUID.
 *
 * Auth: requires Authorization: Bearer ${CRON_SECRET}. Vercel cron sends
 * this automatically; manual calls must include the header explicitly.
 */

const LOOKBACK_HOURS = 24;
const MAX_PER_RUN = 60;
const PER_REQUEST_TIMEOUT_MS = 8000;

type RunCounters = {
    examined: number;
    confirmed: number;
    still_pending: number;
    amount_mismatch: number;
    status_failed: number;
    already_settled: number;
    skipped: number;
};

type LogRow = {
    run_id: string;
    order_id: string | null;
    order_number: string;
    gateway: string;
    action: string;
    expected_amount: number | null;
    reported_amount: number | null;
    gateway_status: string | null;
    gateway_response_code: string | null;
    notes: string | null;
};

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
        p.then((v) => { clearTimeout(t); resolve(v); })
            .catch((e) => { clearTimeout(t); reject(e); });
    });
}

/**
 * Accepted bearer tokens: CRON_SECRET (when configured on the host) or a
 * SHA-256 digest of the service-role key. The digest fallback exists
 * because this Vercel project's env doesn't expose CRON_SECRET, while the
 * service-role key is always present — the Supabase pg_cron job derives
 * the same digest without the raw key ever leaving the backend.
 */
function acceptedCronTokens(): string[] {
    const tokens: string[] = [];
    if (process.env.CRON_SECRET) tokens.push(process.env.CRON_SECRET);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
        tokens.push(createHash('sha256').update(serviceKey).digest('hex'));
    }
    return tokens;
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization') || '';
    const tokens = acceptedCronTokens();
    if (tokens.length === 0) {
        return NextResponse.json({ error: 'Cron auth not configured' }, { status: 503 });
    }
    if (!tokens.some((t) => authHeader === `Bearer ${t}`)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    const counters: RunCounters = {
        examined: 0,
        confirmed: 0,
        still_pending: 0,
        amount_mismatch: 0,
        status_failed: 0,
        already_settled: 0,
        skipped: 0,
    };
    const logs: LogRow[] = [];

    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

    // Chase orders that aren't paid yet, are still pending, and were
    // created inside the lookback window. Oldest first — those are the
    // most likely victims of a dropped callback.
    const { data: candidates, error: queryError } = await supabaseAdmin
        .from('orders')
        .select('id, order_number, total, payment_status, status, email, metadata, created_at')
        .gte('created_at', since)
        .in('payment_status', ['pending', 'failed'])
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(MAX_PER_RUN);

    if (queryError) {
        console.error('[Reconciler] Candidate query failed:', queryError.message);
        return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    for (const order of candidates || []) {
        counters.examined += 1;

        const meta: any = order.metadata || {};
        const gateway = String(meta.payment_method || '').toLowerCase();

        if (!['hubtel', 'moolre'].includes(gateway)) {
            counters.skipped += 1;
            logs.push({
                run_id: runId,
                order_id: order.id,
                order_number: order.order_number,
                gateway: gateway || 'unknown',
                action: 'skipped',
                expected_amount: Number(order.total),
                reported_amount: null,
                gateway_status: null,
                gateway_response_code: null,
                notes: 'no recognised payment_method on order metadata',
            });
            continue;
        }

        try {
            if (gateway === 'hubtel') {
                await reconcileHubtel({ order, runId, counters, logs });
            } else {
                await reconcileMoolre({ order, runId, counters, logs });
            }
        } catch (e: any) {
            counters.status_failed += 1;
            logs.push({
                run_id: runId,
                order_id: order.id,
                order_number: order.order_number,
                gateway,
                action: 'status_failed',
                expected_amount: Number(order.total),
                reported_amount: null,
                gateway_status: null,
                gateway_response_code: null,
                notes: `exception: ${e?.message || e}`.slice(0, 500),
            });
        }
    }

    if (logs.length > 0) {
        const { error: insertErr } = await supabaseAdmin
            .from('payment_reconcile_log')
            .insert(logs);
        if (insertErr) {
            console.error('[Reconciler] Log insert failed:', insertErr.message);
        }
    }

    const duration_ms = Date.now() - startedAt;
    console.log(
        `[Reconciler] run=${runId} examined=${counters.examined} confirmed=${counters.confirmed} ` +
        `still_pending=${counters.still_pending} mismatch=${counters.amount_mismatch} ` +
        `status_failed=${counters.status_failed} skipped=${counters.skipped} duration_ms=${duration_ms}`,
    );

    return NextResponse.json({ run_id: runId, duration_ms, counters });
}

// --------------------------------------------------------------------------
// Gateway-specific reconcilers
// --------------------------------------------------------------------------

type RecArgs = {
    order: any;
    runId: string;
    counters: RunCounters;
    logs: LogRow[];
};

async function reconcileHubtel(args: RecArgs) {
    const { order, runId, counters, logs } = args;
    const meta: any = order.metadata || {};
    const expectedAmount = Number(order.total) || 0;
    const clientRef: string =
        (meta.hubtel_client_reference as string | undefined) ||
        makeHubtelClientReference(order.order_number);

    const status = await withTimeout(
        checkHubtelStatus(clientRef),
        PER_REQUEST_TIMEOUT_MS,
        'hubtel checkHubtelStatus',
    );
    const sStatus = String(status?.data?.status || '').toLowerCase();
    const responseCode = status?.responseCode;

    if (!isHubtelPaid(sStatus, responseCode)) {
        counters.still_pending += 1;
        logs.push({
            run_id: runId,
            order_id: order.id,
            order_number: order.order_number,
            gateway: 'hubtel',
            action: 'still_pending',
            expected_amount: expectedAmount,
            reported_amount: status?.data?.amount ?? null,
            gateway_status: sStatus || null,
            gateway_response_code: responseCode != null ? String(responseCode) : null,
            notes: null,
        });
        return;
    }

    if (!hubtelAmountMatches(expectedAmount, status?.data)) {
        counters.amount_mismatch += 1;
        logs.push({
            run_id: runId,
            order_id: order.id,
            order_number: order.order_number,
            gateway: 'hubtel',
            action: 'amount_mismatch',
            expected_amount: expectedAmount,
            reported_amount: status?.data?.amount ?? status?.data?.amountAfterCharges ?? null,
            gateway_status: sStatus || null,
            gateway_response_code: responseCode != null ? String(responseCode) : null,
            notes: 'gateway confirmed paid but neither gross nor settlement matches ±1¢',
        });
        return;
    }

    await settleOrder({
        order,
        gateway: 'hubtel',
        externalRef: status?.data?.transactionId || 'reconciler-hubtel',
        reported: status?.data?.amount ?? null,
        gatewayStatus: sStatus || null,
        gatewayResponseCode: responseCode != null ? String(responseCode) : null,
        runId,
        counters,
        logs,
    });
}

async function reconcileMoolre(args: RecArgs) {
    const { order, runId, counters, logs } = args;
    const expectedAmount = Number(order.total) || 0;

    if (!process.env.MOOLRE_API_USER || !process.env.MOOLRE_API_PUBKEY) {
        counters.skipped += 1;
        logs.push({
            run_id: runId,
            order_id: order.id,
            order_number: order.order_number,
            gateway: 'moolre',
            action: 'skipped',
            expected_amount: expectedAmount,
            reported_amount: null,
            gateway_status: null,
            gateway_response_code: null,
            notes: 'MOOLRE_API_USER/MOOLRE_API_PUBKEY missing',
        });
        return;
    }

    const meta: any = order.metadata || {};
    const externalRef: string =
        (meta.moolre_externalref as string | undefined) || order.order_number;

    const response = await withTimeout(
        fetch('https://api.moolre.com/embed/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-USER': process.env.MOOLRE_API_USER!,
                'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY!,
            },
            body: JSON.stringify({ externalref: externalRef }),
        }),
        PER_REQUEST_TIMEOUT_MS,
        'moolre embed/status',
    );
    const result: any = await response.json();
    const sStatus = String(result?.data?.status || '').toLowerCase();
    const verified =
        result?.status === 1 &&
        ['success', 'successful', 'completed', 'paid'].includes(sStatus);

    if (!verified) {
        counters.still_pending += 1;
        logs.push({
            run_id: runId,
            order_id: order.id,
            order_number: order.order_number,
            gateway: 'moolre',
            action: 'still_pending',
            expected_amount: expectedAmount,
            reported_amount: result?.data?.amount != null ? Number(result.data.amount) : null,
            gateway_status: sStatus || null,
            gateway_response_code: result?.code != null ? String(result.code) : null,
            notes: null,
        });
        return;
    }

    const reported = result?.data?.amount != null ? parseFloat(String(result.data.amount)) : null;
    if (reported !== null && Math.abs(reported - expectedAmount) > 0.01) {
        counters.amount_mismatch += 1;
        logs.push({
            run_id: runId,
            order_id: order.id,
            order_number: order.order_number,
            gateway: 'moolre',
            action: 'amount_mismatch',
            expected_amount: expectedAmount,
            reported_amount: reported,
            gateway_status: sStatus || null,
            gateway_response_code: result?.code != null ? String(result.code) : null,
            notes: 'gateway confirmed paid but amount outside ±1¢',
        });
        return;
    }

    await settleOrder({
        order,
        gateway: 'moolre',
        externalRef: result?.data?.reference || 'reconciler-moolre',
        reported,
        gatewayStatus: sStatus || null,
        gatewayResponseCode: result?.code != null ? String(result.code) : null,
        runId,
        counters,
        logs,
    });
}

// --------------------------------------------------------------------------
// Shared settlement path — runs the same RPC the callbacks do, then logs.
// --------------------------------------------------------------------------

type SettleArgs = {
    order: any;
    gateway: string;
    externalRef: string;
    reported: number | null;
    gatewayStatus: string | null;
    gatewayResponseCode: string | null;
    runId: string;
    counters: RunCounters;
    logs: LogRow[];
};

async function settleOrder(args: SettleArgs) {
    const {
        order, gateway, externalRef, reported,
        gatewayStatus, gatewayResponseCode, runId, counters, logs,
    } = args;

    const { data: orderJson, error: rpcError } = await supabaseAdmin.rpc('mark_order_paid', {
        order_ref: order.order_number,
        moolre_ref: externalRef,
    });

    if (rpcError) {
        counters.status_failed += 1;
        logs.push({
            run_id: runId,
            order_id: order.id,
            order_number: order.order_number,
            gateway,
            action: 'status_failed',
            expected_amount: Number(order.total),
            reported_amount: reported,
            gateway_status: gatewayStatus,
            gateway_response_code: gatewayResponseCode,
            notes: `RPC mark_order_paid error: ${rpcError.message}`.slice(0, 500),
        });
        return;
    }

    // If a callback raced us and settled this order more than ~10s ago,
    // count it as already_settled rather than a fresh confirmation.
    const settled: any = orderJson || {};
    const verifiedAt = settled?.metadata?.payment_verified_at;
    const alreadyWasSettled =
        settled.payment_status === 'paid' &&
        verifiedAt &&
        Date.now() - new Date(verifiedAt).getTime() > 10_000;

    if (alreadyWasSettled) {
        counters.already_settled += 1;
        logs.push({
            run_id: runId,
            order_id: order.id,
            order_number: order.order_number,
            gateway,
            action: 'already_settled',
            expected_amount: Number(order.total),
            reported_amount: reported,
            gateway_status: gatewayStatus,
            gateway_response_code: gatewayResponseCode,
            notes: 'callback or earlier reconciler run already settled this order',
        });
        return;
    }

    counters.confirmed += 1;
    logs.push({
        run_id: runId,
        order_id: order.id,
        order_number: order.order_number,
        gateway,
        action: 'confirmed',
        expected_amount: Number(order.total),
        reported_amount: reported,
        gateway_status: gatewayStatus,
        gateway_response_code: gatewayResponseCode,
        notes: null,
    });

    // Customer stats + notifications are best-effort; failures here must
    // not stop the cron from continuing through other orders.
    if (orderJson?.email) {
        try {
            await supabaseAdmin.rpc('update_customer_stats', {
                p_customer_email: orderJson.email,
                p_order_total: orderJson.total,
            });
        } catch (e: any) {
            console.error('[Reconciler] update_customer_stats failed:', e?.message);
        }
    }
    try {
        if (orderJson) await sendOrderConfirmation(orderJson);
    } catch (e: any) {
        console.error('[Reconciler] sendOrderConfirmation failed:', e?.message);
    }
}
