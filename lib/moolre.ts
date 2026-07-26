/**
 * Moolre payment helpers.
 *
 * Status lookups must use /open/transact/status — /embed/status returns 404.
 */

export interface MoolreStatusResult {
  verified: boolean;
  amount: number | null;
  transactionId: string | null;
  rawStatus: string | null;
  responseCode: string | null;
  raw?: unknown;
}

export async function checkMoolreStatus(
  externalRef: string,
): Promise<MoolreStatusResult> {
  const user = process.env.MOOLRE_API_USER;
  const pubkey = process.env.MOOLRE_API_PUBKEY;
  const account = process.env.MOOLRE_ACCOUNT_NUMBER;

  if (!user || !pubkey || !account) {
    throw new Error('MOOLRE_API_USER / MOOLRE_API_PUBKEY / MOOLRE_ACCOUNT_NUMBER missing');
  }

  const response = await fetch('https://api.moolre.com/open/transact/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-USER': user,
      'X-API-PUBKEY': pubkey,
    },
    // type=1, idtype=1 => look up by our unique externalref
    body: JSON.stringify({
      type: 1,
      idtype: '1',
      id: externalRef,
      accountnumber: account,
    }),
  });

  const text = await response.text();
  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Moolre status non-JSON (${response.status}): ${text.slice(0, 160)}`);
  }

  const d = result?.data || {};
  const verified =
    (result.status === 1 || result.status === '1') &&
    (d.txstatus === 1 || d.txstatus === '1');

  const amount =
    d.amount !== undefined && d.amount !== null && d.amount !== ''
      ? parseFloat(String(d.amount))
      : null;

  return {
    verified,
    amount: Number.isFinite(amount as number) ? (amount as number) : null,
    transactionId: d.transactionid != null ? String(d.transactionid) : null,
    rawStatus: d.txstatus != null ? String(d.txstatus) : null,
    responseCode: result?.code != null ? String(result.code) : null,
    raw: result,
  };
}
