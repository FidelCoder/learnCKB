import type { FiberBrowserNode, SendPaymentParams } from '@fiber-pay/sdk/browser';
import { FEE_CEILING, RANSOM } from './units.ts';
import type { Packet } from './packet.ts';
import {
  assertRansomLive, dispatchRansom, isPaymentSessionMissing, RansomRejectedError,
} from './settlement-guards.ts';

export async function inspectPacket(node: FiberBrowserNode, packet: Packet) {
  const { invoice } = await node.parseInvoice({ invoice: packet.ransom });
  if (invoice.currency !== 'Fibt' || BigInt(invoice.amount ?? '0x0') !== RANSOM
    || invoice.data.payment_hash.toLowerCase() !== packet.hash.toLowerCase()) {
    throw new Error('The ransom invoice does not match this 1 CKB packet.');
  }
  return invoice;
}

export async function payRansom(
  node: FiberBrowserNode,
  packet: Packet,
  priorHash: string,
  remember: (hash: string) => void,
  forceRetry = false,
) {
  const invoice = await inspectPacket(node, packet);
  if (priorHash) {
    if (priorHash.toLowerCase() !== packet.hash.toLowerCase()) {
      throw new Error('Restore the packet from the previous payment.');
    }
    try {
      const seen = await node.getPayment({ payment_hash: packet.hash });
      if (!forceRetry || seen.status !== 'Failed') return seen;
    } catch (error) {
      // Reload/restart dropped the actor: nothing is in flight, so start fresh.
      if (!isPaymentSessionMissing(error)) throw error;
    }
  }
  assertRansomLive(invoice);
  remember(packet.hash);
  try {
    return await dispatchRansom(node, packet.hash, {
      invoice: packet.ransom,
      hop_hints: [packet.relay] as unknown as NonNullable<SendPaymentParams['hop_hints']>,
      max_fee_amount: `0x${FEE_CEILING.toString(16)}`,
      max_parts: '0x1',
    });
  } catch (error) {
    if (error instanceof RansomRejectedError) remember('');
    throw error;
  }
}
