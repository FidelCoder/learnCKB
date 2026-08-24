# Challenge 4 — Proof of Completion

## Overview

This document provides verifiable proof that the Create a DOB tutorial was
completed successfully on both CKB devnet and testnet.

## Requirements Checklist

| Requirement | Status | Evidence |
|------------|--------|----------|
| Deploy on-chain DOB with image via Spore-SDK | ✅ | Devnet + Testnet transactions below |
| Render image in browser from DOB | ✅ | Round-trip integrity verified (338 bytes → 338 bytes) |
| Deploy app to testnet | ✅ | Transaction on testnet explorer |

---

## Testnet Proof (Primary)

**Transaction Hash:** `0x54787a0748e53554bf62fadf1439b11688f1860a22ea4b6791a135d0cfee5837`

**🔗 Explorer Link:** https://testnet.explorer.nervos.org/transaction/0x54787a0748e53554bf62fadf1439b11688f1860a22ea4b6791a135d0cfee5837

| Fact | Value |
|------|-------|
| Network | CKB Pudge Testnet |
| Transaction hash | `0x54787a0748e53554bf62fadf1439b11688f1860a22ea4b6791a135d0cfee5837` |
| Block number | `0x1529112` |
| Block hash | `0x149357df415f9247f9748f10c7885b5084e8b9ea3022596dc9095e63dec209c3` |
| Spore ID | `0xf6dbae4b5c05b301a9ab60e414367a3f2c2776c9b6571e32748b6666939bca4f` |
| Out point | `0x54787a0748e53554bf62fadf1439b11688f1860a22ea4b6791a135d0cfee5837:0x0` |
| Cell status | `live` |
| Image content type | `image/jpeg` |
| Original image size | 338 bytes |
| Decoded image size | 338 bytes |
| Round-trip integrity | ✅ PASS |
| SHA-256 hash | `9bb1d03ba711f423dcfc59de87dded85faaf7966e3b74c4ec6fde458edcb9936` |
| Owner lock args | `0x8e42b1999f265a0078503c4acec4d5e134534297` |

---

## Devnet Proof (Secondary)

**Transaction Hash:** `0xb56724813cbdfa7c5886269be29926c490d0ecbe079081a72892b540454bb4a2`

| Fact | Value |
|------|-------|
| Network | OffCKB local devnet (`http://127.0.0.1:28114`) |
| Transaction hash | `0xb56724813cbdfa7c5886269be29926c490d0ecbe079081a72892b540454bb4a2` |
| Spore ID | `0x470d2b742dba9219a673f97dfc4deb63bba1d6615560916867342c98ec411e3d` |
| Out point | `0xb56724813cbdfa7c5886269be29926c490d0ecbe079081a72892b540454bb4a2:0x0` |
| Round-trip integrity | ✅ PASS |

---

## Verification Commands

### Testnet — RPC Evidence

```bash
# Get the live cell
curl -s -X POST https://testnet.ckbapp.dev/ -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0",
  "method":"get_live_cell",
  "params":[{
    "txHash": "0x54787a0748e53554bf62fadf1439b11688f1860a22ea4b6791a135d0cfee5837",
    "index": "0x0"
  }, true],
  "id":1
}' | python3 -m json.tool
```

### Image Integrity

```bash
cd challenge-4/create-dob
sha256sum sample-dob-image.jpg decoded-dob-image.jpg decoded-dob-testnet.jpg
# All three: 9bb1d03ba711f423dcfc59de87dded85faaf7966e3b74c4ec6fde458edcb9936
```

### Explorer

Visit the testnet explorer to view the transaction:
https://testnet.explorer.nervos.org/transaction/0x54787a0748e53554bf62fadf1439b11688f1860a22ea4b6791a135d0cfee5837

---

## Faucet Claim (Testnet)

| Fact | Value |
|------|-------|
| Faucet address | `ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvwg2cen8extgq8s5puft8vf40px3f599cytcyd8` |
| Initial balance | 17,543 CKB |
| Balance after DOB creation | ~17,044 CKB |
| Claim status | ✅ Committed |

---

## Screenshots & Images

| File | Description |
|------|-------------|
| [`../create-dob/sample-dob-image.jpg`](../create-dob/sample-dob-image.jpg) | Original input image (338 bytes) |
| [`../create-dob/decoded-dob-image.jpg`](../create-dob/decoded-dob-image.jpg) | Decoded from devnet chain (338 bytes) |
| [`../create-dob/decoded-dob-testnet.jpg`](../create-dob/decoded-dob-testnet.jpg) | Decoded from testnet chain (338 bytes) |
| [`../create-dob/create-dob.ts`](../create-dob/create-dob.ts) | Devnet creation script |
| [`../create-dob/testnet-dob.ts`](../create-dob/testnet-dob.ts) | Testnet creation script |
| [`../create-dob/decode-testnet.ts`](../create-dob/decode-testnet.ts) | Testnet verification script |
