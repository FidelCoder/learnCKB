# Campaign 03 Proof

This directory contains the evidence for the Build on CKB Campaign #03
submission: a deployed custom lock script and a frontend transaction that
successfully unlocks tokens from it.

All transactions were executed on an OffCKB local devnet at
http://127.0.0.1:28114. The authoritative, machine-readable summary is
[campaign-03-result.json](campaign-03-result.json). Reviewers without this
private chain can run the offline verifier against
[rpc-evidence.json](rpc-evidence.json), a raw JSON-RPC snapshot whose SHA-256 is
bound into the concise result. The same verification core checks 47 independent
invariants online and offline.

## Requirements Map

| Campaign requirement            | Evidence                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Deploy a custom lock script     | Deployment transaction, generated deployment metadata, bytecode/code-hash verification, and screenshots 01-03 |
| Deploy a dApp frontend          | Production build log plus desktop and mobile Playwright checks                                                |
| Transfer tokens into the lock   | 300 CKB deposit transaction and screenshot 04                                                                 |
| Unlock tokens from the lock     | Wrong-preimage rejection, correct-preimage committed transaction, and screenshots 05-07                       |
| Share an interesting reflection | Intentionally left for the participant to write personally                                                    |

## Deployment

- Contract: hash-lock
- Source:
  [index.ts](../simple-lock/contracts/hash-lock/src/index.ts)
- Compiled bytecode:
  [hash-lock.bc](../simple-lock/dist/hash-lock.bc)
- Deployment metadata:
  [scripts.json](../simple-lock/deployment/scripts.json)
- Imported official example revision:
  7a5ceedb62004c2aacbbdad094f3f0d32714d567
- Bytecode SHA-256:
  635c047758c258f0dadbfdf4e5cb0258afa13f2d1d77787aba68285100e9320e
- Bytecode CKB hash:
  0x5736ca900eed95140d6223f55182a422b7b5410eb772bffc32926e1be47d22e6
- Deployed code hash:
  0x5736ca900eed95140d6223f55182a422b7b5410eb772bffc32926e1be47d22e6
- Deployment transaction:
  0x41d09a1fe23ede9267b56226b5fcbc4f063a58698af5428cbe47683bc4aa452a
- Status: committed at block 0x29ee

The verifier requires the compiled bytecode to exactly match deployment output
0 of the committed transaction. It also independently computes its CKB hash and
requires that hash to equal the deployed code hash.

## Deposit

- UTF-8 preimage: FidelCoder Campaign 03
- CKB Blake2b-256 hash:
  0xe6e369661a21a2dbdec58ae00a0575c196707a840e93543064fb68e7d024ab19
- Locked capacity: 300 CKB
- Deposit transaction:
  0x05e80e7037e24b40d2c1ea9ec8cace6a63ed7f9ed620f64f09e56d46a946cd78
- Output index: 0
- Status: committed at block 0x2a67
- Hash-lock address:
  ckt1qzkymvxscq5t5rtnmmy7uhn28sxf3lxle2y4gq4r9pwksr5kfh95vqgqqptndj5spmke29qdvg3l25vz5s3t0d2pp6mh90lux2fxuxly053wvp8xud5kvx3p5tdaa3v2uq9q2awpjec84pqwjd2rqe8mdrnaqf9try7zkelt

## Unlock

The production frontend first submitted the same transaction with
wrong-preimage. The node rejected it with the contract's mismatch exit code 11,
and the UI exposed the rejection without treating it as a committed
transaction.

It then submitted the transaction with the correct preimage:

- Unlock transaction:
  0x74a97350a32f3c981e49ef38bae4a281fe2e5d908676baa8afd29a59ede43454
- Status: committed at block 0x2a7e
- Input: deposit transaction output 0
- Recipient output: 99 CKB, live
- Hash-lock change output: 200.99999 CKB, live
- Fee: 0.00001 CKB
- Witness contains the exact UTF-8 preimage: yes

The rejected and accepted attempts share one raw transaction hash because their
raw transaction fields were identical and only the witness changed. CKB
witnesses are outside RawTransaction, so changing a witness does not change
that raw transaction hash.

After the unlock, the original 300 CKB deposit output reports unknown rather
than live, while both outputs created by the unlock report live. The unlock
input directly references the original deposit out point.

