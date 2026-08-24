# Build on CKB Challenge #4 — Create a DOB

This directory is the complete Challenge #4 submission package for the official
[Create a DOB](https://docs.nervos.org/docs/dapp/create-dob) tutorial.

## 🔗 Explorer Link

**View the on-chain DOB on CKB Testnet:**
https://testnet.explorer.nervos.org/transaction/0x54787a0748e53554bf62fadf1439b11688f1860a22ea4b6791a135d0cfee5837

## What I Built

A dApp that converts an image file into an immutable on-chain Digital Object
(DOB) using the Spore SDK, then renders the image back from the blockchain data.

## Completed Requirements

| Requirement | Status | Details |
|------------|--------|--------|
| Deploy on-chain DOB with image via Spore-SDK | ✅ | Devnet + Testnet transactions |
| Render image in browser from DOB | ✅ | Round-trip integrity verified (338 bytes → 338 bytes, SHA-256 match) |
| Deploy app to testnet | ✅ | [Testnet explorer](https://testnet.explorer.nervos.org/transaction/0x54787a0748e53554bf62fadf1439b11688f1860a22ea4b6791a135d0cfee5837) |

## Screenshots

Screenshots and decoded images are in the `create-dob/` directory:

| File | Description |
|------|-------------|
| [`create-dob/sample-dob-image.jpg`](create-dob/sample-dob-image.jpg) | Original input image (338 bytes) |
| [`create-dob/decoded-dob-image.jpg`](create-dob/decoded-dob-image.jpg) | Decoded from devnet chain (338 bytes) |
| [`create-dob/decoded-dob-testnet.jpg`](create-dob/decoded-dob-testnet.jpg) | Decoded from testnet chain (338 bytes) |

## Verified Results

| Network | Transaction | Spore ID | Integrity |
|---------|-------------|----------|-----------|
| Testnet | [`0x5478...`](https://testnet.explorer.nervos.org/transaction/0x54787a0748e53554bf62fadf1439b11688f1860a22ea4b6791a135d0cfee5837) | `0xf6db...ca4f` | ✅ PASS |
| Devnet | `0xb567...bb4a2` | `0x470d...e3d` | ✅ PASS |

## Contents

- [create-dob](create-dob/README.md): project source, scripts, frontend, sample image
- [proof](proof/README.md): verifiable result, RPC evidence, and screenshots

## Project Structure

```
challenge-4/
├── README.md                    # This file
├── proof/
│   └── README.md                # Proof documentation
├── create-dob/                  # Tutorial dApp
│   ├── create-dob.ts            # Devnet DOB creation script
│   ├── testnet-dob.ts           # Testnet DOB creation script
│   ├── lib.ts                   # Core Spore SDK functions
│   ├── helper.ts                # Wallet and utility functions
│   ├── ccc-client.ts            # CKB client configuration
│   ├── spore-config.ts          # Spore protocol configuration
│   ├── index.tsx                # React frontend
│   ├── index.html               # HTML entry point
│   ├── package.json             # Dependencies
│   ├── tsconfig.json            # TypeScript config
│   ├── system-scripts.json      # System script definitions
│   ├── sample-dob-image.jpg     # Input image
│   ├── decoded-dob-image.jpg    # Decoded from devnet
│   └── decoded-dob-testnet.jpg  # Decoded from testnet
```

## How It Works

### 1. Create Digital Object

The Spore SDK's `createSpore()` function builds a CKB transaction that
produces a Spore Cell containing the image data:

```typescript
const { txSkeleton, outputIndex } = await createSpore({
  data: {
    contentType: "image/jpeg",
    content: imageBytes,
  },
  toLock: wallet.lock,
  fromInfos: [wallet.address],
  config: SPORE_CONFIG,
});
```

### 2. Render from Chain

The `unpackToRawSporeData()` function decodes the on-chain cell data back
into content-type and content fields, which can be rendered as an image
in the browser:

```typescript
const cell = await client.getCellLive({ txHash, index: indexHex }, true);
const sporeData = unpackToRawSporeData(cell.outputData);
const blob = new Blob([decodedBytes], { type: sporeData.contentType });
const imageURL = URL.createObjectURL(blob);
```

## Reproduce

### Prerequisites

- Node.js 22+
- pnpm
- OffCKB CLI (>= 0.4.0)

### Devnet

```bash
# Start devnet
offckb node

# In another terminal
cd challenge-4/create-dob
pnpm install
NETWORK=devnet ./node_modules/.bin/tsx create-dob.ts
```

### Testnet

```bash
# Get testnet CKB from https://faucet.nervos.org/
# Then:
NETWORK=testnet ./node_modules/.bin/tsx testnet-dob.ts
```

### Frontend

```bash
NETWORK=devnet npm start
# Open http://localhost:1234
```

## Resources

- [Create a DOB Tutorial](https://docs.nervos.org/docs/dapp/create-dob)
- [DOB Protocol Cookbook](https://github.com/sporeprotocol/dob-cookbook)
- [Spore Protocol Docs](https://docs.spore.pro/dob/Introduction)
- [CCC SDK (JavaScript/TypeScript)](https://github.com/ckb-js/ckb-sdk-js)
- [OffCKB CLI](https://docs.nervos.org/docs/sdk-and-devtool/offckb)
