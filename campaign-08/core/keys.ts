export type SealedBytes = { blob: `0x${string}`; nonce: `0x${string}` };

export const toHex = (bytes: Uint8Array) =>
  `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;

export const fromHex = (value: string) =>
  Uint8Array.from(value.replace(/^0x/, '').match(/.{2}/g) ?? [], (part) => Number.parseInt(part, 16));

export async function seal(plaintext: string): Promise<{ key: `0x${string}`; box: SealedBytes }> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt']);
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(plaintext));
  return {
    key: toHex(raw),
    box: { blob: toHex(new Uint8Array(sealed)), nonce: toHex(nonce) } satisfies SealedBytes,
  };
}

export async function unseal(box: SealedBytes, keyHex: string): Promise<string> {
  if (fromHex(keyHex).length !== 32) throw new Error('The unseal key must be 32 bytes.');
  const key = await crypto.subtle.importKey('raw', fromHex(keyHex), { name: 'AES-GCM' }, false, ['decrypt']);
  const opened = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromHex(box.nonce) },
    key,
    fromHex(box.blob),
  );
  return new TextDecoder().decode(opened);
}

/** payment_hash = sha256(payment_preimage); checkable with sha256sum. */
export async function digestHex(value: string): Promise<`0x${string}`> {
  const digest = await crypto.subtle.digest('SHA-256', fromHex(value));
  return toHex(new Uint8Array(digest));
}
