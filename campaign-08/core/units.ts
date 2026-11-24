export const SHANNONS = 100_000_000n;
export const CORRIDOR_CAPACITY = 500n * SHANNONS;
export const CHANNEL_RESERVE = 100n * SHANNONS;
export const USABLE_ROOM = CORRIDOR_CAPACITY - CHANNEL_RESERVE;
export const ONCHAIN_TIP = SHANNONS;
export const RANSOM = SHANNONS;
export const FEE_CEILING = SHANNONS;

export function readCkb(input: string): bigint {
  const value = input.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(value)) {
    throw new Error('Enter a CKB amount with no more than eight decimal places.');
  }
  const [whole, fraction = ''] = value.split('.');
  const amount = BigInt(whole) * SHANNONS + BigInt(fraction.padEnd(8, '0'));
  if (amount <= 0n) throw new Error('The amount must be greater than zero.');
  if (amount > 0xffffffffffffffffn) throw new Error('The amount is too large.');
  return amount;
}

export function showCkb(amount: bigint | null): string {
  if (amount === null) return 'pending';
  const whole = amount / SHANNONS;
  const fraction = (amount % SHANNONS).toString().padStart(8, '0').replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''} CKB`;
}

export function asHex(amount: bigint): `0x${string}` {
  return `0x${amount.toString(16)}`;
}

export function corridorOpen(state: string): boolean {
  return state.replaceAll('_', '').toLowerCase() === 'channelready';
}

export function corridorClosed(state: string): boolean {
  return ['closed', 'shuttingdown'].includes(state.replaceAll('_', '').toLowerCase());
}

export function keysMatch(a: string, b: string): boolean {
  return a.replace(/^0x/, '').toLowerCase() === b.replace(/^0x/, '').toLowerCase();
}

export function fundingTxHash(outpoint: unknown): string | null {
  if (typeof outpoint === 'string' && /^0x[0-9a-f]{72}$/i.test(outpoint)) return outpoint.slice(0, 66);
  if (outpoint && typeof outpoint === 'object' && 'tx_hash' in outpoint
    && typeof outpoint.tx_hash === 'string' && /^0x[0-9a-f]{64}$/i.test(outpoint.tx_hash)) {
    return outpoint.tx_hash;
  }
  return null;
}
