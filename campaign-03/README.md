# Build on CKB Campaign #03

This directory is the complete Campaign #03 submission package for the official
[Build a Simple Lock](https://docs.nervos.org/docs/dapp/simple-lock) tutorial.

## Contents

- [simple-lock](simple-lock/README.md): contract source, frontend, tests,
  deployment metadata, bytecode, and verification scripts
- [proof](proof/README.md): concise result, portable raw RPC evidence, checksums,
  logs, and screenshots
- [submission helper](proof/submission-helper.md): participant-controlled
  publication checklist and personal-reflection prompts

## Verified Result

- Custom hash-lock deployment:
  0x41d09a1fe23ede9267b56226b5fcbc4f063a58698af5428cbe47683bc4aa452a
- 300 CKB deposit:
  0x05e80e7037e24b40d2c1ea9ec8cace6a63ed7f9ed620f64f09e56d46a946cd78
- Wrong preimage: rejected with contract exit code 11
- Correct frontend unlock:
  0x74a97350a32f3c981e49ef38bae4a281fe2e5d908676baa8afd29a59ede43454
- Result: 99 CKB recipient, 200.99999 CKB hash-lock change, 0.00001
  CKB fee

## Reviewer Verification

No local chain is required for the portable checks:

```bash
cd campaign-03/simple-lock
pnpm verify:offline
pnpm verify:integrity
```

Run the full contract, frontend, offline-proof, and integrity suite:

```bash
pnpm verify:submission
```

The shared verifier checks 47 independent invariants across the compiled
bytecode, committed deployment output, transaction hashes, lock scripts,
canonical witness, capacities, fee, spent input, and live outputs.

## Reflection

The campaign requires a personal, non-AI-generated reflection. No submission
reflection is included. The proof package records technical facts and leaves the
final wording to the participant.
