# learnCKB

Build on CKB Campaign #01 submission.

This repo contains an OffCKB local devnet setup, a deployed CKB JavaScript VM test contract, and proof artifacts for the campaign quest.

## What was deployed

The original generated hello-world contract was upgraded into a small capacity-guard contract:

- Requires exactly one protected output cell in the script group.
- Requires output data to start with the marker `CKB_CAMPAIGN_VAULT_V1`.
- Requires the protected output to keep at least `100 CKB` capacity.
- If the protected cell is updated later, it rejects shrinking the protected capacity.

Source: [ckb-campaign-01/contracts/hello-ckb/src/index.ts](ckb-campaign-01/contracts/hello-ckb/src/index.ts)

## Final devnet proof

- Network: local OffCKB devnet
- OffCKB CLI: `0.4.6`
- Local devnet RPC: `http://127.0.0.1:8114`
- Deployed bytecode: [ckb-campaign-01/dist/hello-ckb.bc](ckb-campaign-01/dist/hello-ckb.bc)
- Deployment tx: `0x0ee7a675070b6ae81352fde871668fad121861762e3bed40fc622902265417d8`
- Deployment status: `committed`
- Deployed code hash: `0xf598c2e0c24305af339c575c38c84da9e130fae09572ee7fe4d7651f874d6a47`
- Protected vault tx: `0x3be9b31a810a1c5255eef321f8a6fab575ed02caced6e0396cef36f5cfc722a6`
- Protected vault status: `committed`
- Marker data in protected cell: `0x434b425f43414d504149474e5f5641554c545f5631`

Deployment artifact: [ckb-campaign-01/deployment/scripts.json](ckb-campaign-01/deployment/scripts.json)

Final RPC proof files:

- [proof/devnet-deployment-final.json](proof/devnet-deployment-final.json)
- [proof/devnet-vault-final.json](proof/devnet-vault-final.json)

## Screenshot proof

- [01 - OffCKB setup and local devnet running](proof/screenshots/01-setup-devnet.png)
- [02 - Contract build to bytecode](proof/screenshots/02-build-capacity-guard.png)
- [03 - Mock CKB VM execution test](proof/screenshots/03-mock-execution.png)
- [04 - Devnet contract deployment](proof/screenshots/04-deploy-devnet.png)
- [05 - Protected vault transaction on devnet](proof/screenshots/05-devnet-vault-transaction.png)

The raw command logs used to generate those screenshots are in [proof/logs](proof/logs).

## Commands used

```bash
npm install -g @offckb/cli
offckb node
offckb create ckb-campaign-01 -m npm -l typescript -c hello-ckb --no-interactive --no-install --no-git
cd ckb-campaign-01
npm install
npm run build
npm run test:only -- hello-ckb.mock.test.ts
npm run deploy -- --yes
npm run test:only -- hello-ckb.devnet.test.ts
```

## Devnet vs testnet

OffCKB devnet is a private local CKB chain running on this machine. Its transactions are real for this local node, but they are not broadcast to public CKB networks. That is why the deployment tx does not appear on mainnet or Pudge/testnet explorers.

Testnet/Pudge is a shared public test chain. Transactions sent there can be searched on the public explorer at https://pudge.explorer.nervos.org/.

For local devnet, proof comes from local RPC output, deployment artifacts, logs, and screenshots.

## Reflection reminder

The campaign asks participants to avoid AI-generated reflections. Use the proof artifacts here to write the final reflection in your own words.

## Build on CKB Campaign #02

Campaign #02 completes the official [Store Data on Cell](https://docs.nervos.org/docs/dapp/store-data-on-cell) tutorial on local OffCKB devnet.

Proof folder: [campaign-02-proof](campaign-02-proof/README.md)

- Transaction hash: `0xf4c4cc0780fc107638391c51770a89b96f0b9cba38fc35d700d6e9ff174070f8`
- Out point: `0xf4c4cc0780fc107638391c51770a89b96f0b9cba38fc35d700d6e9ff174070f8:0x0`
- Live cell status: `live`
- Stored message decoded from cell data: `FidelCoder Campaign 02: I stored this sentence as cell data, then read it back from a live cell.`

The tutorial script is in [ckb-campaign-01/campaign-02-store-data/store-data-on-cell.mjs](ckb-campaign-01/campaign-02-store-data/store-data-on-cell.mjs).

## Build on CKB Campaign #03

Campaign #03 completes the official
[Build a Simple Lock](https://docs.nervos.org/docs/dapp/simple-lock) tutorial
with a custom hash-lock contract and a production-built frontend for depositing
and unlocking CKB.

Campaign package: [campaign-03](campaign-03/README.md)

Implementation: [campaign-03/simple-lock](campaign-03/simple-lock/README.md)

Proof: [campaign-03/proof](campaign-03/proof/README.md)

- Network: OffCKB local devnet
- Deployed code hash:
  `0x5736ca900eed95140d6223f55182a422b7b5410eb772bffc32926e1be47d22e6`
- Deployment transaction:
  `0x41d09a1fe23ede9267b56226b5fcbc4f063a58698af5428cbe47683bc4aa452a`
- 300 CKB deposit transaction:
  `0x05e80e7037e24b40d2c1ea9ec8cace6a63ed7f9ed620f64f09e56d46a946cd78`
- Frontend unlock transaction:
  `0x74a97350a32f3c981e49ef38bae4a281fe2e5d908676baa8afd29a59ede43454`
- Wrong-preimage attempt: rejected by the custom contract with exit code 11
- Correct unlock: 99 CKB to the recipient, 200.99999 CKB in hash-lock
  change, and a 0.00001 CKB fee
- Portable proof: [raw RPC evidence](campaign-03/proof/rpc-evidence.json) plus
  one shared verifier that checks 47 transaction, bytecode, witness, capacity,
  fee, address, and live-cell invariants without requiring the private devnet

The campaign reflection is intentionally not generated here. The participant
must write it from their own experience before submitting.
