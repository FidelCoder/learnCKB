import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectPacket, payRansom } from '../core/settlement.ts';
import { isPaymentSessionMissing } from '../core/settlement-guards.ts';
import { toHopHint } from '../core/packet.ts';

const hash = `0x${'a'.repeat(64)}` as const;
const packet: any = {
  ransom: 'fibt-example',
  hash,
  relay: {
    pubkey: '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71',
    lane: `0x${'b'.repeat(72)}`,
    feeRate: '0x1',
    expiryDelta: '0x18',
  },
};

function sessionMissingError(target = hash) {
  return new Error(
    `WASM RPC error: ErrorObject { code: ServerError(-32000), message: `
    + `${JSON.stringify(`InvalidParameter: Payment session not found: Hash256(${target})`)}, data: None }`,
  );
}

function fixture(status = 'Success'): { node: any; calls: string[]; params: any[] } {
  const calls: string[] = [];
  const params: any[] = [];
  const result = { status, payment_hash: hash, fee: '0x0' };
  const node: any = {
    parseInvoice: async () => ({ invoice: { currency: 'Fibt', amount: '0x5f5e100', data: { payment_hash: hash } } }),
    sendPayment: async (p: any) => { calls.push('send'); params.push(p); return result; },
    getPayment: async () => { calls.push('check'); return result; },
    waitForPayment: async () => result,
  };
  return { node, calls, params };
}

test('mismatched currency, amount or hash blocks submission', async () => {
  for (const change of [{ currency: 'Fibb' }, { amount: '0x1' }, { data: { payment_hash: '0xother' } }]) {
    const { node, calls } = fixture();
    const original = node.parseInvoice;
    node.parseInvoice = async () => ({ invoice: { ...(await original()).invoice, ...change } });
    await assert.rejects(inspectPacket(node, packet), /does not match/);
    assert.deepEqual(calls, []);
  }
});

test('the attempt is remembered before dispatch and a storage failure prevents spending', async () => {
  const { node, calls } = fixture();
  await payRansom(node, packet, '', () => calls.push('record'));
  assert.deepEqual(calls, ['record', 'send']);
  const second = fixture();
  await assert.rejects(
    payRansom(second.node, packet, '', () => { throw new Error('Storage failed'); }),
    /Storage failed/,
  );
  assert.deepEqual(second.calls, []);
});

test('hop hints use Fiber field names the payment RPC requires', () => {
  const hint = toHopHint(packet.relay);
  assert.deepEqual(hint, {
    pubkey: packet.relay.pubkey,
    channel_outpoint: packet.relay.lane,
    fee_rate: packet.relay.feeRate,
    tlc_expiry_delta: packet.relay.expiryDelta,
  });
  assert.equal('lane' in hint, false);
  assert.equal('feeRate' in hint, false);
  assert.equal('expiryDelta' in hint, false);
});

test('sendPayment receives hop_hints with channel_outpoint, not lane', async () => {
  const { node, params } = fixture();
  await payRansom(node, packet, '', () => {});
  const hop = params[0]?.hop_hints?.[0];
  assert.ok(hop, 'hop_hints[0] must be present');
  assert.equal(hop.channel_outpoint, packet.relay.lane);
  assert.equal(hop.fee_rate, packet.relay.feeRate);
  assert.equal(hop.tlc_expiry_delta, packet.relay.expiryDelta);
  assert.equal(hop.lane, undefined);
  assert.equal(hop.feeRate, undefined);
});

test('restored successful and pending payments are re-read without resending', async () => {
  for (const status of ['Success', 'Inflight']) {
    const { node, calls } = fixture(status);
    await payRansom(node, packet, hash, () => calls.push('record'), true);
    assert.deepEqual(calls, ['check']);
  }
});

test('retry requires explicit intent and a verified failure', async () => {
  const first = fixture('Failed');
  await payRansom(first.node, packet, hash, () => first.calls.push('record'));
  assert.deepEqual(first.calls, ['check']);
  const retry = fixture('Failed');
  await payRansom(retry.node, packet, hash, () => retry.calls.push('record'), true);
  assert.deepEqual(retry.calls, ['check', 'record', 'send']);
  await assert.rejects(payRansom(retry.node, packet, '0xwrong', () => {}), /previous payment/);
});

test('an expired invoice is rejected before recording or dispatching', async () => {
  const { node, calls } = fixture();
  const original = node.parseInvoice;
  node.parseInvoice = async () => ({
    invoice: {
      ...(await original()).invoice,
      data: { payment_hash: hash, timestamp: '0x0', attrs: [{ expiry_time: '0x1' }] },
    },
  });
  await assert.rejects(payRansom(node, packet, '', () => calls.push('record')), /expired/);
  assert.deepEqual(calls, []);
});

test('a hard rejection clears the attempt so reload does not restore it', async () => {
  const { node } = fixture();
  let saved = JSON.stringify({ ransomHash: '' });
  const remember = (ransomHash: string) => { saved = JSON.stringify({ ransomHash }); };
  node.sendPayment = async () => {
    throw new Error(`WASM RPC error: ErrorObject { code: ServerError(-32000), message: ${JSON.stringify('InvalidParameter: Failed to validate payment request: "invoice is expired"')}, data: None }`);
  };
  node.getPayment = async () => {
    throw new Error(`WASM RPC error: ErrorObject { code: ServerError(-32000), message: ${JSON.stringify(`InvalidParameter: Payment session not found: ${hash}`)}, data: None }`);
  };
  await assert.rejects(payRansom(node, packet, '', remember), /Payment was not submitted/);
  assert.equal(JSON.parse(saved).ransomHash, '');
});

test('a vanished payment session is recognized and re-dispatched', async () => {
  assert.equal(isPaymentSessionMissing(sessionMissingError()), true);
  assert.equal(isPaymentSessionMissing(new Error('boom')), false);

  const { node, calls } = fixture();
  let sent = false;
  node.getPayment = async () => { throw sessionMissingError(); };
  node.sendPayment = async () => {
    sent = true;
    calls.push('send');
    return { status: 'Success', payment_hash: hash, fee: '0x0' };
  };
  const result = await payRansom(node, packet, hash, () => calls.push('record'), false);
  assert.equal(sent, true);
  assert.equal(result.status, 'Success');
  assert.deepEqual(calls, ['record', 'send']);
});

test('an uncertain send or polling timeout keeps the attempt and never resends it', async () => {
  for (const phase of ['send', 'wait']) {
    const { node, calls } = fixture('Inflight');
    let saved = '';
    const remember = (value: string) => { saved = value; };
    if (phase === 'send') node.sendPayment = async () => { calls.push('send'); throw new Error('Worker disconnected'); };
    else node.waitForPayment = async () => { throw new Error('Payment timed out'); };
    await assert.rejects(payRansom(node, packet, '', remember));
    assert.equal(saved, hash);
    await payRansom(node, packet, saved, remember, true);
    assert.deepEqual(calls, ['send', 'check']);
  }
});
