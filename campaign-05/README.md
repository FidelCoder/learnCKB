# Build on CKB Campaign #05 — Create a Fungible Token

This package completes the official [Create a Fungible Token](https://docs.nervos.org/docs/dapp/create-token) tutorial with the upstream xUDT dApp and a reproducible local OffCKB proof.

## What was completed

- Ran the browser dApp locally at `http://localhost:1234`.
- Issued a custom xUDT with amount `1000`.
- Queried the token cells using the issuer Lock Script Hash.
- Transferred `250` tokens by replacing the issuer Lock Script with a second devnet account's Lock Script.
- Verified the remaining `750` token change stayed under the issuer Lock Script.

The implementation is in [`xudt/`](xudt/). It is based on the official tutorial example and uses CCC with the OffCKB devnet xUDT system script. The proof runner is [`proof/run-campaign-05.mjs`](proof/run-campaign-05.mjs), and its output is recorded in [`proof/logs/devnet-run.log`](proof/logs/devnet-run.log).

## Reproduce locally

From this directory, start the local chain in one terminal:

```bash
offckb node
```

In a second terminal, install and validate the dApp:

```bash
cd xudt
npm install
npm run lint
npm run build
NETWORK=devnet npm start
```

The Parcel server should report `http://localhost:1234`. The devnet proof runner accepts the issuer key and receiver address through environment variables so private keys are not stored in the repository:

```bash
cd ..
ISSUER_PRIVKEY=0x... \
RECEIVER_ADDRESS=ckt1... \
ISSUE_AMOUNT=1000 \
TRANSFER_AMOUNT=250 \
node proof/run-campaign-05.mjs
```

Use `offckb accounts` to obtain test-only local accounts. Never reuse those keys on a public network.

## Local proof

The devnet issue transaction was `0x9b5ff4d33e0e9de3857d3a1c5708e95d59c512f50879c14eb1185aa93db846f8`.

The issuer Lock Script Hash was `0x7de82d61a7eb2ec82b0dc653e558ba120efcbfbb44dac87c12972d05bf250653`. The xUDT args are that hash followed by `00000000`:

```text
0x7de82d61a7eb2ec82b0dc653e558ba120efcbfbb44dac87c12972d05bf25065300000000
```

The transfer transaction was `0xb2c9904d26446d20862a3c059f7bfd6f19687d4b2be94da6265e8621c5ce7ada`. Its outputs contain `250` tokens under the receiver Lock Script and `750` tokens returned to the issuer. These hashes belong to the local OffCKB chain and will not appear on public explorers.

Detailed evidence is in [`proof/README.md`](proof/README.md). The reflection file contains factual prompts only; the campaign asks the participant to write the final reflection in their own words.
