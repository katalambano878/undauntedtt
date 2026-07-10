/**
 * Hubtel Online Checkout client.
 *
 *  - POST https://payproxyapi.hubtel.com/items/initiate
 *  - GET  https://rmsc.hubtel.com/v1/merchantaccount/merchants/{merchant}/transactions/status?clientReference=...
 */

const INITIATE_URL = 'https://payproxyapi.hubtel.com/items/initiate';
const STATUS_BASE_URL = 'https://rmsc.hubtel.com/v1/merchantaccount/merchants';

function requiredEnv(name: string): string {
    const v = process.env[name];
    if (!v || !v.trim()) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return v.trim();
}

function buildAuthHeader(): string {
    const id = requiredEnv('HUBTEL_API_ID');
    const key = requiredEnv('HUBTEL_API_KEY');
    const encoded = Buffer.from(`${id}:${key}`).toString('base64');
    return `Basic ${encoded}`;
}

export interface HubtelInitiatePayload {
    totalAmount: number;
    description: string;
    callbackUrl: string;
    returnUrl: string;
    cancellationUrl: string;
    merchantAccountNumber: string;
    clientReference: string;
    payeeName?: string;
    payeeMobileNumber?: string;
    payeeEmail?: string;
}

export interface HubtelInitiateResult {
    responseCode?: string;
    status?: string;
    message?: string;
    data?: {
        checkoutUrl?: string;
        checkoutId?: string;
        clientReference?: string;
        message?: string;
        checkoutDirectUrl?: string;
    };
}

export async function initiateHubtelCheckout(
    payload: HubtelInitiatePayload,
): Promise<HubtelInitiateResult> {
    if (payload.clientReference.length > 32) {
        throw new Error(
            `Hubtel clientReference must be <=32 chars (got ${payload.clientReference.length}: "${payload.clientReference}")`,
        );
    }
    const res = await fetch(INITIATE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: buildAuthHeader(),
        },
        body: JSON.stringify(payload),
    });
    return parseJsonOrThrow(res, 'initiate');
}

export interface HubtelStatusResult {
    message?: string;
    responseCode?: string;
    data?: {
        date?: string;
        status?: string;
        transactionId?: string;
        externalTransactionId?: string;
        paymentMethod?: string;
        clientReference?: string;
        currencyCode?: string | null;
        amount?: number;
        charges?: number;
        amountAfterCharges?: number;
        isFulfilled?: boolean | null;
    };
}

