import { $ } from "bun";
import { ENCRYPTION_KEY, TEMP_DIR, ZIP_FILE } from "./config";
import { options } from "./program";
import { log } from "./utils";

export const zipAndClean = async () => {
  if (options.dryRun) {
    log.info(`[DRY RUN] Would create zip file: ${ZIP_FILE}`);
    if (ENCRYPTION_KEY) {
      log.info("[DRY RUN] Zip would be encrypted");
    }
    return;
  }

  if (ENCRYPTION_KEY) {
    log.info("Creating encrypted zip file...");
    log.verbose(`Output file: ${ZIP_FILE}`);
    await $`cd ${TEMP_DIR} && zip -j --password ${ENCRYPTION_KEY} ${ZIP_FILE} * && rm -rf ${TEMP_DIR}`;
  } else {
    log.info("Creating zip file...");
    log.verbose(`Output file: ${ZIP_FILE}`);
    await $`cd ${TEMP_DIR} && zip -j ${ZIP_FILE} * && rm -rf ${TEMP_DIR}`;
  }

  log.success(`Backup created: ${ZIP_FILE}`);
};
