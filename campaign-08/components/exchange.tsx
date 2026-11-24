'use client';

import type { StudioState } from '../studio/state';
import { showCkb, RANSOM, FEE_CEILING } from '../core/units';

type Common = { state: StudioState; busy: boolean };

type SenderProps = Common & {
  onManuscript: (text: string) => void;
  onMint: () => void;
  onCopy: () => void;
  onReset: () => void;
};

type BuyerProps = Common & {
  onInbox: (text: string) => void;
  onInspect: () => void;
  onProbe: () => void;
  onSettle: () => void;
  onPoll: () => void;
  onUnlock: () => void;
};

export function SenderPanel({ state, busy, onManuscript, onMint, onCopy, onReset }: SenderProps) {
  const canMint = Boolean(
    state.desks.sender?.lane
    && state.manuscript.trim()
    && !state.sealed
    && !state.ransomHash,
  );
  const error = state.deskError.sender;

  return (
    <section className="panel sender" data-proof="offer">
      <div className="panel-head">
        <h2>Seal desk</h2>
        <span className={`chip seal${state.sealed ? ' seal' : ''}`}>
          {state.sealed ? 'packet ready' : 'manuscript'}
        </span>
      </div>
      {error && <p className="desk-err" role="alert">{error}</p>}
      <small>Manuscript</small>
      <textarea
        aria-label="Manuscript"
        disabled={busy || Boolean(state.sealed)}
        value={state.manuscript}
        onChange={(event) => onManuscript(event.target.value)}
      />
      <div className="row">
        <button className="seal-btn" disabled={busy || !canMint} onClick={onMint}>
          Seal &amp; mint {showCkb(RANSOM)} ransom
        </button>
      </div>
      {!state.sealed && !state.ransomHash && (
        <p className="hint">Needs a live corridor on both desks before sealing.</p>
      )}
      <small>Sealed packet · public</small>
      <textarea
        aria-label="Sealed packet"
        readOnly
        value={state.sealed}
        placeholder="{ format: cipherpost/v1, … }"
      />
      <div className="row">
        <button className="ghost" disabled={!state.sealed || busy} onClick={onCopy}>
          Copy packet
        </button>
        {state.sealed && !state.ransomHash && (
          <button className="ghost" disabled={busy} onClick={onReset}>
            Reset exchange
          </button>
        )}
      </div>
    </section>
  );
}

export function BuyerPanel({ state, busy, onInbox, onInspect, onProbe, onSettle, onPoll, onUnlock }: BuyerProps) {
  const error = state.deskError.buyer;
  const packet = state.packet;
  const key = state.ransomKey;
  const canSettle = Boolean(
    packet && state.lockOpened && !key
    && (!state.ransomHash || state.payment?.status === 'Failed'),
  );

  return (
    <section className="panel buyer" data-proof="buyer">
      <div className="panel-head">
        <h2>Unlock desk</h2>
        <span className={`chip courier${key ? ' hot' : ''}`}>
          {key ? 'key in hand' : state.lockOpened ? 'seal held' : 'waiting'}
        </span>
      </div>
      {error && <p className="desk-err" role="alert">{error}</p>}
      <small>Incoming packet</small>
      <textarea
        aria-label="Incoming packet"
        disabled={busy || Boolean(packet || state.ransomHash)}
        value={state.inbox}
        onChange={(event) => onInbox(event.target.value)}
        placeholder="Paste the JSON from the seal desk…"
      />
      {state.inbox.trim() ? (
        <p className="hint">Received ({state.inbox.length} chars).</p>
      ) : (
        <p className="hint">Copy the sealed packet from the seal desk, then paste it here.</p>
      )}
      {!state.desks.buyer?.address && (
        <p className="hint">Check in the buyer desk above first.</p>
      )}
      <div className="row">
        <button className="courier-btn" disabled={busy || Boolean(packet)} onClick={onInspect}>
          Inspect packet
        </button>
        {!state.lockOpened && (
          <button className="ghost" disabled={busy || !packet} onClick={onProbe}>
            Probe without key
          </button>
        )}
      </div>
      {state.lockOpened && (
        <p className="proof" data-proof="decryption-rejected">
          Probe refused: AES-GCM authentication failed without the ransom preimage.
        </p>
      )}
      {packet && !key && (
        <p className="hint">
          The unseal key is the invoice preimage. Fiber hands it over only after the{' '}
          {showCkb(RANSOM)} ransom settles.
        </p>
      )}
      {canSettle && (
        <div className="row">
          <button className="courier-btn" disabled={busy} onClick={onSettle}>
            Pay {showCkb(RANSOM)} ransom
          </button>
        </div>
      )}
      {state.ransomHash && !key && (
        <div className="row">
          <button className="ghost" disabled={busy || !packet || !state.desks.buyer?.address} onClick={onPoll}>
            Re-read payment
          </button>
        </div>
      )}
      {key && !state.openedText && (
        <>
          <p className="hint">Preimage arrived (32 bytes). Open the seal.</p>
          <div className="row">
            <button className="courier-btn" disabled={busy} onClick={onUnlock}>
              Open with ransom key
            </button>
          </div>
        </>
      )}
      {!packet && !state.ransomHash && (
        <p className="hint">Inspect unlocks the probe and pay buttons.</p>
      )}
    </section>
  );
}

export function ReceiptSheet({ state }: Common) {
  const payment = state.payment;
  if (!payment) return null;
  const fee = BigInt(payment.fee ?? '0x0');
  const proofLine =
    payment.status !== 'Success' || !payment.payment_preimage
      ? 'available after settlement'
      : state.preimageProof === 'match'
        ? 'sha256(preimage) = payment hash ✓'
        : state.preimageProof === 'mismatch'
          ? 'sha256 mismatch — do not trust this receipt'
          : `${state.preimageProof || 'checking'}…`;

  return (
    <section className="receipt" data-proof="receipt">
      <div className="panel-head">
        <h2>Ransom receipt</h2>
        <span className={`chip${payment.status === 'Success' ? ' hot' : ''}`}>{payment.status}</span>
      </div>
      <dl className="ledger">
        <div><dt>Amount</dt><dd>{showCkb(RANSOM)}</dd></div>
        <div><dt>Routing fee</dt><dd>{showCkb(fee)}</dd></div>
        <div><dt>Invoice</dt><dd>1 CKB · Fibt</dd></div>
        <div><dt>Preimage</dt><dd>{payment.payment_preimage ? 'yes (32 bytes)' : 'no'}</dd></div>
        <div><dt>Commitment</dt><dd>{proofLine}</dd></div>
        <div><dt>Fee ceiling</dt><dd>{showCkb(FEE_CEILING)}</dd></div>
        <div className="wide"><dt>Ransom hash</dt><dd>{payment.payment_hash}</dd></div>
        <div className="wide">
          <dt>Settlement</dt>
          <dd>
            Off-chain inside the corridor — no CKB explorer page exists for this hash.
            Verify with the corridor funding links above or re-read the node.
          </dd>
        </div>
      </dl>
    </section>
  );
}
