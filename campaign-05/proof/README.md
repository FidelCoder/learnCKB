# Campaign 05 Proof

This folder contains local evidence for the Create a Fungible Token quest.

## DApp running

The upstream xUDT dApp was served with:

```text
NETWORK=devnet npm start
```

Parcel reported `Server running at http://localhost:1234`, and a local HTTP request returned `200 OK` for the dApp page. A browser rendering is captured in [`screenshots/dapp-running.png`](screenshots/dapp-running.png).

## Devnet transactions

The proof runner waits for each transaction to commit before querying the next state.

| Action | Evidence |
| --- | --- |
| Issue `1000` tokens | `0x9b5ff4d33e0e9de3857d3a1c5708e95d59c512f50879c14eb1185aa93db846f8` |
| Query by issuer Lock Script Hash | `0x7de82d61a7eb2ec82b0dc653e558ba120efcbfbb44dac87c12972d05bf250653` |
| Derived xUDT args | `0x7de82d61a7eb2ec82b0dc653e558ba120efcbfbb44dac87c12972d05bf25065300000000` |
| Transfer `250` tokens | `0xb2c9904d26446d20862a3c059f7bfd6f19687d4b2be94da6265e8621c5ce7ada` |
| Issuer change | `750` tokens |

The transfer output uses the second pre-funded devnet account's Lock Script args `0x758d311c8483e0602dfad7b69d9053e3f917457d`, proving that token ownership moved by replacing the Lock Script while keeping the xUDT Type Script unchanged.

## Files

- [`run-campaign-05.mjs`](run-campaign-05.mjs) — proof runner, with no private keys embedded.
- [`campaign-05-result.json`](campaign-05-result.json) — machine-readable summary of the clean run.
- [`logs/devnet-run.log`](logs/devnet-run.log) — account derivation, issue, query, transfer, and verification output.
- [`screenshots/dapp-running.png`](screenshots/dapp-running.png) — browser rendering of the running dApp.
- [`reflection-notes.md`](reflection-notes.md) — factual prompts for the participant's own reflection.
