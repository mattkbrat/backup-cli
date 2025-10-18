#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { config } from "node:process";
import { ENCRYPTION_KEY, OUTPUT_DIR, TEMP_DIR } from "./config";
import { handlePostgres } from "./postgres";
import { options } from "./program";
import { log } from "./utils";
import { zipAndClean } from "./zip";

// Helper function for verbose logging

if (options.verbose) {
	log.verbose("Parsed configuration:");
	log.verbose(JSON.stringify(config, null, 2));
	log.verbose(`Encryption key: ${ENCRYPTION_KEY ? "SET" : "NOT SET"}`);
	log.verbose(`Output directory: ${options.output}`);
}

// Get current date in sortable ISO format

log.verbose(`Temporary directory: ${TEMP_DIR}`);

if (!options.dryRun) {
	await mkdir(OUTPUT_DIR, { recursive: true });
	await mkdir(TEMP_DIR, { recursive: true });
	log.verbose("Created directories");
}

// Main execution
log.info("🚀 Starting backup process...\n");

try {
	await handlePostgres();

	if (!options.dryRun) {
		await zipAndClean();
	}

	log.info("\n✅ Backup process completed successfully!");
	if (!options.dryRun) {
		log.info(`📁 Backups stored in: ${OUTPUT_DIR}`);
	}
} catch (error) {
	log.error("\n❌ Backup process failed!");
	log.error(error);
	process.exit(1);
}
