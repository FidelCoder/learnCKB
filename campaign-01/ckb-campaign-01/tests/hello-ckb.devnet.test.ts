import { hexFrom, ccc, hashTypeToBytes } from "@ckb-ccc/core";
import scripts from "../deployment/scripts.json";
import systemScripts from "../deployment/system-scripts.json";
import { buildClient, buildSigner } from "./helper";

const MARKER = "0x434b425f43414d504149474e5f5641554c545f5631"; // CKB_CAMPAIGN_VAULT_V1
const VAULT_CAPACITY = 300_00000000n;

describe("hello-ckb capacity guard contract", () => {
  let client: ccc.Client;
  let signer: ccc.SignerCkbPrivateKey;

  beforeAll(() => {
    client = buildClient("devnet");
    signer = buildSigner(client);
  });

  test("creates a protected campaign vault cell on devnet", async () => {
    const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
    const contractScript = scripts.devnet["hello-ckb.bc"];

    const mainScript = {
      codeHash: ckbJsVmScript.script.codeHash,
      hashType: ckbJsVmScript.script.hashType,
      args: hexFrom(
        "0x0000" +
          contractScript.codeHash.slice(2) +
          hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
          "0000000000000000000000000000000000000000000000000000000000000000",
      ),
    };

    const signerLock = (await signer.getRecommendedAddressObj()).script;
    const toLock = {
      codeHash: signerLock.codeHash,
      hashType: signerLock.hashType,
      args: signerLock.args,
    };

    const tx = ccc.Transaction.from({
      outputs: [
        {
          capacity: VAULT_CAPACITY,
          lock: toLock,
          type: mainScript,
        },
      ],
      outputsData: [MARKER],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer, 1000);
    const txHash = await signer.sendTransaction(tx);
    console.log("Protected vault transaction sent: " + txHash);
  });
});
