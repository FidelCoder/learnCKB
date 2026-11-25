# Cipherpost — Campaign 08 (Fiber pay-to-open)

Build on CKB Campaign #8 advanced quest. Cipherpost is a two-desk Testnet app:
the **sender** seals a manuscript with AES-256-GCM and mints a 1 CKB Fiber
invoice whose preimage is the same 32-byte AES key; the **unlock** desk pays
through Bottle, receives the preimage, and only then opens the page.

Story: a research brief is sold as a sealed packet. The JSON is public
(ciphertext, invoice, hop hint). Payment is the key handoff — not a tip jar,
not a login.

## Idea in one line

`sha256(preimage) === payment_hash` and `AES-GCM(blob, preimage) === manuscript`.

## Run

Node.js 22.18+.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:3000` in Chrome (secure context, `SharedArrayBuffer`,
Web Locks, COOP/COEP from `next.config.mjs`).

```sh
npm run check   # tsc
npm test        # unit tests
npm run build   # production build
```

## Walkthrough

1. Check in both desks; fund each `ckt1` address (500 CKB corridor + on-chain tip).
2. Open corridors to Bottle; wait for `CHANNEL_READY` on both.
3. Optional: push 5 CKB sender → Bottle so inbound room covers the ransom.
4. Seal desk: encrypt manuscript, mint the 1 CKB ransom, copy the public packet.
5. Unlock desk: paste packet → Inspect → Probe without key → **AES-GCM rejects**.
6. Pay 1 CKB. Receipt shows amount, fee, hash, and `sha256(preimage) = payment hash`.
7. Open with the ransom key; text matches the sender manuscript.

## Proof

- **Basic quest:** [youtube.com/watch?v=WghThQsAn5I](https://www.youtube.com/watch?v=WghThQsAn5I)
- **Advanced quest:** screenshots in [`proof/`](proof/)

## Architecture

| Layer | Role |
| --- | --- |
| `components/` | Parchment UI: stage rail, corridor band, seal/unlock desks, receipt |
| `studio/` | Reducer + `useStudio` engine (rigs, guards, 120s watchdog) |
| `core/` | Domain: keys, packet, settlement, Bottle, identities, units |

Storage keys are `cipherpost:*` so a funded campaign-06 node is never touched.

### Source map

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Renders `<Studio />` |
| `app/globals.css` | Design system (rails, bands, proof chips) |
| `components/studio.tsx` | Page composition |
| `components/desk-card.tsx` | Desk check-in, balance, open corridor |
| `components/exchange.tsx` | Seal / unlock / receipt panels |
| `studio/state.ts` | State shape and reducer |
| `studio/use-studio.ts` | Action engine and route readiness |
| `core/keys.ts` | AES-256-GCM seal/unseal, SHA-256 |
| `core/packet.ts` | `cipherpost/v1` format, invoice, hop hint mapping |
| `core/settlement.ts` | Validate + pay ransom |
| `core/settlement-guards.ts` | Hard vs ambiguous payment failures |
| `core/bottle.ts` | Peer handshake, corridor lifecycle, start retries |
| `core/runtime.ts` | Fiber WASM + Testnet cell-dep patch |
| `core/identities.ts` / `core/session.ts` | Saved desks, Web Locks |
| `core/units.ts` / `core/faucet.ts` / `core/vault-funding.ts` | CKB math, balance, funding gate |

## Proof

## Limits

The preimage proves key ↔ ciphertext binding, not that the manuscript is
true or useful. No refunds. An expired invoice needs a fresh packet.