## Screenshot Proof

1. [OffCKB environment](screenshots/01-offckb-environment.png)
2. [Contract build and tests](screenshots/02-contract-build-and-tests.png)
3. [Deployment and RPC verification](screenshots/03-deployment-and-rpc-summary.png)
4. [Funded hash-lock in the frontend](screenshots/04-frontend-funded-hash-lock.png)
5. [Wrong preimage rejected](screenshots/05-wrong-preimage-rejected.png)
6. [Correct preimage unlock committed](screenshots/06-correct-preimage-unlock.png)
7. [Mobile final state](screenshots/07-mobile-final-state.png)

Screenshot provenance and the claim supported by each image are documented in
[screenshots/README.md](screenshots/README.md).

## Raw Logs

1. [Environment versions and RPC](logs/01-environment.log)
2. [Contract build](logs/02-contract-build.log)
3. [Mock VM tests](logs/03-mock-tests.log)
4. [Frontend typecheck](logs/04-frontend-typecheck.log)
5. [Frontend production build](logs/05-frontend-production-build.log)
6. [RPC proof verification](logs/06-rpc-proof-summary.log)
7. [Portable verification with an unusable RPC URL](logs/07-portable-offline-verification.log)

Each command log records its final exit code. The proof summary was generated
from fresh RPC queries, not copied from the browser.

## Portable Evidence

[rpc-evidence.json](rpc-evidence.json) preserves the raw get_transaction and
get_live_cell responses for the deployment, deposit, and unlock. It includes the
complete committed deployment output data, transaction witnesses, cell locks,
capacities, statuses, and live-cell responses.

The offline verifier deliberately makes no RPC call:

```bash
cd campaign-03/simple-lock
CKB_RPC_URL=http://127.0.0.1:1 pnpm verify:offline
pnpm verify:integrity
```

It recomputes the bytecode SHA-256 and CKB hash, validates all 47 invariants,
and confirms the portable evidence hash recorded by the concise result.
[SHA256SUMS](SHA256SUMS) covers the bytecode, evidence, proof documents, raw
logs, and screenshots.

## Contract Tests

The isolated VM suite covers four outcomes:

| Case                          | Expected exit code |
| ----------------------------- | -----------------: |
| Correct preimage              |                  0 |
| Incorrect preimage            |                 11 |
| Empty witness lock            |                 10 |
| Missing 32-byte hash argument |                 12 |

The devnet integration test also created and committed a separate lock/unlock
pair:

- Lock:
  0xd96f5e83dce22333523f842c359da304817014bbfa1a186e67cdf0c8eda6ea59
- Unlock:
  0x709620e8bcaa4924dc99b925aa8bf21b7ebcfc599c0fe798953c1012a6e44526

## Reproduce Online Verification

With the same OffCKB devnet running:

```bash
cd campaign-03/simple-lock
CKB_RPC_URL=http://127.0.0.1:28114 pnpm verify:online
```

The shared online/offline verification core checks:

- recorded transaction hashes match the raw transaction bodies
- compiled bytecode CKB hash equals deployed code hash
- compiled bytecode exactly matches the committed deployment output data
- deployment, deposit, and unlock transactions are committed
- decoded hash-lock and recipient addresses match their output lock scripts
- unlock has exactly one input and spends deposit output 0
- witness is the canonical WitnessArgs encoding of the exact UTF-8 preimage
- recipient and hash-lock change capacities are exact
- the fee recomputes to exactly 1000 shannons
- the deposit is spent and both resulting outputs are live
- live-cell capacities and locks match the committed unlock outputs
- concise result, portable evidence, and verification check lists agree

For a complete reviewer run, including contract build, VM tests, frontend
typecheck and production build, offline proof, and artifact integrity:

```bash
cd campaign-03/simple-lock
pnpm verify:submission
```

## Network Scope

This is a private local devnet proof. The transaction hashes are meaningful to
the included OffCKB chain and its RPC, not to mainnet or Pudge testnet, so they
will not resolve on a public explorer.

## Reflection Boundary

The campaign explicitly asks participants to avoid AI-generated reflections.
No reflection has been written here. The technical record above is intended to
help the participant recall what they personally observed, including the
wrong-preimage failure and the distinction between a raw transaction and its
witnesses.
