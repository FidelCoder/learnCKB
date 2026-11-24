import type { FiberBrowserNode, SendPaymentParams } from '@fiber-pay/sdk/browser';

type Invoice = Awaited<ReturnType<FiberBrowserNode['parseInvoice']>>['invoice'];

export class RansomRejectedError extends Error {
  constructor(reason: string) {
    super(`Payment was not submitted: ${reason}. Mint another packet to continue.`);
    this.name = 'RansomRejectedError';
  }
}

export function assertRansomLive(invoice: Invoice, now = Date.now()) {
  const expiry = invoice.data.attrs?.find((attr) => 'expiry_time' in attr);
  if (expiry && 'expiry_time' in expiry
    && BigInt(invoice.data.timestamp) + BigInt(expiry.expiry_time) * 1_000n <= BigInt(now)) {
    throw new Error('This ransom invoice has expired. Mint another packet to continue.');
  }
}

function rpcReason(error: unknown): string {
  if (!(error instanceof Error)) return '';
  let text = error.message.replace(/^WASM RPC error:\s*/, '');
  const rust = /^ErrorObject(?:Owned)? \{ code: [^,]+, message: ("(?:[^"\\]|\\.)*"), data: .*\}$/s.exec(text);
  if (rust) {
    try { text = JSON.parse(rust[1]) as string; } catch { return ''; }
  }
  text = text.replace(/^InvalidParameter:\s*/, '');
  const validation = /^Failed to validate payment request: ("(?:[^"\\]|\\.)*")$/.exec(text);
  if (validation) {
    try { return JSON.parse(validation[1]) as string; } catch { return ''; }
  }
  return text;
}

// v0.10.1 rejects these before a payment actor exists. Route/worker failures
// are ambiguous and must never be treated as non-submission.
const hardRejections = new Set([
  'invoice is expired',
  'invoice is invalid',
  'invoice is not signed',
  'invoice does not support hop hints',
  'payment secret is required for multi-path payment',
]);

/** True when the node has no in-memory actor for this hash (reload, restart, or never sent). */
export function isPaymentSessionMissing(error: unknown): boolean {
  const reason = rpcReason(error);
  return reason.startsWith('Payment session not found:');
}

export async function dispatchRansom(
  node: Pick<FiberBrowserNode, 'sendPayment' | 'getPayment' | 'waitForPayment'>,
  hash: `0x${string}`,
  params: SendPaymentParams,
) {
  let sent;
  try {
    sent = await node.sendPayment(params);
  } catch (error) {
    const reason = rpcReason(error);
    if (!hardRejections.has(reason)) throw error;
    try {
      return await node.getPayment({ payment_hash: hash });
    } catch (checkError) {
      if (isPaymentSessionMissing(checkError)
        && rpcReason(checkError).toLowerCase().includes(hash.slice(2).toLowerCase())) {
        throw new RansomRejectedError(reason);
      }
      throw error;
    }
  }
  return sent.status === 'Success' || sent.status === 'Failed' ? sent
    : node.waitForPayment(sent.payment_hash, { timeout: 60_000, interval: 1_000 });
}
