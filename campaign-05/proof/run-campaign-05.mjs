import { createRequire } from "node:module";
import systemScripts from "../xudt/system-scripts.json" with { type: "json" };

const require = createRequire(import.meta.url);
const { ccc, KnownScript, Script } = require(
  "../xudt/node_modules/@ckb-ccc/core/dist.commonjs/index.js",
);

const issuerPrivKey = process.env.ISSUER_PRIVKEY;
const receiverAddress = process.env.RECEIVER_ADDRESS;
const issueAmount = process.env.ISSUE_AMOUNT ?? "1000";
const transferAmount = process.env.TRANSFER_AMOUNT ?? "250";

if (!issuerPrivKey || !receiverAddress) {
  throw new Error("ISSUER_PRIVKEY and RECEIVER_ADDRESS are required");
}

const scripts = {
  [KnownScript.Secp256k1Blake160]: systemScripts.devnet.secp256k1_blake160_sighash_all.script,
  [KnownScript.Secp256k1Multisig]: systemScripts.devnet.secp256k1_blake160_multisig_all.script,
  [KnownScript.AnyoneCanPay]: systemScripts.devnet.anyone_can_pay.script,
  [KnownScript.OmniLock]: systemScripts.devnet.omnilock.script,
  [KnownScript.XUdt]: systemScripts.devnet.xudt.script,
  [KnownScript.NervosDao]: systemScripts.devnet.dao.script,
};

const client = new ccc.ClientPublicTestnet({
  url: "http://127.0.0.1:28114",
  scripts,
});

const signer = new ccc.SignerCkbPrivateKey(client, issuerPrivKey);
const issuerAddress = await signer.getAddressObjSecp256k1();
const issuerLock = issuerAddress.script;
const issuerLockHash = issuerLock.hash();
const xudtArgs = `${issuerLockHash}00000000`;
const xudtType = await Script.fromKnownScript(client, KnownScript.XUdt, xudtArgs);

const toSerializable = (value) =>
  JSON.parse(
    JSON.stringify(value, (_, current) =>
      typeof current === "bigint" ? current.toString() : current,
    ),
  );

const accountCapacity = await client.getBalance([issuerLock]);
console.log(JSON.stringify({
  step: "account",
  issuerAddress: issuerAddress.toString(),
  issuerLockHash,
  issuerCapacityShannon: accountCapacity.toString(),
}, null, 2));

const issueTx = ccc.Transaction.from({
  outputs: [{ lock: issuerLock, type: xudtType }],
  outputsData: [ccc.numLeToBytes(issueAmount, 16)],
});
await issueTx.addCellDepsOfKnownScripts(client, KnownScript.XUdt);
await issueTx.completeInputsByCapacity(signer);
await issueTx.completeFeeBy(signer, 1000);
const issueTxHash = await signer.sendTransaction(issueTx);
await client.waitTransaction(issueTxHash, 0, 120000, 1000);
console.log(JSON.stringify({
  step: "issue",
  txHash: issueTxHash,
  issueAmount,
  xudtArgs,
  xudtType: toSerializable(xudtType),
  output: toSerializable(issueTx.outputs[0]),
}, null, 2));

const queryIssuedTokenCellsByIssuerLockHash = async (issuerLockHashToQuery) => {
  const queryXudtArgs = `${issuerLockHashToQuery}00000000`;
  const queryType = await Script.fromKnownScript(
    client,
    KnownScript.XUdt,
    queryXudtArgs,
  );
  const cells = [];
  for await (const cell of client.findCellsByType(queryType, true)) {
    cells.push({
      outPoint: toSerializable(cell.outPoint),
      amount: ccc.numLeFromBytes(cell.outputData).toString(),
      lock: toSerializable(cell.cellOutput.lock),
      type: toSerializable(cell.cellOutput.type),
    });
  }
  return cells;
};

const beforeTransfer = await queryIssuedTokenCellsByIssuerLockHash(issuerLockHash);
console.log(JSON.stringify({
  step: "query",
  queryByIssuerLockScriptHash: issuerLockHash,
  cellCount: beforeTransfer.length,
  cells: beforeTransfer,
}, null, 2));

const receiverLock = (await ccc.Address.fromString(receiverAddress, client)).script;
const transferTx = ccc.Transaction.from({
  outputs: [{ lock: receiverLock, type: xudtType }],
  outputsData: [ccc.numLeToBytes(transferAmount, 16)],
});
await transferTx.completeInputsByUdt(signer, xudtType);
const balanceDiff =
  (await transferTx.getInputsUdtBalance(client, xudtType)) -
  transferTx.getOutputsUdtBalance(xudtType);
if (balanceDiff > ccc.Zero) {
  transferTx.addOutput(
    { lock: issuerLock, type: xudtType },
    ccc.numLeToBytes(balanceDiff, 16),
  );
}
await transferTx.addCellDepsOfKnownScripts(client, KnownScript.XUdt);
await transferTx.completeInputsByCapacity(signer);
await transferTx.completeFeeBy(signer, 1000);
const transferTxHash = await signer.sendTransaction(transferTx);
await client.waitTransaction(transferTxHash, 0, 120000, 1000);

const afterTransfer = await queryIssuedTokenCellsByIssuerLockHash(issuerLockHash);
console.log(JSON.stringify({
  step: "transfer",
  txHash: transferTxHash,
  transferAmount,
  receiverAddress,
  receiverLock: toSerializable(receiverLock),
  balanceChangeAmount: balanceDiff.toString(),
  cells: afterTransfer,
}, null, 2));

const receiverCells = afterTransfer.filter(
  (cell) => cell.lock.args === receiverLock.args,
);
if (!receiverCells.some((cell) => cell.amount === transferAmount)) {
  throw new Error("Transfer proof failed: receiver token cell was not found");
}

console.log(JSON.stringify({
  step: "verified",
  issueTxHash,
  transferTxHash,
  issuerLockHash,
  receiverLockArgs: receiverLock.args,
  receiverTokenAmount: transferAmount,
  queryFoundReceiverCell: true,
}, null, 2));
