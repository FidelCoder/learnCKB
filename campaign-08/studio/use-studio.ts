'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { scriptToAddress, type GetPaymentResult } from '@fiber-pay/sdk/browser';
import {
  HUB_KEY, findCorridor, isOpen, openCorridor, ensureHub, spinIdentity, type Desk,
} from '../core/bottle';
import { digestHex, unseal } from '../core/keys';
import { mintPacket, readPacket } from '../core/packet';
import { inspectPacket, payRansom } from '../core/settlement';
import { makeIdentityGuard } from '../core/session';
import {
  BUYER_ID, SENDER_ID, loadRunSnapshot, profileId, RUN_SNAPSHOT, type RunSnapshot,
} from '../core/identities';
import { chainCapacity } from '../core/faucet';
import { fundingTxHash, keysMatch, showCkb, FEE_CEILING, RANSOM, CORRIDOR_CAPACITY, ONCHAIN_TIP } from '../core/units';
import { initialStudio, studioReducer, type Rigs, type StudioState } from './state';

const SAMPLE_HOLD = 'cipherpost:relay-inflight';

function persist(patch: Partial<RunSnapshot>) {
  const senderId = profileId(localStorage, SENDER_ID);
  const buyerId = profileId(localStorage, BUYER_ID);
  if (!senderId || !buyerId) throw new Error('Start both desk identities before continuing.');
  const next: RunSnapshot = {
    version: 1, senderId, buyerId, sealedPacket: '', inboxText: '',
    ransomHash: '', lockProbed: false, ...patch,
  };
  sessionStorage.setItem(RUN_SNAPSHOT, JSON.stringify(next));
}

