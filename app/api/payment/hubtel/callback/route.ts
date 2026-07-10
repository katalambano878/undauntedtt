import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import {
    checkHubtelStatus,
    hubtelAmountMatches,
    isHubtelFailure,
    isHubtelPaid,
    stripHubtelReferenceSuffix,
} from '@/lib/hubtel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    console.log('[Hubtel Callback] POST received at', new Date().toISOString());

    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`hubtel-callback:${clientId}`, RATE_LIMITS.callback);
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
        }

        let body: any = {};
        const contentType = req.headers.get('content-type') || '';
        try {
            if (contentType.includes('application/json')) {
                body = await req.json();
            } else if (contentType.includes('form')) {
                const formData = await req.formData();
                body = Object.fromEntries(formData.entries());
            } else {
                const raw = await req.text();
                try {
                    body = JSON.parse(raw);
                } catch {
                    body = Object.fromEntries(new URLSearchParams(raw).entries());
                }
            }
        } catch {
            return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
        }

        const responseCode = body.ResponseCode ?? body.responseCode ?? body.code;
        const topStatus = body.Status ?? body.status;
        const data = body.Data ?? body.data ?? {};

        const rawClientReference = (
            data.ClientReference ??
            data.clientReference ??
            body.ClientReference ??
            body.clientReference ??
            ''
        ).toString();
        const merchantOrderRef = stripHubtelReferenceSuffix(rawClientReference);

        const checkoutId = (data.CheckoutId ?? data.checkoutId ?? body.CheckoutId ?? '').toString();
        const callbackAmount =
            data.Amount !== undefined && data.Amount !== null
                ? parseFloat(String(data.Amount))
                : null;

        console.log(
            '[Hubtel Callback] ref:',
            merchantOrderRef,
            '| ResponseCode:',
            responseCode,
            '| Status:',
            topStatus,
            '| amount:',
            callbackAmount,
        );

        if (!merchantOrderRef) {
            console.error('[Hubtel Callback] Missing client reference');
            return NextResponse.json({ success: false, message: 'Missing client reference' }, { status: 400 });
        }

        const { data: existingOrder, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('id, order_number, payment_status, total, email, metadata')
            .eq('order_number', merchantOrderRef)
            .single();

        if (fetchError || !existingOrder) {
            console.error('[Hubtel Callback] Order not found:', merchantOrderRef);
            // 200 so Hubtel doesn't keep retrying a reference we'll never match.
            return NextResponse.json({ success: false, message: 'Order not found' });
        }

        const expectedAmount = Number(existingOrder.total) || 0;

        if (existingOrder.payment_status === 'paid') {
            return NextResponse.json({ success: true, message: 'Order already processed' });
        }

        // The callback body is only a wake-up signal — never trust it alone.
        // Always re-verify against Hubtel's RMSC status API.
        let serverConfirmed = false;
        let statusData: Awaited<ReturnType<typeof checkHubtelStatus>>['data'] = undefined;
        try {
            const status = await checkHubtelStatus(rawClientReference || merchantOrderRef);
            const sStatus = String(status?.data?.status || '').toLowerCase();
            serverConfirmed = isHubtelPaid(sStatus, status?.responseCode);
            statusData = status?.data;
            console.log(
                '[Hubtel Callback] RMSC status:',
                status?.data?.status,
                '| expected:',
                expectedAmount,
                '| gross:',
                status?.data?.amount,
                '| afterCharges:',
                status?.data?.amountAfterCharges,
            );
        } catch (e: any) {
            console.warn('[Hubtel Callback] Status re-verification failed:', e?.message || e);
        }

        if (!serverConfirmed) {
            const innerStatus = String(data.Status ?? topStatus ?? '');
            if (isHubtelFailure(innerStatus, responseCode != null ? String(responseCode) : null)) {
                console.log('[Hubtel Callback] Recording failure for', merchantOrderRef);
                await supabaseAdmin
                    .from('orders')
                    .update({
                        payment_status: 'failed',
                        metadata: {
                            ...(existingOrder.metadata || {}),
                            hubtel_checkout_id: checkoutId || null,
                            hubtel_response_code: String(responseCode || ''),
                            failure_reason: data.Description || body.Message || 'Payment failed',
                            failed_at: new Date().toISOString(),
                        },
                    })
                    .eq('order_number', merchantOrderRef);

                return NextResponse.json({ success: true, message: 'Failure recorded' });
            }

            console.log('[Hubtel Callback] Non-terminal status — no action taken.');
            return NextResponse.json({ success: true, message: 'Status pending or ignored' });
        }

        // Accept a match on either the gross customer charge or the net
        // merchant settlement — see hubtelAmountMatches for why.
        if (!hubtelAmountMatches(expectedAmount, statusData, callbackAmount)) {
            console.error(
                '[Hubtel Callback] AMOUNT MISMATCH! Expected:',
                expectedAmount,
                'Got gross:',
                statusData?.amount,
                '| afterCharges:',
                statusData?.amountAfterCharges,
            );
            return NextResponse.json(
                { success: false, message: 'Payment amount does not match expected charge' },
                { status: 400 },
            );
        }

        const { data: orderJson, error: updateError } = await supabaseAdmin.rpc('mark_order_paid', {
            order_ref: merchantOrderRef,
            moolre_ref: checkoutId || 'hubtel-callback',
        });

        if (updateError) {
            console.error('[Hubtel Callback] RPC error:', updateError.message);
            return NextResponse.json(
                { success: false, message: 'Database update failed' },
                { status: 500 },
            );
        }

        if (!orderJson) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        try {
            if (orderJson.email) {
                await supabaseAdmin.rpc('update_customer_stats', {
                    p_customer_email: orderJson.email,
                    p_order_total: orderJson.total,
                });
            }
        } catch (e: any) {
            console.error('[Hubtel Callback] Customer stats failed:', e?.message || e);
        }

        try {
            await sendOrderConfirmation(orderJson);
        } catch (e: any) {
            console.error('[Hubtel Callback] Notification failed:', e?.message || e);
        }

        return NextResponse.json({ success: true, message: 'Payment verified and order updated' });
    } catch (error: any) {
        console.error('[Hubtel Callback] Critical error:', error?.message || error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Hubtel callback endpoint ready',
        timestamp: new Date().toISOString(),
    });
}
