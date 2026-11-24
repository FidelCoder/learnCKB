import type { Channel, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { seal, type SealedBytes } from './keys.ts';
import { HUB_KEY } from './bottle.ts';
import { RANSOM, asHex } from './units.ts';

export type Packet = SealedBytes & {
  format: 'cipherpost/v1';
  cipher: 'AES-256-GCM';
  ransom: string;
  hash: `0x${string}`;
  relay: {
    pubkey: `0x${string}`;
    lane: `0x${string}`;
    feeRate: `0x${string}`;
    expiryDelta: `0x${string}`;
  };
};

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function bytes(value: unknown, label: string, size?: number): `0x${string}` {
  if (typeof value !== 'string') throw new Error(`${label} is missing.`);
  const body = value.trim().replace(/^0x/i, '');
  if (!body || body.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(body)) {
    throw new Error(`${label} must be hexadecimal bytes.`);
  }
  if (size !== undefined && body.length !== size * 2) throw new Error(`${label} must be ${size} bytes.`);
  return `0x${body.toLowerCase()}` as `0x${string}`;
}

function qty(value: unknown, label: string): `0x${string}` {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return `0x${value.toString(16)}` as `0x${string}`;
  }
  if (typeof value !== 'string') throw new Error(`${label} is missing.`);
  const text = value.trim();
  if (/^0x[0-9a-f]+$/i.test(text)) return `0x${BigInt(text).toString(16)}` as `0x${string}`;
  if (/^\d+$/.test(text)) return `0x${BigInt(text).toString(16)}` as `0x${string}`;
  throw new Error(`${label} must be a non-negative integer.`);
}

function packLane(txHash: `0x${string}`, index: `0x${string}`) {
  const idx = BigInt(index);
  if (idx > 0xffff_ffffn) throw new Error('Relay output index exceeds u32.');
  const tail = idx.toString(16).padStart(8, '0').match(/../g)?.reverse().join('');
  return `0x${txHash.slice(2)}${tail}` as `0x${string}`;
}

function readLane(value: unknown): Packet['relay']['lane'] {
  if (isObj(value)) {
    return packLane(bytes(value.tx_hash ?? value.txHash, 'Relay transaction hash', 32), qty(value.index, 'Relay output index'));
  }
  if (typeof value === 'string' && /^0x[0-9a-f]{72}$/i.test(value.trim())) {
    return value.trim().toLowerCase() as `0x${string}`;
  }
  throw new Error('Relay lane reference is missing or malformed.');
}

function readRelay(value: unknown): Packet['relay'] {
  if (!isObj(value)) throw new Error('Relay hint is missing.');
  const pubkey = bytes(value.pubkey, 'Relay public key', 33);
  if (pubkey !== HUB_KEY) throw new Error('Relay hint must identify Bottle.');
  return {
    pubkey,
    lane: readLane(value.lane ?? value.channel_outpoint ?? value.channelOutpoint),
    feeRate: qty(value.feeRate ?? value.fee_rate, 'Relay fee rate'),
    expiryDelta: qty(value.expiryDelta ?? value.tlc_expiry_delta ?? value.tlcExpiryDelta, 'Relay expiry delta'),
  };
}

export async function mintPacket(sender: FiberBrowserNode, lane: Channel, manuscript: string) {
  if (!lane.channel_outpoint) throw new Error('Sender lane has no confirmed outpoint yet.');
  const { key, box } = await seal(manuscript);
  const ransom = await sender.newInvoice({
    amount: asHex(RANSOM),
    currency: 'Fibt',
    payment_preimage: key,
    hash_algorithm: 'sha256',
    allow_trampoline_routing: true,
    description: 'Cipherpost sealed delivery',
    expiry: '0xe10',
  });
  const packet: Packet = {
    format: 'cipherpost/v1',
    cipher: 'AES-256-GCM',
    ...box,
    ransom: ransom.invoice_address,
    hash: ransom.invoice.data.payment_hash,
    relay: {
      pubkey: HUB_KEY,
      lane: readLane(lane.channel_outpoint),
      feeRate: qty(lane.tlc_fee_proportional_millionths, 'Relay fee rate'),
      expiryDelta: qty(lane.tlc_expiry_delta, 'Relay expiry delta'),
    },
  };
  return JSON.stringify(packet, null, 2);
}

export function readPacket(text: string): Packet {
  const raw: unknown = JSON.parse(text);
  if (!isObj(raw) || raw.format !== 'cipherpost/v1' || raw.cipher !== 'AES-256-GCM') {
    throw new Error('Paste a fresh cipherpost/v1 AES-256-GCM packet.');
  }
  if (typeof raw.ransom !== 'string' || !raw.ransom.toLowerCase().startsWith('fibt')) {
    throw new Error('Packet is missing a Fiber testnet ransom invoice.');
  }
  return {
    format: 'cipherpost/v1',
    cipher: 'AES-256-GCM',
    blob: bytes(raw.blob, 'Sealed blob'),
    nonce: bytes(raw.nonce, 'AES-GCM nonce', 12),
    ransom: raw.ransom,
    hash: bytes(raw.hash, 'Ransom hash', 32),
    relay: readRelay(raw.relay),
  };
}
