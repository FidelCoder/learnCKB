import { ccc, hexFrom, hashTypeToBytes } from "@ckb-ccc/core";
import { cccClient, readEnvNetwork } from "./ccc-client";
import scripts from "../deployment/scripts.json";
import systemScripts from "../deployment/system-scripts.json";

export type TransactionStatus =
  | "sent"
  | "pending"
  | "proposed"
  | "committed"
  | "unknown"
  | "rejected";

type DeploymentInfo = {
  codeHash: string;
  hashType: "data" | "type" | "data1" | "data2";
  cellDeps: Array<{ cellDep: ccc.CellDepLike }>;
};

const network = readEnvNetwork();
const myScripts =
  (scripts as Record<string, Record<string, DeploymentInfo>>)[network] ?? {};
const mySystemScripts = (systemScripts as Record<string, any>)[network] ?? {};

export function textToHex(text: string): `0x${string}` {
  const encoded = new TextEncoder().encode(text);
  return `0x${Array.from(encoded, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

export function formatCkb(amount: bigint) {
  return ccc.fixedPointToString(amount);
}

export function getHashLockDeployment() {
  return myScripts["hash-lock.bc"];
}

export function generateAccount(hash: string) {
  const deployment = getHashLockDeployment();
  if (!deployment) {
    throw new Error("Deploy hash-lock.bc before generating a lock address");
  }

  const normalizedHash = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (!/^[0-9a-fA-F]{64}$/.test(normalizedHash)) {
    throw new Error("The lock hash must contain exactly 32 bytes");
  }

  const lockArgs =
    "0x0000" +
    deployment.codeHash.slice(2) +
    hexFrom(hashTypeToBytes(deployment.hashType)).slice(2) +
    normalizedHash;
  const lockScript = {
    codeHash: mySystemScripts["ckb_js_vm"]!.script.codeHash,
    hashType: mySystemScripts["ckb_js_vm"]!.script.hashType,
    args: lockArgs,
  };
  const address = ccc.Address.fromScript(lockScript, cccClient).toString();
  return {
    address,
    lockScript: ccc.Script.from(lockScript),
  };
}

export async function capacityOf(address: string): Promise<bigint> {
  const parsed = await ccc.Address.fromString(address, cccClient);
  return cccClient.getBalance([parsed.script]);
}

export async function getDevnetTip() {
  return cccClient.getTip();
}

export async function unlock(
  fromAddr: string,
  toAddr: string,
  amountInCKB: string,
  preimage: string,
): Promise<{ txHash: string; transaction: string }> {
  const deployment = getHashLockDeployment();
  if (!deployment) {
    throw new Error("The hash-lock contract is not deployed");
  }
  if (!preimage.length) {
    throw new Error("Enter the preimage used to build this lock");
  }

  const fromScript = (await ccc.Address.fromString(fromAddr, cccClient)).script;
  const toScript = (await ccc.Address.fromString(toAddr, cccClient)).script;
  const readSigner = new ccc.SignerCkbScriptReadonly(cccClient, fromScript);
  const transferCapacity = ccc.fixedPointFrom(amountInCKB);
  const recipientMinimum = ccc.fixedPointFrom(
    ccc.CellOutput.from({
      capacity: transferCapacity,
      lock: toScript,
    }).occupiedSize,
  );
  if (transferCapacity < recipientMinimum) {
    throw new Error(
      `The recipient cell requires at least ${formatCkb(recipientMinimum)} CKB`,
    );
  }

  const tx = ccc.Transaction.from({
    outputs: [{ lock: toScript, capacity: transferCapacity }],
    outputsData: [],
  });

  await tx.addCellDeps(deployment.cellDeps[0].cellDep);
  await tx.addCellDeps(
    mySystemScripts["ckb_js_vm"]!.script.cellDeps[0].cellDep,
  );

  const changeMinimum = ccc.fixedPointFrom(
    ccc.CellOutput.from({
      capacity: 0n,
      lock: fromScript,
    }).occupiedSize,
  );
  await tx.completeInputsByCapacity(readSigner, changeMinimum);

  const fee = 1000n;
  const balanceDiff =
    (await tx.getInputsCapacity(cccClient)) - tx.getOutputsCapacity();
  if (balanceDiff < fee) {
    throw new Error("The selected cells cannot cover the transaction fee");
  }

  const changeCapacity = balanceDiff - fee;
  if (changeCapacity > 0n) {
    if (changeCapacity < changeMinimum) {
      throw new Error(
        `Hash-lock change requires at least ${formatCkb(changeMinimum)} CKB`,
      );
    }
    tx.addOutput({
      lock: fromScript,
      capacity: changeCapacity,
    });
  }

  tx.setWitnessArgsAt(0, new ccc.WitnessArgs(textToHex(preimage)));

  const txHash = await cccClient.sendTransaction(tx);
  return {
    txHash,
    transaction: tx.stringify(),
  };
}

export async function waitForCommitted(
  txHash: string,
  onStatus?: (status: TransactionStatus) => void,
  timeoutMs = 90000,
) {
  const startedAt = Date.now();
  let lastStatus: TransactionStatus = "sent";

  while (Date.now() - startedAt < timeoutMs) {
    const response = await cccClient.getTransaction(txHash);
    const status = (response?.status || "pending") as TransactionStatus;
    if (status !== lastStatus) {
      lastStatus = status;
      onStatus?.(status);
    }
    if (status === "committed") {
      return response;
    }
    if (status === "rejected") {
      throw new Error(response?.reason || "Transaction rejected by the devnet");
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error(`Timed out waiting for ${txHash} to commit`);
}