export function useStudio() {
  const [state, dispatch] = useReducer(studioReducer, initialStudio);
  const rigs = useRef<Rigs>({});
  const guards = useRef<Partial<Record<Desk, ReturnType<typeof makeIdentityGuard>>>>({});
  const scripts = useRef<Partial<Record<Desk, unknown>>>({});
  const snapshot = useRef<RunSnapshot | null>(null);
  const gate = useRef(false);

  const feed = useCallback((action: Parameters<typeof dispatch>[0]) => dispatch(action), []);

  async function perform(job: () => Promise<void>, desk?: Desk | 'relay') {
    if (gate.current) return;
    gate.current = true;
    feed({ type: 'busy', on: true });
    feed({ type: 'alert', text: '' });
    if (desk) feed({ type: 'desk-error', desk, text: undefined });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const running = job();
      running.catch(() => { /* surfaced by the race below */ });
      await Promise.race([
        running,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(
            'This step exceeded 120 s and the controls were released. '
            + 'Check corridor or payment status before retrying.',
          )), 120_000);
        }),
      ]);
    } catch (failure) {
      const text = failure instanceof Error ? failure.message : 'Step failed. Check status before retrying.';
      feed({ type: 'alert', text });
      if (desk) feed({ type: 'desk-error', desk, text });
    } finally {
      if (timer) clearTimeout(timer);
      gate.current = false;
      feed({ type: 'busy', on: false });
    }
  }

  async function measure(desk: Desk) {
    const script = scripts.current[desk];
    if (!script) return;
    try {
      const capacity = await chainCapacity(script);
      feed({ type: 'desk', desk, patch: { capacity } });
    } catch (failure) {
      feed({
        type: 'desk', desk,
        patch: { capacityNote: failure instanceof Error ? failure.message : 'Capacity unreadable.' },
      });
    }
  }

  async function resyncDesk(desk: Desk) {
    const rig = rigs.current[desk];
    if (!rig) throw new Error(desk === 'buyer' ? 'Start the buyer desk first.' : 'Start the sender desk first.');
    const [lane, peers] = await Promise.all([findCorridor(rig), rig.listPeers()]);
    feed({
      type: 'desk', desk,
      patch: { linked: peers.peers.some((p) => keysMatch(p.pubkey, HUB_KEY)), lane },
    });
    await measure(desk);
  }

  const resync = useCallback((desk: Desk) => perform(() => resyncDesk(desk), desk), [feed]);

  // Boot: restore public run-state, wire page lifecycle.
  useEffect(() => {
    const saved = loadRunSnapshot(sessionStorage, localStorage);
    snapshot.current = saved;
    const boot: Partial<StudioState> = {};
    if (saved) {
      boot.sealed = saved.sealedPacket;
      boot.inbox = saved.inboxText;
      boot.ransomHash = saved.ransomHash;
      boot.lockOpened = saved.lockProbed;
    }
    const senderHold = saved && profileId(localStorage, SENDER_ID)
      ? sessionStorage.getItem(`${SAMPLE_HOLD}:${profileId(localStorage, SENDER_ID)}`)
      : null;
    if (senderHold === 'inflight') boot.relay = { ...initialStudio.relay, stuck: true };
    else if (senderHold) boot.relay = { ...initialStudio.relay, hash: senderHold };
    feed({ type: 'boot', snapshot: boot });

    const haltAll = () => {
      for (const guard of Object.values(guards.current)) void guard?.halt().catch(() => {});
    };
    window.addEventListener('pagehide', haltAll);
    return () => {
      window.removeEventListener('pagehide', haltAll);
      haltAll();
      rigs.current = {};
      guards.current = {};
      scripts.current = {};
    };
  }, [feed]);

  // Capacity poll while visible.
  useEffect(() => {
    if (!state.booted) return;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      for (const desk of Object.keys(scripts.current) as Desk[]) void measure(desk);
    };
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [state.booted]);

  // Ransom commitment: hash must equal sha256(preimage).
  useEffect(() => {
    let cancelled = false;
    const preimage = state.payment?.status === 'Success' ? state.payment.payment_preimage : null;
    if (!preimage || !state.payment) {
      feed({ type: 'proof', state: '' });
      return () => { cancelled = true; };
    }
    feed({ type: 'proof', state: 'checking' });
    digestHex(preimage)
      .then((digest) => {
        if (cancelled) return;
        feed({
          type: 'proof',
          state: digest.toLowerCase() === state.payment!.payment_hash.toLowerCase() ? 'match' : 'mismatch',
        });
      })
      .catch(() => { if (!cancelled) feed({ type: 'proof', state: 'unavailable' }); });
    return () => { cancelled = true; };
  }, [state.payment, feed]);

  const spin = useCallback((desk: Desk) => perform(async () => {
    if (rigs.current[desk]) return;
    const guard = guards.current[desk] ??= makeIdentityGuard();
    let spun: Awaited<ReturnType<typeof spinIdentity>> | undefined;
    await guard.boot(desk === 'buyer' ? BUYER_ID : SENDER_ID, async (track) => {
      spun = await spinIdentity(desk, track);
    });
    if (!spun) throw new Error('The desk identity did not start. Reload and try again.');
    rigs.current[desk] = spun;
    const info = await spun.nodeInfo();
    scripts.current[desk] = info.default_funding_lock_script;
    feed({
      type: 'desk', desk,
      patch: { address: scriptToAddress(info.default_funding_lock_script, 'testnet') },
    });
    await measure(desk);
    if (await findCorridor(spun)) await ensureHub(spun);
    await resyncDesk(desk);
  }, desk), [feed, resync]);

  const carve = useCallback((desk: Desk) => perform(async () => {
    const rig = rigs.current[desk];
    if (!rig) throw new Error('Start this desk first.');
    feed({ type: 'ribbon', text: 'Carving the 500 CKB corridor through Bottle…' });
    const lane = await openCorridor(rig, (state) => {
      feed({ type: 'ribbon', text: `Corridor funding: ${state}…` });
    });
    feed({ type: 'desk', desk, patch: { lane } });
    await resyncDesk(desk);
    feed({
      type: 'ribbon',
      text: lane && isOpen(lane) ? 'Corridor open: CHANNEL_READY.' : `Corridor is ${lane?.state.state_name ?? 'unknown'}.`,
    });
  }, desk), [feed, resync]);

  const pushRelay = useCallback(() => perform(async () => {
    const rig = rigs.current.sender;
    if (!rig) throw new Error('Start the sender desk first.');
    const id = profileId(localStorage, SENDER_ID);
    if (!id) throw new Error('Start the sender desk first.');
    const slot = `${SAMPLE_HOLD}:${id}`;
    const standing = sessionStorage.getItem(slot);
    if (standing === 'inflight') {
      feed({ type: 'relay', patch: { stuck: true } });
      throw new Error('Relay outcome unknown. Reset below, then send again.');
    }
    let result: GetPaymentResult;
    if (standing) {
      feed({ type: 'ribbon', text: 'Checking the earlier 5 CKB relay…' });
      result = await rig.getPayment({ payment_hash: standing as `0x${string}` });
    } else {
      sessionStorage.setItem(slot, 'inflight');
      feed({ type: 'ribbon', text: 'Relaying 5 CKB from sender to Bottle…' });
      result = await rig.sendPayment({ target_pubkey: HUB_KEY, amount: '0x1dcd6500', keysend: true });
      sessionStorage.setItem(slot, result.payment_hash);
      feed({ type: 'relay', patch: { hash: result.payment_hash, stuck: false } });
    }
    if (!['Success', 'Failed'].includes(result.status)) {
      feed({ type: 'ribbon', text: 'Waiting for the 5 CKB relay to settle…' });
      result = await rig.waitForPayment(result.payment_hash, { timeout: 60_000, interval: 1_000 });
    }
    if (result.status === 'Failed') sessionStorage.removeItem(slot);
    const fee = BigInt(result.fee ?? '0x0');
    feed({
      type: 'relay',
      patch: {
        hash: result.payment_hash,
        note: `${result.status} · fee ${showCkb(fee)} (${fee} shannons) · hash ${result.payment_hash}`,
      },
    });
    feed({ type: 'ribbon', text: `Relay: ${result.status}` });
    await resyncDesk('sender');
  }, 'relay'), [feed, resync]);

  const auditRelay = useCallback(() => perform(async () => {
    const rig = rigs.current.sender;
    if (!rig) throw new Error('Start the sender desk first.');
    const { hash } = state.relay;
    if (!hash) throw new Error('Send the 5 CKB relay first — nothing to audit.');
    feed({ type: 'ribbon', text: 'Auditing the relay hash against the sender node…' });
    const result = await rig.getPayment({ payment_hash: hash as `0x${string}` });
    const fee = BigInt(result.fee ?? '0x0');
    feed({
      type: 'relay',
      patch: {
        verify: `get_payment → ${result.status} · fee ${showCkb(fee)} · hash ${result.payment_hash}`
          + (result.payment_preimage ? ' · preimage present (32 bytes)' : ' · no preimage'),
      },
    });
    feed({ type: 'ribbon', text: `Relay audit: ${result.status}` });
    await resyncDesk('sender');
  }, 'relay'), [feed, resync, state.relay.hash]);

  const mint = useCallback(() => perform(async () => {
    const rig = rigs.current.sender;
    if (!rig) throw new Error('Start the sender desk first.');
    const lane = state.desks.sender?.lane;
    if (!lane) throw new Error('Open the sender corridor first.');
    if (!routeReady(state)) throw new Error(`Route not ready — ${routeIssues(state).join(' · ')}.`);
    if (state.sealed || state.ransomHash) throw new Error('A packet already exists. Reset the exchange desk first.');
    feed({ type: 'ribbon', text: 'Sealing the manuscript and minting the 1 CKB ransom…' });
    const json = await mintPacket(rig, lane, state.manuscript);
    persist({ sealedPacket: json });
    feed({ type: 'sealed', json });
    feed({ type: 'ribbon', text: 'Packet sealed. Hand it to the buyer desk.' });
  }, 'sender'), [feed, state]);

  const inspect = useCallback(() => perform(async () => {
    const rig = rigs.current.buyer;
    if (!rig) throw new Error('Start the buyer desk first.');
    if (!state.inbox.trim()) throw new Error('Paste the sealed packet into the buyer inbox first.');
    feed({ type: 'ribbon', text: 'Verifying the packet on the buyer desk…' });
    const packet = readPacket(state.inbox);
    await inspectPacket(rig, packet);
    if (state.ransomHash && packet.hash.toLowerCase() !== state.ransomHash.toLowerCase()) {
      throw new Error('Restore the packet from the previous payment.');
    }
    persist({ inboxText: state.inbox });
    feed({ type: 'packet', packet });
    feed({ type: 'ribbon', text: 'Packet verified: Fibt invoice, 1 CKB, matching hash.' });
  }, 'buyer'), [feed, state.inbox, state.ransomHash]);

  const probe = useCallback(() => perform(async () => {
    if (!state.packet) throw new Error('Inspect the sealed packet first.');
    feed({ type: 'ribbon', text: 'Probing the seal without the ransom key…' });
    try {
      await unseal(
        { blob: state.packet.blob, nonce: state.packet.nonce },
        `0x${'11'.repeat(32)}`,
      );
      throw new Error('Seal opened unexpectedly. Mint a fresh packet.');
    } catch (failure) {
      if (!(failure instanceof DOMException) || failure.name !== 'OperationError') throw failure;
    }
    persist({ lockProbed: true });
    feed({ type: 'lock', opened: true });
    feed({ type: 'ribbon', text: 'Seal held: AES-GCM refused the substitute key.' });
  }, 'buyer'), [feed, state.packet]);

  const settle = useCallback(() => perform(async () => {
    const rig = rigs.current.buyer;
    if (!rig) throw new Error('Start the buyer desk first.');
    if (!state.packet) throw new Error('Inspect the sealed packet first.');
    if (!state.lockOpened) throw new Error('Probe the seal first to prove the lock holds.');
    if (!routeReady(state)) throw new Error(`Route not ready — ${routeIssues(state).join(' · ')}.`);
    feed({ type: 'ribbon', text: 'Submitting the 1 CKB ransom through Bottle…' });
    const result = await payRansom(rig, state.packet, state.ransomHash, (hash) => {
      persist({ ransomHash: hash });
      feed({ type: 'ransom-hash', hash });
    }, state.payment?.status === 'Failed');
    feed({ type: 'payment', result });
    feed({ type: 'ribbon', text: `Ransom: ${result.status}` });
    if (result.status === 'Failed') {
      feed({ type: 'alert', text: result.failed_error ?? 'Payment failed. Check liquidity and the relay hint.' });
    }
    await Promise.all([resyncDesk('buyer'), resyncDesk('sender')]);
  }, 'buyer'), [feed, resync, state]);

  const pollRansom = useCallback(() => perform(async () => {
    const rig = rigs.current.buyer;
    if (!rig) throw new Error('Start the buyer desk first.');
    if (!state.packet) throw new Error('Inspect the sealed packet first.');
    if (!state.ransomHash) throw new Error('Pay the ransom first — nothing to check.');
    feed({ type: 'ribbon', text: 'Re-reading the ransom from the node…' });
    await inspectPacket(rig, state.packet);
    const result = await rig.getPayment({ payment_hash: state.ransomHash as `0x${string}` });
    feed({ type: 'payment', result });
    feed({ type: 'ribbon', text: `Ransom: ${result.status}` });
    await resyncDesk('buyer');
  }, 'buyer'), [feed, resync, state.packet, state.ransomHash]);

  const unlock = useCallback(() => perform(async () => {
    if (!state.packet || !state.ransomKey) throw new Error('The ransom key has not arrived yet.');
    feed({ type: 'ribbon', text: 'Turning the ransom key into the opened page…' });
    const text = await unseal(
      { blob: state.packet.blob, nonce: state.packet.nonce },
      state.ransomKey,
    );
    feed({ type: 'opened', text });
    feed({ type: 'ribbon', text: 'Opened: matches the sender manuscript.' });
  }, 'buyer'), [feed, state.packet, state.ransomKey]);

  const resetExchange = useCallback(() => perform(async () => {
    if (state.busy || (state.ransomHash && state.payment?.status !== 'Failed')) return;
    persist({ sealedPacket: '', inboxText: '', ransomHash: '', lockProbed: false });
    feed({ type: 'reset-exchange' });
  }), [feed, state.busy, state.ransomHash, state.payment?.status]);

  const haltDesks = useCallback(() => perform(async () => {
    for (const guard of Object.values(guards.current)) await guard?.halt().catch(() => {});
    rigs.current = {};
    guards.current = {};
    scripts.current = {};
    feed({ type: 'desk', desk: 'buyer', patch: { address: undefined, capacity: undefined, capacityNote: undefined, linked: undefined, lane: undefined } });
    feed({ type: 'desk', desk: 'sender', patch: { address: undefined, capacity: undefined, capacityNote: undefined, linked: undefined, lane: undefined } });
    feed({ type: 'ribbon', text: 'Identities stopped. Saved keys remain in this browser.' });
  }), [feed]);

  const copySealed = useCallback(() => perform(async () => {
    if (!state.sealed) throw new Error('Seal a packet first.');
    await navigator.clipboard.writeText(state.sealed);
    feed({ type: 'ribbon', text: 'Packet copied to the clipboard.' });
  }, 'sender'), [feed, state.sealed]);

  return {
    state,
    busy: state.busy,
    actions: {
      spin, carve, pushRelay, auditRelay, mint, inspect, probe, settle, pollRansom,
      unlock, resetExchange, haltDesks, copySealed, resync, measure,
      manuscript: (text: string) => feed({ type: 'manuscript', text }),
      inbox: (text: string) => feed({ type: 'inbox', text }),
      ribbon: (text: string) => feed({ type: 'ribbon', text }),
    },
    guide: useMemo(() => ({ ready: routeReady(state), issues: routeIssues(state), fundingHintText: fundingHintText(state) }), [state]),
  };
}

