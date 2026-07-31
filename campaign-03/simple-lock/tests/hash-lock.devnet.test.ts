import {
  hexFrom,
  ccc,
  hashTypeToBytes,
  hashCkb,
  WitnessArgs,
} from "@ckb-ccc/core";
import scripts from "../deployment/scripts.json";
import systemScripts from "../deployment/system-scripts.json";
import { buildClient, buildSigner } from "./helper";

const PREIMAGE = "FidelCoder Campaign 03 devnet integration";

function utf8Hex(value: string) {
  return hexFrom(new TextEncoder().encode(value));
}

jest.setTimeout(60_000);

describe("hash-lock contract", () => {
  let client: ccc.Client;
  let signer: ccc.SignerCkbPrivateKey;

  beforeAll(() => {
    client = buildClient("devnet");
    signer = buildSigner(client);
  });

  test("locks and unlocks a real devnet cell", async () => {
    const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
    const contractScript = scripts.devnet["hash-lock.bc"];

    const hash = hashCkb(utf8Hex(PREIMAGE));

    const mainScript = {
      codeHash: ckbJsVmScript.script.codeHash,
      hashType: ckbJsVmScript.script.hashType,
      args: hexFrom(
        "0x0000" +
          contractScript.codeHash.slice(2) +
          hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
          hash.slice(2),
      ),
    };

    const tx = ccc.Transaction.from({
      outputs: [
        {
          lock: mainScript,
        },
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer, 1000);
    const txHash = await signer.sendTransaction(tx);
    console.log(`Transaction sent: ${txHash}`);
    const firstCommitted = await client.waitTransaction(txHash);
    expect(firstCommitted?.status).toBe("committed");
    console.log(`Lock transaction committed: ${txHash}`);

    const secondTx = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash,
            index: 0,
          },
        },
      ],
      outputs: [{ lock: mainScript }],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
      ],
    });
    secondTx.witnesses.push(
      hexFrom(new WitnessArgs(utf8Hex(PREIMAGE)).toBytes()),
    );
    await secondTx.completeInputsByCapacity(signer);
    await secondTx.completeFeeBy(signer, 1000);
    const secondTxHash = await signer.sendTransaction(secondTx);
    console.log(`Second Transaction sent: ${secondTxHash}`);
    const secondCommitted = await client.waitTransaction(secondTxHash);
    expect(secondCommitted?.status).toBe("committed");
    console.log(`Unlock transaction committed: ${secondTxHash}`);
  });
});
