import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { checkHubtelStatus, hubtelAmountMatches, isHubtelPaid } from '@/lib/hubtel';

export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`hubtel-verify:${clientId}`, RATE_LIMITS.payment);
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
        }

        const { orderNumber, externalRef } = await req.json();

        if (!orderNumber || typeof orderNumber !== 'string') {
            return NextResponse.json(
                { success: false, message: 'Missing or invalid orderNumber' },
                { status: 400 },
            );
        }

        if (!/^ORD-\d+-\d+$/.test(orderNumber)) {
            return NextResponse.json({ success: false, message: 'Invalid order number format' }, { status: 400 });
        }

        const normalizedExternalRef =
            typeof externalRef === 'string' && /^[A-Za-z0-9-]{4,32}$/.test(externalRef)
                ? externalRef
                : null;

        if (normalizedExternalRef && !normalizedExternalRef.startsWith(orderNumber)) {
            return NextResponse.json(
                { success: false, message: 'Invalid external reference for order' },
                { status: 400 },
            );
        }

        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('id, order_number, payment_status, status, total, email, phone, shipping_address, metadata')
            .eq('order_number', orderNumber)
            .single();

        if (fetchError || !order) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        if (order.payment_status === 'paid') {
            return NextResponse.json({
                success: true,
                status: order.status,
                payment_status: order.payment_status,
                message: 'Order already paid',
            });
        }

        if (order.metadata?.payment_method && order.metadata.payment_method !== 'hubtel') {
            return NextResponse.json({
                success: false,
                message: 'This order does not use Hubtel payment',
            }, { status: 400 });
        }

        if (
            !process.env.HUBTEL_API_ID ||
            !process.env.HUBTEL_API_KEY ||
            !process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER
        ) {
            return NextResponse.json(
                {
                    success: false,
                    status: order.status,
                    payment_status: order.payment_status,
                    message: 'Payment verification unavailable',
                },
                { status: 503 },
            );
        }

        const expectedAmount = Number(order.total) || 0;
        const statusRef =
            normalizedExternalRef ||
            (order.metadata as any)?.hubtel_client_reference ||
            orderNumber;

        let verified = false;
        let statusData: Awaited<ReturnType<typeof checkHubtelStatus>>['data'] = undefined;
        try {
            const status = await checkHubtelStatus(statusRef);
            const sStatus = String(status?.data?.status || '').toLowerCase();
            verified = isHubtelPaid(sStatus, status?.responseCode);
            statusData = status?.data;
            console.log(
                '[Hubtel Verify] ref:',
                statusRef,
                '| status:',
                status?.data?.status,
                '| expected:',
                expectedAmount,
                '| gross:',
                status?.data?.amount,
                '| afterCharges:',
                status?.data?.amountAfterCharges,
            );
        } catch (e: any) {
            console.warn('[Hubtel Verify] Status API failed:', e?.message || e);
        }

        // Accept a match on either the gross customer charge or the net
        // merchant settlement — see hubtelAmountMatches for why.
        if (verified && !hubtelAmountMatches(expectedAmount, statusData)) {
            console.error(
                '[Hubtel Verify] AMOUNT MISMATCH. Expected:',
                expectedAmount,
                'Got gross:',
                statusData?.amount,
                '| afterCharges:',
                statusData?.amountAfterCharges,
            );
            verified = false;
        }

        if (!verified) {
            return NextResponse.json({
                success: false,
                status: order.status,
                payment_status: order.payment_status,
                message: 'Payment not yet confirmed by payment provider',
            });
        }

        const { data: orderJson, error: updateError } = await supabaseAdmin.rpc('mark_order_paid', {
            order_ref: orderNumber,
            moolre_ref: 'hubtel-api-verify',
        });

        if (updateError) {
            return NextResponse.json({ success: false, message: 'Failed to update order' }, { status: 500 });
        }

        if (orderJson?.email) {
            try {
                await supabaseAdmin.rpc('update_customer_stats', {
                    p_customer_email: orderJson.email,
                    p_order_total: orderJson.total,
                });
            } catch (e: any) {
                console.error('[Hubtel Verify] Stats failed:', e?.message || e);
            }
        }

        if (orderJson) {
            try {
                await sendOrderConfirmation(orderJson);
            } catch (e: any) {
                console.error('[Hubtel Verify] Notification failed:', e?.message || e);
            }
        }

        return NextResponse.json({
            success: true,
            status: 'processing',
            payment_status: 'paid',
            message: 'Payment verified and order updated',
        });
    } catch (error: any) {
        console.error('[Hubtel Verify] Error:', error?.message || error);
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
