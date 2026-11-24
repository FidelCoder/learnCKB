import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CORRIDOR_CAPACITY, FEE_CEILING, RANSOM, USABLE_ROOM,
  asHex, corridorClosed, corridorOpen, fundingTxHash, keysMatch, readCkb, showCkb,
} from '../core/units.ts';

test('CKB values keep exact shannon precision', () => {
  assert.equal(readCkb('0.00000001'), 1n);
  assert.equal(readCkb('500'), 50_000_000_000n);
  assert.equal(asHex(readCkb('1')), '0x5f5e100');
  assert.equal(readCkb('9500.99999536'), 950_099_999_536n);
  assert.equal(showCkb(950_099_999_536n), '9500.99999536 CKB');
  assert.equal(showCkb(CORRIDOR_CAPACITY), '500 CKB');
});

test('invalid, rounded and overflowing amounts are rejected', () => {
  for (const value of ['', '0', '-1', '1e3', '1.000000001', 'NaN', 'Infinity', '184467440737.09551616']) {
    assert.throws(() => readCkb(value), value);
  }
});

test('corridor economics match the challenge', () => {
  assert.equal(CORRIDOR_CAPACITY, 50_000_000_000n);
  assert.equal(USABLE_ROOM, 40_000_000_000n);
  assert.equal(RANSOM, 100_000_000n);
  assert.equal(FEE_CEILING, 100_000_000n);
});

test('only the terminal open state permits a ransom', () => {
  assert.equal(corridorOpen('CHANNEL_READY'), true);
  assert.equal(corridorOpen('ChannelReady'), true);
  for (const value of ['AWAITING_CHANNEL_READY', 'NEGOTIATING_FUNDING', 'CLOSED', '']) {
    assert.equal(corridorOpen(value), false, value);
  }
  assert.equal(corridorClosed('SHUTTING_DOWN'), true);
});

test('peer matching tolerates the SDK public key prefix', () => {
  assert.equal(keysMatch('0x02ab', '02AB'), true);
  assert.equal(keysMatch('02ab', '03ab'), false);
});

test('funding links use the transaction hash, not the full outpoint', () => {
  const hash = `0x${'ab'.repeat(32)}`;
  assert.equal(fundingTxHash(`${hash}00000000`), hash);
  assert.equal(fundingTxHash({ tx_hash: hash, index: '0x0' }), hash);
  assert.equal(fundingTxHash('not-an-outpoint'), null);
  assert.equal(fundingTxHash(null), null);
});
