import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendContactMessage } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { detectContactSpam } from '@/lib/spam';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tight limit — bots hammer this endpoint. */
const CONTACT_RATE = { maxRequests: 3, windowSeconds: 600 }; // 3 per 10 minutes

export async function POST(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rl = checkRateLimit(`contact:${clientId}`, CONTACT_RATE);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const payload = {
      name: String(body.name || ''),
      email: String(body.email || ''),
      phone: String(body.phone || ''),
      subject: String(body.subject || ''),
      message: String(body.message || ''),
      website: String(body.website || ''),
      company: String(body.company || ''),
    };

    const spamReason = detectContactSpam(payload);
    if (spamReason) {
      console.warn('[Contact] Rejected spam:', spamReason, payload.email);
      // Soft-success so bots don't retry with variations
      return NextResponse.json({ success: true, message: 'Message received' });
    }

    // Optional reCAPTCHA — when a token is present, verify it. Heuristics
    // above already catch the gibberish bots that currently hit production
    // (reCAPTCHA keys are not configured on the VPS yet).
    const token = typeof body.recaptchaToken === 'string' ? body.recaptchaToken : '';
    if (token && process.env.RECAPTCHA_SECRET_KEY) {
      const captcha = await verifyRecaptcha(token, 'contact');
      if (!captcha.success) {
        return NextResponse.json(
          { error: 'Verification failed. Please try again.' },
          { status: 400 },
        );
      }
    }

    const row = {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim() || null,
      subject: payload.subject.trim(),
      message: payload.message.trim(),
    };

    try {
      await supabaseAdmin.from('contact_submissions').insert(row);
    } catch (e: any) {
      console.warn('[Contact] DB insert failed:', e?.message || e);
    }

    try {
      await sendContactMessage(row);
    } catch (e: any) {
      console.error('[Contact] Notification failed:', e?.message || e);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Message sent' });
  } catch (e: any) {
    console.error('[Contact] Error:', e?.message || e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
