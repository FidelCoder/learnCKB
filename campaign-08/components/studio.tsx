'use client';

import { useStudio } from '../studio/use-studio';
import { DeskCard } from './desk-card';
import { BuyerPanel, ReceiptSheet, SenderPanel } from './exchange';
import { showCkb, CORRIDOR_CAPACITY } from '../core/units';

const STAGES = [
  { id: 'corridor', title: 'Corridor', copy: 'Check both desks into Bottle and carve 500 CKB lanes.' },
  { id: 'seal', title: 'Seal', copy: 'Sender encrypts the manuscript into a public packet.' },
  { id: 'ransom', title: 'Ransom', copy: 'Buyer probes the lock, then pays 1 CKB for the key.' },
  { id: 'open', title: 'Open', copy: 'Preimage unlocks the page; hash proves the commitment.' },
] as const;

export function Studio() {
  const { state, busy, actions, guide } = useStudio();
  const desks = state.desks;
  const stageIndex = !desks.buyer?.lane || !desks.sender?.lane
    ? 0
    : !state.sealed
      ? 1
      : !state.ransomKey
        ? 2
        : 3;

  return (
    <div className="page">
      <header className="masthead">
        <div className="wordmark">Cipher<span>post</span></div>
        <div className="net">CKB Testnet · Fiber</div>
      </header>

      <section className="hero">
        <p className="kicker">Sealed mail · one CKB · invoice preimage</p>
        <h1>Pay the ransom. Open the page.</h1>
        <p className="lede">
          The sender AES-256-GCM seals a manuscript and mints a Fiber invoice whose preimage
          is the same 32 bytes. The packet stays public; only a settled 1 CKB payment
          delivers the key that opens it.
        </p>
      </section>

      <nav className="rail" aria-label="Stages">
        {STAGES.map((stage, index) => (
          <div key={stage.id} className={`rail-step${index === stageIndex ? ' on' : ''}`}>
            <b>Stage {index + 1}</b>
            <strong>{stage.title}</strong>
            <p>{stage.copy}</p>
          </div>
        ))}
      </nav>

      {(state.ribbon || busy) && (
        <p className={`ribbon${state.alert ? ' alert' : ''}`} role="status">
          {state.alert || state.ribbon || 'Working…'}
        </p>
      )}
      {!state.ribbon && !busy && state.alert && (
        <p className="ribbon alert" role="alert">{state.alert}</p>
      )}

      <div className="route-line" data-proof={guide.ready ? 'route-ready' : 'route-blocked'}>
        <b>Sender</b>
        <em>── {showCkb(100_000_000n)} ──▶</em>
        <b>Bottle</b>
        <em>── {showCkb(100_000_000n)} ──▶</em>
        <b>Buyer</b>
        {!guide.ready && guide.issues.length > 0 && (
          <div className="hint" style={{ marginTop: 8 }}>
            Waiting · {guide.issues.join(' · ')}
          </div>
        )}
      </div>

      <section className="band">
        <div className="band-head">
          <h2>The corridor</h2>
          <span className={`chip${guide.ready ? ' hot' : ''}`}>
            {guide.ready ? 'route ready' : 'building'}
          </span>
        </div>
        <div className="desk-grid">
          <DeskCard
            desk="sender"
            state={state}
            busy={busy}
            onStart={() => void actions.spin('sender')}
            onCarve={() => void actions.carve('sender')}
            onRefresh={() => void actions.resync('sender')}
          />
          <DeskCard
            desk="buyer"
            state={state}
            busy={busy}
            onStart={() => void actions.spin('buyer')}
            onCarve={() => void actions.carve('buyer')}
            onRefresh={() => void actions.resync('buyer')}
          />
        </div>

        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
          <div className="panel-head">
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', margin: 0 }}>
              Optional relay
            </h2>
            <span className="chip">5 CKB sender → Bottle</span>
          </div>
          <p className="hint" style={{ margin: '10px 0 12px' }}>
            Bottle contributes {showCkb(CORRIDOR_CAPACITY / 2n)} per lane and keeps a reserve.
            Pushing 5 CKB back widens inbound room toward the sender when the default split is tight.
          </p>
          {desks.sender?.lane && (
            <p className="stat" data-proof="channel-balances">
              Live sender lane · local <strong>{showCkb(BigInt(desks.sender.lane.local_balance))}</strong>
              {' · '}Bottle <strong>{showCkb(BigInt(desks.sender.lane.remote_balance))}</strong>
            </p>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button
              className="ghost"
              disabled={busy || !desks.sender?.lane
                || desks.sender.lane.state.state_name !== 'CHANNEL_READY'
                || BigInt(desks.sender.lane.local_balance) < 500_000_000n}
              onClick={() => void actions.pushRelay()}
            >
              Send / check 5 CKB relay
            </button>
            {state.relay.hash && (
              <button className="ghost" disabled={busy} onClick={() => void actions.auditRelay()}>
                Audit hash via node
              </button>
            )}
            {state.relay.stuck && (
              <button
                className="ghost"
                disabled={busy}
                onClick={() => {
                  const id = localStorage.getItem('cipherpost:sender-v1');
                  if (id) {
                    try {
                      const parsed = JSON.parse(id) as { identifier?: string };
                      if (parsed.identifier) sessionStorage.removeItem(`cipherpost:relay-inflight:${parsed.identifier}`);
                    } catch { /* ignore */ }
                  }
                  actions.ribbon('Inflight relay cleared. Send again.');
                }}
              >
                Reset attempt
              </button>
            )}
          </div>
          {state.relay.note && <p className="stat" data-proof="liquidity" style={{ marginTop: 10 }}>{state.relay.note}</p>}
          {state.relay.verify && (
            <p className="stat" data-proof="liquidity-verify" style={{ marginTop: 8 }}>{state.relay.verify}</p>
          )}
          {state.relay.hash && (
            <p className="hint" style={{ marginTop: 10 }}>
              This hash is off-chain: Fiber moves balance inside the corridor and creates no
              transaction, so no explorer page exists for it. Check the funding tx links above,
              the sha256 commitment on the receipt, or the node audit button.
            </p>
          )}
        </div>
      </section>

      <div className="exchange">
        <SenderPanel
          state={state}
          busy={busy}
          onManuscript={actions.manuscript}
          onMint={() => void actions.mint()}
          onCopy={() => void actions.copySealed()}
          onReset={actions.resetExchange}
        />
        <BuyerPanel
          state={state}
          busy={busy}
          onInbox={actions.inbox}
          onInspect={() => void actions.inspect()}
          onProbe={() => void actions.probe()}
          onSettle={() => void actions.settle()}
          onPoll={() => void actions.pollRansom()}
          onUnlock={() => void actions.unlock()}
        />
      </div>

      <ReceiptSheet state={state} busy={busy} />

      {state.openedText && (
        <section className="opened" data-proof="decrypted">
          <small>Opened page · matches the sender manuscript</small>
          <pre>{state.openedText}</pre>
        </section>
      )}

      <footer className="colophon">
        <span>Testnet only. Keys and opened pages never touch storage.</span>
        <button disabled={busy} onClick={() => void actions.haltDesks()}>
          Check out both desks
        </button>
      </footer>
    </div>
  );
}
