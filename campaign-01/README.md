# Build on CKB Campaign #01

Campaign #01 uses OffCKB local devnet to build, deploy, and execute a CKB
JavaScript VM contract. The generated hello-world example was upgraded into a
small capacity guard with reproducible proof artifacts.

## Package

- [Contract workspace](ckb-campaign-01/README.md)
- [Contract source](ckb-campaign-01/contracts/hello-ckb/src/index.ts)
- [Proof index](proof/README.md)
- [Proof screenshots](proof/screenshots)
- [Raw command logs](proof/logs)

## Capacity Guard

The contract enforces four rules for its protected script group:

- Exactly one protected output cell must exist.
- Output data must begin with `CKB_CAMPAIGN_VAULT_V1`.
- The protected output must retain at least `100 CKB` capacity.
- A later update cannot reduce capacity below the protected input capacity.

## Verified Devnet Result

- Network: local OffCKB devnet
- OffCKB CLI: `0.4.6`
- RPC: `http://127.0.0.1:8114`
- Deployment status: `committed`
- Deployment transaction:
  `0x0ee7a675070b6ae81352fde871668fad121861762e3bed40fc622902265417d8`
- Deployed code hash:
  `0xf598c2e0c24305af339c575c38c84da9e130fae09572ee7fe4d7651f874d6a47`
- Protected vault status: `committed`
- Protected vault transaction:
  `0x3be9b31a810a1c5255eef321f8a6fab575ed02caced6e0396cef36f5cfc722a6`
- Protected marker data:
  `0x434b425f43414d504149474e5f5641554c545f5631`

Key artifacts:

- [Deployed bytecode](ckb-campaign-01/dist/hello-ckb.bc)
- [Deployment manifest](ckb-campaign-01/deployment/scripts.json)
- [Deployment RPC evidence](proof/devnet-deployment-final.json)
- [Protected vault RPC evidence](proof/devnet-vault-final.json)

## Screenshot Proof

1. [OffCKB setup and local devnet](proof/screenshots/01-setup-devnet.png)
2. [Capacity-guard bytecode build](proof/screenshots/02-build-capacity-guard.png)
3. [Mock CKB VM execution](proof/screenshots/03-mock-execution.png)
4. [Devnet deployment](proof/screenshots/04-deploy-devnet.png)
5. [Protected vault transaction](proof/screenshots/05-devnet-vault-transaction.png)

## Reproduce

From the repository root:

```bash
cd campaign-01/ckb-campaign-01
npm install
npm run build
npm run test:only -- hello-ckb.mock.test.ts
npm run deploy -- --yes
npm run test:only -- hello-ckb.devnet.test.ts
```

Start the local chain with `offckb node` before deployment or devnet tests.

## Devnet Scope

OffCKB devnet is a private local CKB chain. Its transactions are real for the
local node but are not broadcast to public CKB networks. The proof therefore
comes from local RPC responses, deployment artifacts, logs, and screenshots.

## Reflection Reminder

The campaign asks participants to avoid AI-generated reflections. Use the
[execution notes](proof/reflection-notes.md) and proof artifacts to write the
final reflection in your own words.
