import type { Channel, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { asHex, corridorClosed, corridorOpen, keysMatch, CORRIDOR_CAPACITY } from './units.ts';
import { assertFunded } from './vault-funding.ts';
import { loadTestnetRuntime } from './runtime.ts';
import { BUYER_ID, SENDER_ID, profileId } from './identities.ts';

export const HUB_KEY = '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71' as const;
export const HUB_ADDRESS = '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo';

export type Desk = 'sender' | 'buyer';
export type { Channel };

const CURVE_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

function keyOk(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
    && BigInt(`0x${value}`) > 0n && BigInt(`0x${value}`) < CURVE_ORDER;
}

function freshKey(): string {
  let value: string;
  do {
    value = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
  } while (!keyOk(value));
  return value;
}

const unpack = (hex: string) =>
  Uint8Array.from(hex.match(/.{2}/g) ?? [], (part) => Number.parseInt(part, 16));

function loadIdentity(desk: Desk) {
  const slot = desk === 'buyer' ? BUYER_ID : SENDER_ID;
  const cached = localStorage.getItem(slot);
  if (cached && !profileId(localStorage, slot)) {
    throw new Error('Saved identity is unreadable. Keep browser storage intact to preserve a funded node.');
  }
  if (cached) {
    const row = JSON.parse(cached);
    return {
      fiberKey: unpack(row.fiberKey),
      ckbKey: unpack(row.ckbKey),
      identifier: row.identifier as string,
    };
  }
  const row = { fiberKey: freshKey(), ckbKey: freshKey(), identifier: crypto.randomUUID() };
  localStorage.setItem(slot, JSON.stringify(row));
  return { fiberKey: unpack(row.fiberKey), ckbKey: unpack(row.ckbKey), identifier: row.identifier };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// TypeIDResolver hits CKB RPC get_cells during start; flaky RPC surfaces as this.
const RETRYABLE_START = /Cannot resolve cell dep for type id|failed to init contracts context/i;

export async function spinIdentity(desk: Desk, track: (node: FiberBrowserNode) => void) {
  if (!window.crossOriginIsolated) {
    throw new Error('Cross-origin isolation is missing. Restart the dev server and reload.');
  }
  const { FiberBrowserNode, RawKeyCredentialProvider } = await import('@fiber-pay/sdk/browser');
  const id = loadIdentity(desk);
  const node = new FiberBrowserNode({
    wasmFactory: await loadTestnetRuntime(),
    network: 'testnet',
    credential: new RawKeyCredentialProvider(id.fiberKey, id.ckbKey, id.identifier),
    nodeConfig: { bootnodes: [], logLevel: 'info' },
  });
  track(node);
  let last: Error | undefined;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await node.start();
      return node;
    } catch (failure) {
      last = failure instanceof Error ? failure : new Error(String(failure));
      if (!RETRYABLE_START.test(last.message) || attempt === 4) break;
      await pause(1_500 * attempt);
      await node.stop().catch(() => {});
    }
  }
  throw new Error(
    `The Fiber node could not start after several tries (${last?.message ?? 'unknown error'}). `
    + 'Check connectivity to testnet.ckbapp.dev, then check in again.',
  );
}

export const isOpen = (channel: Channel) => corridorOpen(channel.state.state_name);

// Fiber's connect resolves before the peer's Init frame; open_channel needs it.
const HALF_OPEN = /feature not found|Init message|not connected|timed? ?out|connection (closed|reset)/i;

async function hubLinked(node: FiberBrowserNode) {
  return (await node.listPeers()).peers.some((peer) => keysMatch(peer.pubkey, HUB_KEY));
}

async function awaitHub(node: FiberBrowserNode, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await hubLinked(node)) return;
    await pause(1_000);
  }
  throw new Error(
    `Bottle never finished its Fiber handshake within ${Math.round(timeoutMs / 1000)}s. `
    + 'Confirm Bottle is reachable from Chrome, then try again.',
  );
}

async function dialHub(node: FiberBrowserNode, force = false) {
  const linked = await hubLinked(node);
  if (linked && !force) return;
  if (linked) await node.disconnectPeer({ pubkey: HUB_KEY }).catch(() => {});
  try {
    await node.connectPeer({ address: HUB_ADDRESS, pubkey: HUB_KEY, save: true });
  } catch (failure) {
    const text = failure instanceof Error ? failure.message : String(failure);
    if (!/already (connected|exists)|duplicate|peer .*exists/i.test(text)) throw failure;
  }
  await awaitHub(node);
}

export async function ensureHub(node: FiberBrowserNode) {
  await dialHub(node);
}

async function carveCorridor(node: FiberBrowserNode, attempts = 8) {
  let last: Error | undefined;
  for (let tryNo = 1; tryNo <= attempts; tryNo += 1) {
    try {
      return await node.openChannel({
        pubkey: HUB_KEY,
        funding_amount: asHex(CORRIDOR_CAPACITY),
        public: true,
      });
    } catch (failure) {
      last = failure instanceof Error ? failure : new Error(String(failure));
      if (!HALF_OPEN.test(last.message) || tryNo === attempts) break;
      await pause(3_000);
      await dialHub(node, true).catch(() => {});
    }
  }
  throw new Error(
    `Bottle never completed the handshake, so no corridor was carved and nothing was spent `
    + `(${last?.message ?? 'unknown error'}). Try opening again.`,
  );
}

/** Funding negotiation can take a while; poll until Bottle and the funder both confirm. */
export async function awaitCorridorReady(
  node: FiberBrowserNode,
  timeoutMs = 90_000,
  onTick?: (state: string) => void,
) {
  const deadline = Date.now() + timeoutMs;
  let lastState = 'UNKNOWN';
  while (Date.now() < deadline) {
    const lane = await findCorridor(node);
    if (!lane) {
      await pause(2_000);
      continue;
    }
    lastState = lane.state.state_name;
    onTick?.(lastState);
    if (isOpen(lane)) return lane;
    if (corridorClosed(lastState)) {
      throw new Error(`Corridor closed during funding (${lastState}). Open it again.`);
    }
    await pause(2_000);
  }
  throw new Error(
    `Corridor is still ${lastState} after ${Math.round(timeoutMs / 1000)}s. `
    + 'Confirm the desk has ≥501 CKB, Bottle is reachable, then press Re-check corridor.',
  );
}

export async function openCorridor(
  node: FiberBrowserNode,
  onTick?: (state: string) => void,
) {
  await dialHub(node);
  const standing = await findCorridor(node);
  if (standing && isOpen(standing)) return standing;
  if (!standing) {
    await assertFunded(node);
    await carveCorridor(node);
  } else {
    onTick?.(standing.state.state_name);
  }
  return await awaitCorridorReady(node, 90_000, onTick);
}

export async function findCorridor(node: FiberBrowserNode) {
  const lanes = (await node.listChannels()).channels.filter(
    (channel) => keysMatch(channel.pubkey, HUB_KEY) && !corridorClosed(channel.state.state_name),
  );
  return lanes.find(isOpen) ?? lanes[0];
}
