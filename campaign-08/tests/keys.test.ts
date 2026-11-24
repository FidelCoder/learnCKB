import assert from 'node:assert/strict';
import test from 'node:test';
import { digestHex, fromHex, seal, toHex, unseal } from '../core/keys.ts';

test('a 32-byte key and 12-byte nonce round-trip the manuscript', async () => {
  const { key, box } = await seal('Cipherpost desk note\n\nThe ransom cleared.');
  assert.equal(fromHex(key).length, 32);
  assert.equal(fromHex(box.nonce).length, 12);
  assert.equal(await unseal(box, key), 'Cipherpost desk note\n\nThe ransom cleared.');
});

test('every seal uses fresh key material and a fresh nonce', async () => {
  const first = await seal('same text');
  const second = await seal('same text');
  assert.notEqual(first.key, second.key);
  assert.notEqual(first.box.nonce, second.box.nonce);
  assert.notEqual(first.box.blob, second.box.blob);
});

test('a wrong key is refused by AES-GCM authentication', async () => {
  const { box } = await seal('locked');
  await assert.rejects(
    unseal(box, `0x${'11'.repeat(32)}`),
    (error: unknown) => error instanceof DOMException && error.name === 'OperationError',
  );
});

test('tampered ciphertext is refused', async () => {
  const { key, box } = await seal('locked');
  const bytes = fromHex(box.blob);
  bytes[0] ^= 0xff;
  await assert.rejects(unseal({ ...box, blob: toHex(bytes) }, key));
});

test('a short key is refused before decryption', async () => {
  const { box } = await seal('locked');
  await assert.rejects(unseal(box, '0x1234'), /32 bytes/);
});

test('digestHex matches the published SHA-256 vector for "abc"', async () => {
  assert.equal(
    await digestHex('0x616263'),
    '0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('the ransom commitment: sha256(preimage) is stable and 32 bytes', async () => {
  const preimage = `0x${'ab'.repeat(32)}`;
  const first = await digestHex(preimage);
  assert.equal(first, await digestHex(preimage));
  assert.equal(fromHex(first).length, 32);
  assert.notEqual(first, preimage);
});
