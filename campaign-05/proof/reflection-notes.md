# Campaign 05 Reflection Notes

These are factual prompts for FidelCoder to turn into a personal reflection. They are deliberately not a finished submission.

- The token balance is stored as 16-byte little-endian data in an xUDT Cell.
- The issuer Lock Script Hash becomes the token's identity inside the xUDT args.
- Querying the Type Script finds the token cells, while each cell's Lock Script identifies who can unlock that balance.
- The transfer transaction kept the same xUDT Type Script and changed the output Lock Script to the receiver's script.
- A `250` token transfer created a `750` token change cell for the issuer, which made the UTXO-style accounting visible.
- OffCKB made it possible to inspect the whole issue/query/transfer lifecycle locally without relying on a public explorer.

Write the final reflection in your own voice, including what surprised you, what you debugged, and which xUDT use case you find most interesting.
