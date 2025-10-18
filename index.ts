#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $, env } from "bun";
import { Command } from "commander";
import z from "zod";
import thisPackage from "./package.json";

// CLI Configuration
const program = new Command();
const cwd = process.cwd();

program
	.name("backup")
	.description("Docker container backup utility for PostgreSQL databases")
	.version(thisPackage.version)
	.option("-v, --verbose", "enable verbose logging", false)
	.option(
		"-c, --config <path>",
		"path to config.toml file",
		join(cwd, "./config.toml"),
	)
	.option(
		"-o, --output <path>",
		"output directory for backups",
		join(cwd, "./exports"),
	)
	.option("-d, --dry-run", "perform a dry run without creating backups", false)
	.parse(process.argv);

const options = program.opts();

// Helper function for verbose logging
const log = {
	info: (...args: unknown[]) => console.log(...args),
	verbose: (...args: unknown[]) =>
		options.verbose && console.log("[VERBOSE]", ...args),
	error: (...args: unknown[]) => console.error("[ERROR]", ...args),
	success: (...args: unknown[]) => console.log("[SUCCESS]", ...args),
};

// Schema for config validation
const configSchema = z.object({
	backup: z.object({
		postgres: z.record(
			z.string(),
			z
				.object({
					container: z.string(),
					user: z.string().default("postgres"),
					database: z.string().default("postgres"),
					enabled: z.boolean().default(true),
				})
				.nullable()
				.default(null),
		),
	}),
});

const config = configSchema.parse(await import(options.config));
const ENCRYPTION_KEY = env.ENCRYPTION_KEY;

if (options.verbose) {
	log.verbose("Parsed configuration:");
	log.verbose(JSON.stringify(config, null, 2));
	log.verbose(`Encryption key: ${ENCRYPTION_KEY ? "SET" : "NOT SET"}`);
	log.verbose(`Output directory: ${options.output}`);
}

type Config = z.infer<typeof configSchema>;
type ConfigPostgres = NonNullable<Config["backup"]["postgres"]>;
type PostgresContainer = NonNullable<ConfigPostgres[keyof ConfigPostgres]>;

// Get current date in sortable ISO format
const DATESTAMP = Date.now().toString();
const OUTPUT_DIR = options.output;
const TEMP_DIR = join(tmpdir(), "backup-exporter", DATESTAMP);
const ZIP_FILE = join(OUTPUT_DIR, `backup-${DATESTAMP}.zip`);

log.verbose(`Temporary directory: ${TEMP_DIR}`);

if (!options.dryRun) {
	await mkdir(OUTPUT_DIR, { recursive: true });
	await mkdir(TEMP_DIR, { recursive: true });
	log.verbose("Created directories");
}

const exportPostgresFull = async (
	{ container, user, database = "postgres" }: PostgresContainer,
	exportFile: string,
) => {
	const command = `docker exec -t ${container} pg_dump -d ${database} -U ${user} --compress=zstd -Fc`;

	if (options.dryRun) {
		log.info(`[DRY RUN] Would execute: ${command} > ${exportFile}`);
		return;
	}

	log.verbose(`Executing: ${command}`);
	await $`docker exec -t ${container} pg_dump -d ${database} -U ${user} --compress=zstd -Fc > ${exportFile}`;
};

const zipAndClean = async () => {
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

// Process PostgreSQL containers
const handlePostgres = async () => {
	if (
		!config.backup.postgres ||
		Object.keys(config.backup.postgres).length === 0
	) {
		log.info("No PostgreSQL containers configured");
		return;
	}

	const containers = Object.entries(config.backup.postgres).filter(
		([_, config]) => config?.enabled !== false,
	);
	log.info(`Found ${containers.length} PostgreSQL container(s) to backup`);

	for (const [key, config] of containers) {
		if (!config) continue;

		log.info(`\nProcessing: ${key}`);
		log.verbose(`Container: ${config.container}`);
		log.verbose(`Database: ${config.database}`);
		log.verbose(`User: ${config.user}`);

		// Verify container is running
		try {
			if (!options.dryRun) {
				const result =
					await $`docker inspect -f '{{.State.Running}}' ${config.container} 2>/dev/null`.text();
				const isRunning = result.trim() === "true";

				if (!isRunning) {
					log.info(
						`⚠️  Container ${config.container} is not running, skipping...`,
					);
					continue;
				}
				log.verbose(`Container ${config.container} is running`);
			}
		} catch (error) {
			log.error(`Failed to inspect container ${config.container}, skipping...`);
			log.verbose(error);
			continue;
		}

		const SQL_FILE = join(
			TEMP_DIR,
			`${key}_${config.container}_${config.database}.sql`,
		);

		// Try export with configured user
		try {
			await exportPostgresFull(config, SQL_FILE);
			log.success(`✓ Exported ${key}`);
		} catch (error: unknown) {
			log.verbose(
				`Failed with user ${config.user}, trying with default postgres user`,
				error instanceof Error ? error.message : error,
			);

			// Retry with postgres user
			try {
				config.user = "postgres";
				await exportPostgresFull(config, SQL_FILE);
				log.success(`✓ Exported ${key} (using default postgres user)`);
			} catch (retryError) {
				log.error(`✗ Failed to export ${key}`);
				log.verbose(retryError);
			}
		}
	}
};

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
