import * as bindings from "@ckb-js-std/bindings";
import { HighLevel, log } from "@ckb-js-std/core";

const ERROR_NO_OUTPUT = 10;
const ERROR_MULTIPLE_OUTPUTS = 11;
const ERROR_MARKER_MISSING = 12;
const ERROR_CAPACITY_TOO_LOW = 13;
const ERROR_CAPACITY_SHRANK = 14;

const MIN_VAULT_CAPACITY = 100_00000000n; // 100 CKB in shannons.
const MARKER = [
  67, 75, 66, 95, 67, 65, 77, 80, 65, 73, 71, 78, 95, 86, 65, 85, 76, 84, 95, 86, 49,
]; // CKB_CAMPAIGN_VAULT_V1

function hasMarker(data: ArrayBuffer): boolean {
  const bytes = new Uint8Array(data);
  if (bytes.length < MARKER.length) {
    return false;
  }

  for (let i = 0; i < MARKER.length; i++) {
    if (bytes[i] !== MARKER[i]) {
      return false;
    }
  }

  return true;
}

function sumCapacity(capacities: bigint[]): bigint {
  let total = 0n;
  for (const capacity of capacities) {
    total += capacity;
  }
  return total;
}

function main(): number {
  log.setLevel(log.LogLevel.Debug);

  const script = HighLevel.loadScript();
  const inputCapacities = new HighLevel.QueryIter(
    HighLevel.loadCellCapacity,
    HighLevel.SOURCE_GROUP_INPUT,
  ).toArray();
  const outputCapacities = new HighLevel.QueryIter(
    HighLevel.loadCellCapacity,
    HighLevel.SOURCE_GROUP_OUTPUT,
  ).toArray();

  if (outputCapacities.length === 0) {
    log.error("capacity guard requires one protected output cell");
    return ERROR_NO_OUTPUT;
  }

  if (outputCapacities.length > 1) {
    log.error("capacity guard expects exactly one protected output cell");
    return ERROR_MULTIPLE_OUTPUTS;
  }

  const outputData = HighLevel.loadCellData(0, HighLevel.SOURCE_GROUP_OUTPUT);
  if (!hasMarker(outputData)) {
    log.error("protected cell data must start with CKB_CAMPAIGN_VAULT_V1");
    return ERROR_MARKER_MISSING;
  }

  const outputTotal = sumCapacity(outputCapacities);
  if (outputTotal < MIN_VAULT_CAPACITY) {
    log.error("protected output capacity is below 100 CKB");
    return ERROR_CAPACITY_TOO_LOW;
  }

  const inputTotal = sumCapacity(inputCapacities);
  if (inputCapacities.length > 0 && outputTotal < inputTotal) {
    log.error("capacity guard does not allow shrinking the protected cell");
    return ERROR_CAPACITY_SHRANK;
  }

  log.debug("capacity guard passed with script args: " + JSON.stringify(script.args));
  return 0;
}

bindings.exit(main());
