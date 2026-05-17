'use client';

import { useCallback, useState } from 'react';
import { executeRecaptcha } from '@/lib/recaptcha';

/**
 * React hook for reCAPTCHA v3 integration.
 * Returns a function to get a verified token, plus loading/error state.
 * 
 * Usage:
 *   const { getToken, verifying } = useRecaptcha();
 *   
 *   async function handleSubmit() {
 *     const r = await getToken('signup');
 *     if (!r.ok) return; // r.error has details
 *     // Proceed with form submission...
 *   }
 */
export type RecaptchaCheckResult =
    | { ok: true }
    | { ok: false; error: string };

export function useRecaptcha() {
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getToken = useCallback(async (action: string): Promise<RecaptchaCheckResult> => {
        setError(null);

        // If reCAPTCHA is not configured, allow through (dev mode)
        if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
            return { ok: true };
        }

        setVerifying(true);
        try {
            const token = await executeRecaptcha(action);
            if (!token) {
                const msg = 'Could not get reCAPTCHA token. Please try again.';
                setError(msg);
                return { ok: false, error: msg };
            }

            const response = await fetch('/api/recaptcha/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action }),
            });

            const result = await response.json();
            if (!result.success) {
                const msg =
                    result.error ||
                    'Verification failed. Please try again.';
                setError(msg);
                return { ok: false, error: msg };
            }

            return { ok: true };
        } catch (err: any) {
            console.error('[reCAPTCHA] Hook error:', err);
            const msg = 'Verification error. Please try again.';
            setError(msg);
            return { ok: false, error: msg };
        } finally {
            setVerifying(false);
        }
    }, []);

    return { getToken, verifying, error, clearError: () => setError(null) };
}
