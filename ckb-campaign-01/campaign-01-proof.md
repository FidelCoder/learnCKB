# Build on CKB: Campaign #01 Proof Notes

Date: 2026-06-03

## Environment

- Workspace: `/home/core/Desktop/CKB/learnCKB/ckb-campaign-01`
- OffCKB CLI: `0.4.6`
- CKB devnet binary/config: OffCKB default `0.205.0`
- Local devnet RPC: `http://127.0.0.1:8114`
- Real debugger used for bytecode build: `/home/core/.cargo/bin/ckb-debugger` (`ckb-debugger 1.1.1`)

## Contract

The generated `hello-ckb` template was upgraded into a capacity-guard contract.

It validates that a protected output cell:

- Exists as exactly one output in the script group.
- Stores data beginning with `CKB_CAMPAIGN_VAULT_V1`.
- Has at least `100 CKB` capacity.
- Does not shrink below the input capacity when updating an existing protected cell.

## Final Devnet Deployment

- Network: local OffCKB devnet
- Contract bytecode: `dist/hello-ckb.bc`
- Deploy tx hash: `0x0ee7a675070b6ae81352fde871668fad121861762e3bed40fc622902265417d8`
- Deploy tx status from local RPC: `committed`
- Code hash / data hash: `0xf598c2e0c24305af339c575c38c84da9e130fae09572ee7fe4d7651f874d6a47`
- Hash type: `data2`

## Final Devnet Execution

A devnet test transaction created a protected vault cell using the deployed contract.

- Protected vault tx hash: `0x3be9b31a810a1c5255eef321f8a6fab575ed02caced6e0396cef36f5cfc722a6`
- Tx status from local RPC: `committed`
- Protected marker data: `0x434b425f43414d504149474e5f5641554c545f5631`

## Proof Files

- `proof/screenshots/01-setup-devnet.png`
- `proof/screenshots/02-build-capacity-guard.png`
- `proof/screenshots/03-mock-execution.png`
- `proof/screenshots/04-deploy-devnet.png`
- `proof/screenshots/05-devnet-vault-transaction.png`
- `proof/devnet-deployment-final.json`
- `proof/devnet-vault-final.json`
- `ckb-campaign-01/deployment/scripts.json`
- `ckb-campaign-01/deployment/devnet/hello-ckb.bc/migrations/2026-06-03-020224.json`

## Reflection Notes To Rewrite Personally

Do not submit this section verbatim. The campaign asks for a personal reflection, so use these as memory prompts and write it in your own voice.

- I learned that OffCKB devnet is a real local chain, but not the public testnet. That is why devnet txs are confirmed by local RPC but do not appear on public explorers.
- The first deployment was too simple, so I changed the generated template into a capacity-guard contract that reads grouped input/output cells and validates capacity and data.
- The most useful debugging moment was the occupied-capacity failure: I tried creating a protected cell with 120 CKB, but CKB rejected it because the output needed about 182 CKB due to the script/type metadata. Increasing the example protected cell to 300 CKB fixed it.
- I also learned that CKB contracts are deployed as cells and then referenced through `cellDeps`; the deployed contract's out point is written into `deployment/scripts.json`.
