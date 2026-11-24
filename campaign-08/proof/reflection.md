# Share proofs of tutorial completion

Proof: [https://github.com/buidlLabs3/nervosCKBchallenge/tree/main/campaign-08/proof/basic](https://github.com/buidlLabs3/nervosCKBchallenge/tree/main/campaign-08/proof/basic)

Video: [https://youtu.be/6ZDsB9fkzBE](https://youtu.be/6ZDsB9fkzBE)

Type: content

---

## Reflection

Having explanations right next to each step helped in following the tutorial. I have tried an earlier Fiber tutorial where the live demo sat at the top and the walkthrough was way down the page, and I spent half my time scrolling back and forth trying to match a sentence to a button. This format kept everything in one place. When the app said something about browsers not accepting inbound connections, or about outbound versus inbound liquidity, the reason was already sitting beside the control I was about to click. I did not have to guess why a step mattered, which made me less likely to skip it.

The part that stuck with me most was hitting decrypt without paying and watching AES-GCM reject. I expected some soft UI lock, like a greyed out button, not a hard cryptographic rejection. That unpacked that the invoice preimage is literally the AES key, so the payment is not opening a door, it is handing you the key. I also nearly skipped the liquidity card because it says optional, but the note about the seller needing inbound liquidity made me run the transfer anyway, and seeing the bars move after that made the concept feel real instead of something I had read about. If I were building on this, I would put a small paid JSON endpoint behind the same flow, no accounts or API keys, just a wallet and a decrypt.