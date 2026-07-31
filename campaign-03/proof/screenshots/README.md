# Screenshot Provenance

These screenshots were captured from the local Campaign 03 execution on
2026-07-30. Terminal images show the corresponding raw logs, and browser images
show the production Next.js frontend connected to the OffCKB devnet at
http://127.0.0.1:28114.

## Evidence Index

### 01 - OffCKB Environment

[Open image](01-offckb-environment.png)

Shows the tool versions, RPC URL, active local chain tip, and successful
environment check.

### 02 - Contract Build and Tests

[Open image](02-contract-build-and-tests.png)

Shows the hash-lock JavaScript contract compiling to CKB bytecode and the four
isolated VM cases passing.

### 03 - Deployment and RPC Summary

[Open image](03-deployment-and-rpc-summary.png)

Shows the committed contract deployment, matching bytecode/deployed code hashes,
deposit out point, committed unlock, live result cells, and successful verifier.

### 04 - Funded Hash-Lock

[Open image](04-frontend-funded-hash-lock.png)

Shows the production frontend after the 300 CKB deposit was committed and the
locked cell became available to unlock.

### 05 - Wrong Preimage Rejected

[Open image](05-wrong-preimage-rejected.png)

Shows the frontend surfacing the node rejection for wrong-preimage with contract
exit code 11.

### 06 - Correct Preimage Unlock

[Open image](06-correct-preimage-unlock.png)

Shows the correct preimage flow committed under transaction
0x74a97350a32f3c981e49ef38bae4a281fe2e5d908676baa8afd29a59ede43454.

### 07 - Mobile Final State

[Open image](07-mobile-final-state.png)

Shows the final committed state at a 390 by 844 mobile viewport without
horizontal overflow. The browser run reported no console errors.
