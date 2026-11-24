'use client';

import type { Desk } from '../studio/state';
import type { StudioState } from '../studio/state';
import { fundingTxHash, showCkb, CORRIDOR_CAPACITY, ONCHAIN_TIP } from '../core/units';
import { fundingHint } from '../core/vault-funding';

type Props = {
  desk: Desk;
  state: StudioState;
  busy: boolean;
  onStart: () => void;
  onCarve: () => void;
  onRefresh: () => void;
};

const label = (desk: Desk) => (desk === 'buyer' ? 'Buyer desk' : 'Sender desk');

export function DeskCard({ desk, state, busy, onStart, onCarve, onRefresh }: Props) {
  const snap = state.desks[desk];
  const error = state.deskError[desk];
  const lane = snap?.lane;
  const ready = Boolean(lane && lane.state.state_name.replaceAll('_', '').toLowerCase() === 'channelready');
  const onchain = snap?.capacity;

  return (
    <section className={`desk ${desk}`} data-proof="channels">
      <div className="panel-head">
        <h3>{label(desk)}</h3>
        <span className={`chip${ready ? ' hot' : ''}`}>
          {lane ? lane.state.state_name : snap?.linked ? 'linked' : 'offline'}
        </span>
      </div>

      {error && <p className="desk-err" role="alert">{error}</p>}

      {!snap?.address && (
        <button disabled={!state.booted || busy} onClick={onStart}>
          Check in {label(desk)}
        </button>
      )}

      {snap?.address && (
        <>
          <small>Testnet drop box</small>
          <code className="addr">{snap.address}</code>
          <p className="stat" data-proof="onchain-balance">
            On-chain: <strong>{onchain === undefined ? 'reading…' : showCkb(onchain)}</strong>
            {snap.capacityNote ? ` · ${snap.capacityNote}` : ''}
            {!snap.capacityNote && typeof onchain === 'bigint' && onchain < CORRIDOR_CAPACITY + ONCHAIN_TIP
              ? ' · faucet may take a minute'
              : ''}
          </p>
          <div className="row">
            <a href="https://faucet.nervos.org" target="_blank" rel="noreferrer">Faucet ↗</a>
          </div>
          {!lane && <p className="hint">{fundingHint}</p>}
          {lane && (
            <p className="stat">
              {label(desk)}: <strong>{showCkb(BigInt(lane.local_balance))}</strong>
              {' · '}Bottle: <strong>{showCkb(BigInt(lane.remote_balance))}</strong>
            </p>
          )}
          {lane && fundingTxHash(lane.channel_outpoint) && (
            <div className="row">
              <a
                href={`https://pudge.explorer.nervos.org/transaction/${fundingTxHash(lane.channel_outpoint)}`}
                target="_blank"
                rel="noreferrer"
              >
                Corridor funding tx ↗
              </a>
            </div>
          )}
          <div className="row">
            <button disabled={busy} onClick={onCarve}>
              {lane ? 'Re-check corridor' : `Open ${showCkb(CORRIDOR_CAPACITY)} corridor`}
            </button>
            <button className="ghost" disabled={busy} onClick={onRefresh}>
              Refresh
            </button>
          </div>
        </>
      )}
    </section>
  );
}
