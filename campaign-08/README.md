# Campaign 08: Pay to Unlock with Fiber

Advanced quest for Build on CKB Campaign #8. Two browser Fiber nodes on
CKB Testnet: the sender desk encrypts a short manuscript with AES-256-GCM and
reuses the same 32 bytes as the Fiber Invoice `payment_preimage`. The buyer
desk pays 1 CKB through Bottle; settlement reveals the key and only then does
the ciphertext open.

Use case: paid delivery of an encrypted research brief. The sender publishes
the sealed packet (ciphertext + invoice + payment hash). Anyone with Testnet
CKB can buy and read it. No accounts, no API keys.

Built from the official `fiber-encrypted-data-payment` starter
(`https://www.fiber.world/downloads/fiber-encrypted-data-payment.zip`) and the
Fiber browser-payment code in [`../campaign-06`](../campaign-06/README.md).

## What changed from the starter

| Area | Starter | Here |
| --- | --- | --- |
| Brand | Generic pay-to-unlock | Cipherpost: parchment theme, serif/sans/mono, amber seal desk, teal unlock desk |
| Layout | Single page, shared `lib/` helpers | Stage rail + full-width bands; UI split across `components/`, state in `studio/`, domain logic in `core/` |
| Architecture | Flat `lib/` + one 559-line page | `core/` modules, `studio/` reducer + engine hook, thin `app/page.tsx` |
| CKB helpers | Local copies of hex/amount helpers | `core/units.ts` (`readCkb`, `showCkb`, corridor states, funding links) |
| Funding gate | Refuses at exactly 500 CKB | Requires 500 CKB channel plus on-chain tip, shown live under each address |
| Channel open | One `connectPeer` then one `openChannel` | Waits for Bottle's Init message (feature set), then retries handshake-pending failures with a fresh reconnect |
| Feedback | Guard clauses `return` silently | Every guard throws a specific message shown inside the desk that was clicked, plus a route-readiness line, stage rail and a `Working…` state while busy |
| Liquidity card | Static Bottle numbers, truncated hash | Live sender/Bottle corridor balances, full payment hash, audit-hash-via-node button, and a 5 CKB relay push |
| Verification | No way to check the result | Receipt proves `sha256(preimage) = payment hash`, each desk links its corridor funding tx, and the relay has its own node-audit action |
| Liquidity transfer | `0x1dcd65000` (80 CKB) labelled "5 CKB" | `0x1dcd6500` (5 CKB), matching the label and tutorial |
| Lock test | Any thrown error counts as a rejected decryption | Only a `DOMException` named `OperationError` counts; other failures surface |
| Key handling | `decryptResult` accepts any key length | Rejects non-32-byte keys before importing |
| Storage | Starter keys | `cipherpost:*` keys, so a funded campaign-06 node is untouched |
| Tests | Payment guards only | Units, AES-GCM seal/unseal, and settlement guards |

Kept unchanged from the starter because they are the audited parts: the
invoice/hop-hint shape in `core/packet.ts`, the pre-submission rejection list
and attempt persistence in `core/settlement-guards.ts`, the Web Locks node
session in `core/session.ts`, and the Testnet CKB Auth cell-dep patch in
`core/runtime.ts`.

## How to run

Node.js 22.18 or newer.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:3000` in Chrome. The app needs a secure context,
`SharedArrayBuffer`, Web Locks and cross-origin isolation; `next.config.mjs`
supplies the COOP/COEP headers. Use `localhost`/`127.0.0.1` or HTTPS.

Checks:

```sh
npm run check
npm test
npm run build
```

Flow in the running app:

1. Start both desks, fund each `ckt1` address from the Testnet faucet
   (500 CKB corridor plus on-chain tip).
2. Open both 500 CKB corridors to Bottle and wait for `CHANNEL_READY`.
3. Optional: push 5 CKB from the sender desk back to Bottle for inbound room.
4. Seal desk encrypts the manuscript and mints the 1 CKB ransom; copy the
   public packet JSON.
5. Unlock desk pastes the packet, inspects it, probes without the key, and
   sees **Decryption rejected**.
6. Pay the ransom through Bottle. The receipt shows 1 CKB, the fee, and the
   payment hash with `sha256(preimage) = payment hash`.
7. Open with the ransom key: the manuscript matches the sender plaintext.

## Demos

- **Basic demo:** [youtu.be/6ZDsB9fkzBE](https://youtu.be/6ZDsB9fkzBE) — screenshots in [proof/basic/](proof/basic/)
- **Advanced demo:** [youtube.com/watch?v=JO-0Bx1oYIk](https://www.youtube.com/watch?v=JO-0Bx1oYIk) — frames in [proof/advance/](proof/advance/)

See [proof/README.md](proof/README.md) for the capture index and
[proof/reflection.md](proof/reflection.md) for the personal reflection.

## Source map

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Thin entry: renders `<Studio />` |
| `app/layout.tsx` | Cipherpost metadata and shell |
| `app/globals.css` | Parchment design system (rails, bands, panels, proof chips) |
| `components/studio.tsx` | Masthead, hero, stage rail, route line, corridor band, exchange, receipt, opened page |
| `components/desk-card.tsx` | Sender/buyer desk: check-in, on-chain balance, open corridor, funding link |
| `components/exchange.tsx` | Seal desk, unlock desk, ransom receipt ledger |
| `studio/state.ts` | `StudioState` / `StudioAction` / `studioReducer` |
| `studio/use-studio.ts` | Engine hook: rigs, guards, scripts, perform() watchdog, sha256 proof |
| `core/units.ts` | CKB precision, corridor states, peer match, funding tx hash |
| `core/keys.ts` | AES-256-GCM seal/unseal, hex helpers, SHA-256 digest |
| `core/runtime.ts` | Fiber wasm factory + Testnet cell-dep patch |
| `core/faucet.ts` | On-chain capacity via `get_cells_capacity` |
| `core/vault-funding.ts` | 501 CKB funding hint and pre-open gate |
| `core/identities.ts` | Role-scoped identities, `cipherpost:*` snapshot storage |
| `core/session.ts` | One runtime per saved node via Web Locks |
| `core/bottle.ts` | Bottle handshake, corridor open/find, 5 CKB relay helpers |
| `core/packet.ts` | `cipherpost/v1` packet, invoice creation, hop hint, strict parser |
| `core/settlement.ts` | Invoice validation, payment submission, status re-read |
| `core/settlement-guards.ts` | Pre-submission rejections vs. ambiguous failures |

## Limits

The preimage proves the key matches the ciphertext, not that the sender's
report is accurate or useful. There is no refund or dispute path: the buyer
decrypts only after a `Success` payment, and an expired invoice needs a fresh
packet.
