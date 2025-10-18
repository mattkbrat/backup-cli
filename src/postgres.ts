import { join } from "node:path";
import { $ } from "bun";
import { config, type PostgresContainer, TEMP_DIR } from "./config";
import { options } from "./program";
import { log } from "./utils";

export const exportPostgresFull = async (
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

export const handlePostgres = async () => {
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
