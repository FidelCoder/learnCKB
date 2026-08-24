/**
 * Quick balance check for testnet
 */
import { createDefaultLockWallet } from "./helper.ts";
import { ccc } from "@ckb-ccc/core";
import { setSporeConfig } from "@spore-sdk/core";
import { SPORE_CONFIG } from "./spore-config.ts";

setSporeConfig(SPORE_CONFIG);

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const wallet = createDefaultLockWallet(
    "0x6109170b275a09ad54877b82f7d9930f88cab5717d484fb4741ae9d1dd078cd6"
  );
  const balance = await client.getBalance([wallet.lock]);
  console.log("Testnet address:", wallet.address);
  console.log("Testnet balance:", (balance / 100000000n).toString(), "CKB");
  console.log("Has enough for DOB (>= 1 CKB)?", balance >= 1000000000n ? "YES" : "NO - Need faucet");
}

main().catch(console.error);
