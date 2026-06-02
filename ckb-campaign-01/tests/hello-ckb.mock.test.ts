import { hexFrom, Transaction, hashTypeToBytes } from "@ckb-ccc/core";
import { readFileSync } from "fs";
import { Resource, Verifier, DEFAULT_SCRIPT_ALWAYS_SUCCESS, DEFAULT_SCRIPT_CKB_JS_VM } from "ckb-testtool";

const MARKER = "0x434b425f43414d504149474e5f5641554c545f5631"; // CKB_CAMPAIGN_VAULT_V1
const VAULT_CAPACITY = 300_00000000n;

describe("hello-ckb capacity guard contract", () => {
  test("accepts a protected campaign vault cell", async () => {
    const resource = Resource.default();
    const tx = Transaction.default();

    const mainScript = resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_CKB_JS_VM)), tx, false);
    const alwaysSuccessScript = resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)), tx, false);
    const contractScript = resource.deployCell(hexFrom(readFileSync("dist/hello-ckb.bc")), tx, false);

    mainScript.args = hexFrom(
      "0x0000" +
        contractScript.codeHash.slice(2) +
        hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
        "0000000000000000000000000000000000000000000000000000000000000000",
    );

    const fundingCell = resource.mockCell(alwaysSuccessScript, undefined, "0x", VAULT_CAPACITY + 1_00000000n);
    tx.inputs.push(Resource.createCellInput(fundingCell));

    tx.outputs.push(Resource.createCellOutput(alwaysSuccessScript, mainScript, VAULT_CAPACITY));
    tx.outputsData.push(hexFrom(MARKER));

    const verifier = Verifier.from(resource, tx);
    await verifier.verifySuccess(true);
  });
});
