import * as bindings from "@ckb-js-std/bindings";
import { HighLevel, log, hashCkb, bytesEq } from "@ckb-js-std/core";

const ERROR_MISSING_PREIMAGE = 10;
const ERROR_HASH_MISMATCH = 11;
const ERROR_INVALID_ARGS = 12;
const CKB_JS_VM_ARGS_PREFIX_LENGTH = 35;
const HASH_LENGTH = 32;

function main(): number {
  log.setLevel(log.LogLevel.Debug);
  const script = bindings.loadScript();
  log.debug(`hash-lock script loaded: ${JSON.stringify(script)}`);

  const scriptArgs = new Uint8Array(HighLevel.loadScript().args);
  if (scriptArgs.length !== CKB_JS_VM_ARGS_PREFIX_LENGTH + HASH_LENGTH) {
    log.error(`Expected 67 script args bytes, received ${scriptArgs.length}`);
    return ERROR_INVALID_ARGS;
  }
  const expectedHash = scriptArgs.slice(CKB_JS_VM_ARGS_PREFIX_LENGTH);

  let preimage: ArrayBuffer | undefined;
  try {
    preimage = HighLevel.loadWitnessArgs(0, bindings.SOURCE_GROUP_INPUT).lock;
  } catch (_error) {
    log.error("The first group-input witness is missing");
    return ERROR_MISSING_PREIMAGE;
  }

  if (!preimage || preimage.byteLength === 0) {
    log.error("The witness lock field must contain a preimage");
    return ERROR_MISSING_PREIMAGE;
  }

  const actualHash = hashCkb(preimage);
  if (!bytesEq(actualHash, expectedHash.buffer)) {
    log.error(
      `Preimage hash mismatch: ${new Uint8Array(actualHash)}, ${expectedHash}`,
    );
    return ERROR_HASH_MISMATCH;
  }

  log.debug("Preimage accepted");
  return 0;
}

bindings.exit(main());
