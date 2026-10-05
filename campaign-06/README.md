# Fiber Payments in the Browser

This folder contains the Campaign 06 app for trying Fiber from a browser. It
starts a WASM node, joins a public Testnet peer, funds a channel, and sends a
keysend payment.

To run it, install the packages and start the local server:

```sh
npm install
npm run dev
```

Use the localhost address printed by Next.js. The app configures the browser
isolation headers Fiber WASM needs. Keep this browser profile for both parts
of the walkthrough, and use Testnet CKB only.

The first part is complete when the node is running and the peer is connected.
For the payment part, fund the displayed `ckt1` address with the
[Testnet faucet](https://faucet.nervos.org/), open a 499 CKB channel, wait for
`CHANNEL_READY`, then send 1 CKB. The completed run showed `Success` and a local
balance change from 400 CKB to 399 CKB.

Source is organized by role: `app/` contains the interface and visual styling;
`lib/fiber.ts` and `lib/use-fiber.ts` handle the browser node, channel states,
events, and payments; `lib/amounts.ts` handles exact CKB values.

The screenshots are kept outside this document in
`proof/screenshots/connection-state.png` and
`proof/screenshots/payment-settled.png`. The channel funding transaction is
[confirmed on Testnet](https://pudge.explorer.nervos.org/transaction/0xe30761595ab7ce3eb9ee30fb6b982431dbb91ef8ebaec1b3a626009bee44112c).

Tutorial references: [Connect to Fiber with a WASM node](https://www.fiber.world/docs/build/connect-wasm-node) and [Open a Fiber channel and send a payment](https://www.fiber.world/docs/build/open-channel-payment).
