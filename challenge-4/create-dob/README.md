# Create a DOB — Sub-project

This directory contains the source code for the Create a DOB tutorial dApp.

## Scripts

| Script | Description |
|--------|-------------|
| `create-dob.ts` | Creates a DOB on devnet, verifies integrity |
| `testnet-dob.ts` | Creates a DOB on testnet |
| `decode-testnet.ts` | Verifies round-trip integrity from testnet |

## Running

```bash
# Devnet (start offckb node first)
offckb node
NETWORK=devnet ./node_modules/.bin/tsx create-dob.ts

# Testnet
NETWORK=testnet ./node_modules/.bin/tsx testnet-dob.ts

# Frontend
NETWORK=devnet npm start
# Open http://localhost:1234
```

## Files

| File | Description |
|------|-------------|
| `sample-dob-image.jpg` | Original input image |
| `decoded-dob-image.jpg` | Decoded from devnet (should match original) |
| `decoded-dob-testnet.jpg` | Decoded from testnet (should match original) |
