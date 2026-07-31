# Campaign 03 Submission Helper

This is the participant handoff checklist for the published Campaign 03 proof
package. The personal reflection still must be written by the participant.

## Proof Links

The main proof link is:

https://github.com/FidelCoder/learnCKB/tree/main/campaign-03/proof

Direct proof files:

- Result manifest:
  https://github.com/FidelCoder/learnCKB/blob/main/campaign-03/proof/campaign-03-result.json
- Portable raw RPC evidence:
  https://github.com/FidelCoder/learnCKB/blob/main/campaign-03/proof/rpc-evidence.json
- Artifact integrity manifest:
  https://github.com/FidelCoder/learnCKB/blob/main/campaign-03/proof/SHA256SUMS
- Deployment screenshot:
  https://github.com/FidelCoder/learnCKB/blob/main/campaign-03/proof/screenshots/03-deployment-and-rpc-summary.png
- Funded frontend:
  https://github.com/FidelCoder/learnCKB/blob/main/campaign-03/proof/screenshots/04-frontend-funded-hash-lock.png
- Wrong-preimage rejection:
  https://github.com/FidelCoder/learnCKB/blob/main/campaign-03/proof/screenshots/05-wrong-preimage-rejected.png
- Successful frontend unlock:
  https://github.com/FidelCoder/learnCKB/blob/main/campaign-03/proof/screenshots/06-correct-preimage-unlock.png

After publication, open these URLs and confirm GitHub renders each artifact.

## Verified Facts

- Tutorial: Build a Simple Lock
- Network: OffCKB local devnet
- Deployed code hash:
  0x5736ca900eed95140d6223f55182a422b7b5410eb772bffc32926e1be47d22e6
- Deployment transaction:
  0x41d09a1fe23ede9267b56226b5fcbc4f063a58698af5428cbe47683bc4aa452a
- 300 CKB deposit transaction:
  0x05e80e7037e24b40d2c1ea9ec8cace6a63ed7f9ed620f64f09e56d46a946cd78
- Frontend unlock transaction:
  0x74a97350a32f3c981e49ef38bae4a281fe2e5d908676baa8afd29a59ede43454
- Wrong-preimage contract error: 11
- Correct unlock recipient: 99 CKB
- Remaining locked change: 200.99999 CKB
- Transaction fee: 0.00001 CKB
- Portable verification: 47 independent invariants, no RPC required

## Participant-Written Reflection

Write this section personally before submitting. Useful prompts from the actual
execution are:

- What did the rejected wrong-preimage attempt make clear about lock scripts?
- The official tutorial identifies miner front-running: how would a miner use a
  preimage exposed in the pending transaction's witness?
- The successful unlock left 200.99999 CKB under the same hash lock. Once the
  preimage is on-chain, why is that remaining balance no longer secret?
- Which mitigation makes most sense to you: owner-signature authorization,
  sending all change to a fresh/safe lock, a high-entropy one-time secret, or a
  timeout/recovery path? Explain your own reasoning.
- Why did changing only the witness leave the raw transaction hash unchanged?
- What part of OffCKB, cell collection, witness construction, or fee/change
  handling was genuinely new to you?
- What did you personally debug, misunderstand at first, or verify twice?

Do not copy generated prose into the reflection. Use the prompts only to recall
and explain your own observations.

## Before Submitting

- Confirm eligibility as a new CKB builder.
- Confirm membership in the Build on CKB Telegram group.
- Run pnpm verify:offline and pnpm verify:integrity from
  campaign-03/simple-lock.
- Review every screenshot for information you do not want public.
- Confirm the published commit contains only the intended Campaign 03 files.
- Open the GitHub proof links and verify they render.
- Lead with the proof index instead of pasting every raw artifact into CKBoost.
- Write the reflection in your own words.
- Submit before the campaign deadline shown by CKBoost.

## Important Scope Note

The transactions are committed on a private OffCKB local devnet. Do not attach
mainnet or Pudge explorer links; public explorers do not know this local chain.
The included RPC summary, artifacts, screenshots, and raw logs are the proof.
