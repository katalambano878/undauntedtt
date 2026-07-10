import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Validates a coupon code against the coupons table and returns the
 * discount for a given subtotal. Server-side only — the client never
 * computes its own discount.
 */
export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`coupon-validate:${clientId}`, RATE_LIMITS.payment);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, message: 'Too many attempts. Please try again later.' },
                { status: 429 },
            );
        }

        const body = await req.json();
        const code = String(body?.code || '').trim().toUpperCase();
        const subtotal = Number(body?.subtotal);

        if (!code || !/^[A-Z0-9_-]{3,32}$/.test(code)) {
            return NextResponse.json({ success: false, message: 'Invalid coupon code' }, { status: 400 });
        }
        if (!Number.isFinite(subtotal) || subtotal <= 0) {
            return NextResponse.json({ success: false, message: 'Invalid subtotal' }, { status: 400 });
        }

        const { data: coupon, error } = await supabaseAdmin
            .from('coupons')
            .select('id, code, description, type, value, minimum_purchase, maximum_discount, usage_limit, usage_count, start_date, end_date, is_active')
            .eq('code', code)
            .single();

        if (error || !coupon) {
            return NextResponse.json({ success: false, message: 'Coupon code not found' }, { status: 404 });
        }

        const now = new Date();
        if (!coupon.is_active) {
            return NextResponse.json({ success: false, message: 'This coupon is no longer active' }, { status: 400 });
        }
        if (coupon.start_date && new Date(coupon.start_date) > now) {
            return NextResponse.json({ success: false, message: 'This coupon is not yet valid' }, { status: 400 });
        }
        if (coupon.end_date && new Date(coupon.end_date) < now) {
            return NextResponse.json({ success: false, message: 'This coupon has expired' }, { status: 400 });
        }
        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
            return NextResponse.json({ success: false, message: 'This coupon has reached its usage limit' }, { status: 400 });
        }
        const minPurchase = Number(coupon.minimum_purchase) || 0;
        if (minPurchase > 0 && subtotal < minPurchase) {
            return NextResponse.json(
                { success: false, message: `Minimum purchase of GH₵${minPurchase.toFixed(2)} required for this coupon` },
                { status: 400 },
            );
        }

        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = subtotal * (Number(coupon.value) / 100);
            const cap = Number(coupon.maximum_discount);
            if (Number.isFinite(cap) && cap > 0) {
                discount = Math.min(discount, cap);
            }
        } else if (coupon.type === 'fixed_amount') {
            discount = Math.min(Number(coupon.value), subtotal);
        }
        // free_shipping: discount stays 0 — shipping handling is signalled via type.

        discount = Math.round(discount * 100) / 100;

        return NextResponse.json({
            success: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                description: coupon.description,
                type: coupon.type,
                value: Number(coupon.value),
            },
            discount,
        });
    } catch (error: any) {
        console.error('[Coupon Validate] Error:', error?.message || error);
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