export async function checkHubtelStatus(
    clientReference: string,
): Promise<HubtelStatusResult> {
    const merchant = requiredEnv('HUBTEL_MERCHANT_ACCOUNT_NUMBER');
    const url = `${STATUS_BASE_URL}/${encodeURIComponent(merchant)}/transactions/status?clientReference=${encodeURIComponent(clientReference)}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: buildAuthHeader(),
        },
    });
    const raw = await parseJsonOrThrow<any>(res, 'status');
    return normalizeStatusResponse(raw);
}

function normalizeStatusResponse(raw: any): HubtelStatusResult {
    const root = raw || {};
    let dataRaw: any = root.data ?? root.Data ?? {};
    if (Array.isArray(dataRaw)) {
        dataRaw = dataRaw[0] || {};
    }
    const toNumber = (v: unknown): number | undefined => {
        if (v === undefined || v === null || v === '') return undefined;
        const n = parseFloat(String(v));
        return Number.isFinite(n) ? n : undefined;
    };
    return {
        message: root.message ?? root.Message,
        responseCode: root.responseCode ?? root.ResponseCode,
        data: {
            date: dataRaw.date ?? dataRaw.Date ?? dataRaw.StartDate,
            status:
                dataRaw.status ??
                dataRaw.Status ??
                dataRaw.TransactionStatus ??
                dataRaw.InvoiceStatus,
            transactionId:
                dataRaw.transactionId ?? dataRaw.TransactionId ?? dataRaw.CheckoutId,
            externalTransactionId:
                dataRaw.externalTransactionId ??
                dataRaw.ExternalTransactionId ??
                dataRaw.NetworkTransactionId,
            paymentMethod: dataRaw.paymentMethod ?? dataRaw.PaymentMethod,
            clientReference: dataRaw.clientReference ?? dataRaw.ClientReference,
            currencyCode:
                dataRaw.currencyCode ?? dataRaw.CurrencyCode ?? null,
            amount: toNumber(
                dataRaw.amount ?? dataRaw.Amount ?? dataRaw.TransactionAmount,
            ),
            charges: toNumber(dataRaw.charges ?? dataRaw.Charges ?? dataRaw.Fee),
            amountAfterCharges: toNumber(
                dataRaw.amountAfterCharges ??
                    dataRaw.AmountAfterCharges ??
                    dataRaw.AmountAfterFees,
            ),
            isFulfilled: dataRaw.isFulfilled ?? dataRaw.IsFulfilled ?? null,
        },
    };
}

async function parseJsonOrThrow<T = unknown>(res: Response, label: string): Promise<T> {
    const text = await res.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(`Hubtel ${label}: non-JSON response (${res.status}) — ${text.slice(0, 200)}`);
    }
}

export function isHubtelPaid(
    status: string | null | undefined,
    _responseCode?: string | null,
): boolean {
    const s = (status || '').trim().toLowerCase();
    return s === 'paid' || s === 'success' || s === 'successful' || s === 'completed';
}

/**
 * True when the Hubtel-reported amounts are consistent with what we charged.
 *
 * Hubtel's status API reports both the gross transaction amount (what the
 * customer paid) and `amountAfterCharges` (the merchant settlement, net of
 * Hubtel's fee). Depending on the merchant account's fee configuration,
 * either one may equal the order total — when the merchant absorbs fees the
 * gross matches; when fees are passed to the customer the net matches. So a
 * payment is valid when EITHER figure matches the expected charge (±1¢).
 * Comparing only against amountAfterCharges silently rejects every real
 * payment on merchant-absorbs-fees accounts.
 */
export function hubtelAmountMatches(
    expected: number,
    data: HubtelStatusResult['data'] | null | undefined,
    fallbackAmount?: number | null,
): boolean {
    const candidates = [data?.amount, data?.amountAfterCharges, fallbackAmount];
    let sawAny = false;
    for (const c of candidates) {
        if (c === undefined || c === null) continue;
        const n = Number(c);
        if (!Number.isFinite(n)) continue;
        sawAny = true;
        if (Math.abs(n - expected) <= 0.01) return true;
    }
    // If the gateway reported no amounts at all we can't validate — treat as
    // matching, since the status endpoint already confirmed the payment.
    return !sawAny;
}

export function isHubtelFailure(
    status: string | null | undefined,
    responseCode?: string | null,
): boolean {
    const s = (status || '').trim().toLowerCase();
    if (s === 'failed' || s === 'failure' || s === 'declined' || s === 'cancelled' || s === 'canceled') {
        return true;
    }
    const code = String(responseCode ?? '').trim();
    return code === '2001' || code === '4000' || code === '4070';
}

export function makeHubtelClientReference(orderRef: string): string {
    const MAX = 32;
    const suffix = `-r${Date.now().toString(36)}`;
    if (orderRef.length + suffix.length <= MAX) {
        return `${orderRef}${suffix}`;
    }
    return orderRef.slice(0, MAX);
}

export function stripHubtelReferenceSuffix(ref: string): string {
    return ref.replace(/-[rbd][a-z0-9]+$/i, '');
}

export function normalizeGhPhone(input: string | null | undefined): string {
    const digits = String(input || '').replace(/\D+/g, '');
    if (!digits) return '';
    if (digits.startsWith('233')) return digits;
    if (digits.startsWith('0')) return `233${digits.slice(1)}`;
    if (digits.length === 9) return `233${digits}`;
    return digits;
}