function routeReady(state: StudioState) {
  const buyer = state.desks.buyer;
  const sender = state.desks.sender;
  return Boolean(
    buyer?.linked && buyer.lane && isOpen(buyer.lane)
    && BigInt(buyer.lane.local_balance) >= RANSOM + FEE_CEILING
    && sender?.linked && sender.lane && isOpen(sender.lane)
    && BigInt(sender.lane.remote_balance) >= RANSOM,
  );
}

function routeIssues(state: StudioState): string[] {
  const buyer = state.desks.buyer;
  const sender = state.desks.sender;
  const issues: string[] = [];
  if (!buyer?.linked) issues.push('buyer is not linked to Bottle');
  if (!buyer?.lane) issues.push('buyer has no corridor');
  else if (!isOpen(buyer.lane)) issues.push(`buyer corridor is ${buyer.lane.state.state_name}`);
  else if (BigInt(buyer.lane.local_balance) < RANSOM + FEE_CEILING) issues.push('buyer needs 1 CKB plus fee in the corridor');
  if (!sender?.linked) issues.push('sender is not linked to Bottle');
  if (!sender?.lane) issues.push('sender has no corridor');
  else if (!isOpen(sender.lane)) issues.push(`sender corridor is ${sender.lane.state.state_name}`);
  else if (BigInt(sender.lane.remote_balance) < RANSOM) issues.push('sender needs at least 1 CKB inbound from Bottle');
  return issues;
}

function fundingHintText(state: StudioState): string {
  return `Fund each desk address with at least ${showCkb(CORRIDOR_CAPACITY + ONCHAIN_TIP)}.`;
}
