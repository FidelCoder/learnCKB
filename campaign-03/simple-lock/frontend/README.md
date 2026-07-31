# Hash-Lock Frontend

This Next.js frontend is the transaction workbench for Build on CKB Campaign
#03. It connects to an OffCKB local devnet, derives a hash-lock address from a
UTF-8 preimage, shows its indexed live capacity, and builds a witness-backed
unlock transaction.

## Configuration

Create an ignored local configuration from the public example:

```bash
cp .env.example .env.local
```

| Variable                     | Purpose                            |
| ---------------------------- | ---------------------------------- |
| NEXT_PUBLIC_NETWORK          | Use devnet for this campaign proof |
| NEXT_PUBLIC_CKB_RPC_URL      | OffCKB JSON-RPC endpoint           |
| NEXT_PUBLIC_DEFAULT_RECEIVER | Optional default recipient address |

The checked-in example contains no private key. This frontend does not need a
wallet secret because it spends only cells protected by the custom preimage
lock.

## Run

From the Campaign 03 project root:

```bash
pnpm --filter frontend typecheck
pnpm --filter frontend build
pnpm --filter frontend start --port 3002
```

Open http://127.0.0.1:3002.

For development:

```bash
pnpm --filter frontend dev --port 3002
```

## Transaction Flow

1. Enter the same preimage used to create the locked cell.
2. Confirm the derived CKB Blake2b-256 hash and hash-lock address.
3. Wait for the live-cell balance to load from the local indexer.
4. Enter a receiver, amount, and witness preimage.
5. Submit and wait until the node reports committed.

The builder:

- collects hash-locked inputs through a read-only signer
- adds the deployed hash-lock and CKB-JS-VM cell dependencies
- checks recipient and change cell minimum capacities
- reserves a fixed 1000-shannon fee
- serializes the preimage into the first WitnessArgs lock field
- polls transaction state until committed, rejected, or timed out

## Proof Scope

The verified frontend flow first rejected wrong-preimage with contract error 11,
then committed the correct-preimage unlock transaction:

0x74a97350a32f3c981e49ef38bae4a281fe2e5d908676baa8afd29a59ede43454

Full screenshots, logs, and RPC evidence are in
[Campaign 03 proof](../../proof/README.md).
