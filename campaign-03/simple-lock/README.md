# Campaign 03: Build a Simple Lock

This project completes the official Nervos
[Build a Simple Lock](https://docs.nervos.org/docs/dapp/simple-lock) tutorial
on a local OffCKB devnet. It contains the custom hash-lock contract, its tests,
deployment artifacts, and a Next.js frontend that funds and unlocks hash-locked
cells.

The imported tutorial source and exact upstream revision are documented in
[UPSTREAM.md](UPSTREAM.md).

## Verified Result

- Network: OffCKB local devnet
- RPC: http://127.0.0.1:28114
- Contract: hash-lock
- Code hash:
  0x5736ca900eed95140d6223f55182a422b7b5410eb772bffc32926e1be47d22e6
- Deployment transaction:
  0x41d09a1fe23ede9267b56226b5fcbc4f063a58698af5428cbe47683bc4aa452a
- Deposit transaction:
  0x05e80e7037e24b40d2c1ea9ec8cace6a63ed7f9ed620f64f09e56d46a946cd78
- Frontend unlock transaction:
  0x74a97350a32f3c981e49ef38bae4a281fe2e5d908676baa8afd29a59ede43454
- Unlock fee: 0.00001 CKB

The concise result is in
[campaign-03-result.json](../proof/campaign-03-result.json). The
[portable RPC evidence](../proof/rpc-evidence.json) lets reviewers
recheck 47 transaction, script, witness, capacity, fee, and live-cell invariants
without access to this machine or its devnet.

## Contract Behavior

The contract reads the lock field of the first input witness as a UTF-8
preimage, hashes it with CKB Blake2b-256, and compares the result with the
32-byte hash in the lock script arguments.

Exit codes are explicit:

| Code | Meaning                                                           |
| ---: | ----------------------------------------------------------------- |
|    0 | The supplied preimage matches                                     |
|   10 | The witness lock/preimage is missing or empty                     |
|   11 | The supplied preimage hashes to a different value                 |
|   12 | The lock script arguments do not contain exactly one 32-byte hash |

## Project Layout

- contracts/hash-lock/src/index.ts: custom lock contract
- tests/hash-lock.mock.test.ts: isolated VM acceptance and rejection cases
- tests/hash-lock.devnet.test.ts: real local-chain deposit and unlock flow
- frontend: devnet transaction workbench
- deployment: generated OffCKB deployment metadata
- dist/hash-lock.bc: compiled contract bytecode
- scripts/verify-campaign-03.mjs: RPC and artifact consistency verifier
- scripts/campaign-03-proof-core.mjs: shared 47-invariant verification core
- scripts/verify-campaign-03-offline.mjs: no-RPC portable evidence verifier
- ../proof: screenshots, logs, and result manifest

## Prerequisites

- Node.js 22
- pnpm 10
- OffCKB 0.4.6
- A running local OffCKB devnet

This proof used RPC port 28114. Set CKB_RPC_URL if your OffCKB instance uses a
different port.

## Reproduce

Install dependencies and build the contract:

```bash
pnpm install
pnpm build
```

Run the contract VM tests:

```bash
pnpm exec jest tests/hash-lock.mock.test.ts --runInBand
```

Deploy to the running devnet:

```bash
CKB_RPC_URL=http://127.0.0.1:28114 pnpm deploy -- --yes
rsync -a deployment/ frontend/deployment/
```

Run the real devnet integration test:

```bash
CKB_RPC_URL=http://127.0.0.1:28114 \
DOTENV_CONFIG_PATH=.env \
pnpm exec jest tests/hash-lock.devnet.test.ts --runInBand
```

Configure and run the frontend:

```bash
cp frontend/.env.example frontend/.env.local
pnpm --filter frontend typecheck
pnpm --filter frontend build
pnpm --filter frontend start --port 3002
```

Then open http://127.0.0.1:3002.

Review the recorded evidence without a running devnet:

```bash
pnpm verify:offline
pnpm verify:integrity
```

Refresh the portable evidence from a running devnet:

```bash
CKB_RPC_URL=http://127.0.0.1:28114 pnpm verify:online
```

Run the complete reviewer check:

```bash
pnpm verify:submission
```

The shared verification core checks 47 independent invariants. It fails for a
bytecode/deployment mismatch, altered transaction hash, incorrect lock script,
noncanonical witness, wrong capacity or fee, unspent deposit, dead result cell,
or inconsistency between the concise result and portable RPC evidence.

## Scope

These transaction hashes belong to a private local OffCKB devnet. They are
verifiable through the local RPC and included evidence, but they will not appear
on a public CKB explorer.

The campaign asks for a personal reflection and specifically discourages
AI-generated reflections. This repository therefore records technical facts and
leaves the submitted reflection to the participant.
