# Campaign 2 Proof

Tutorial completed: [Store Data on Cell](https://docs.nervos.org/docs/dapp/store-data-on-cell)

This proof shows the three required parts of the tutorial:

- Encode and decode a UTF-8 message as hex.
- Build a CCC transaction with the encoded message in `outputsData[0]`.
- Retrieve the live cell by out point and decode the on-chain data back to the original message.

## Result

- Account label: `FidelCoder`
- Network: local OffCKB devnet
- RPC endpoint used: `http://127.0.0.1:28114`
- Transaction hash: `0xf4c4cc0780fc107638391c51770a89b96f0b9cba38fc35d700d6e9ff174070f8`
- Out point: `0xf4c4cc0780fc107638391c51770a89b96f0b9cba38fc35d700d6e9ff174070f8:0x0`
- Transaction status: `committed`
- Block number: `0x191f`
- Live cell status: `live`
- Live cell capacity: `0x3a7cafd00`
- Stored message: `FidelCoder Campaign 02: I stored this sentence as cell data, then read it back from a live cell.`
- Encoded cell data: `0x466964656c436f6465722043616d706169676e2030323a20492073746f72656420746869732073656e74656e63652061732063656c6c20646174612c207468656e2072656164206974206261636b2066726f6d2061206c6976652063656c6c2e`
- Decoded live-cell data: `FidelCoder Campaign 02: I stored this sentence as cell data, then read it back from a live cell.`

## Screenshots

1. [OffCKB devnet setup](screenshots/learnckb-01-devnet-setup.png)
2. [Encode and decode message](screenshots/learnckb-02-encode-decode-message.png)
3. [Build transaction with outputsData](screenshots/learnckb-03-build-transaction.png)
4. [Retrieve live cell data](screenshots/learnckb-04-retrieve-live-cell-data.png)
5. [Final result summary](screenshots/learnckb-05-result-summary.png)

## Logs

- [Devnet setup log](logs/01-devnet-setup.log)
- [Full tutorial run log](logs/02-store-data-tutorial.log)
- [Encode/decode step log](logs/02-encode-decode.log)
- [Build transaction step log](logs/03-build-transaction.log)
- [Retrieve live cell step log](logs/04-retrieve-live-cell.log)
- [Result summary log](logs/05-result-summary.log)
- [Machine-readable proof JSON](store-data-result.json)

## Rerun

Start OffCKB devnet first:

```bash
offckb node
```

Then run:

```bash
cd campaign-01/ckb-campaign-01
npm install
npm run campaign02:store-data
```

The script reads the local devnet signing key from `.env`, which is intentionally ignored by git.

## Explorer Note

This was completed on local OffCKB devnet. These hashes are real for the local chain, but they are not expected to appear on public mainnet or testnet explorers.
