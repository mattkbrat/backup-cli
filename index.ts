#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $, env } from "bun";

import data from "./config.toml";
import z from "zod/v4";

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

const parsed = configSchema.parse(data);
const ENCRYPTION_KEY = env.ENCRYPTION_KEY;

console.log(JSON.stringify(parsed, null, 2));

type Config = z.Infer<typeof configSchema>;
type ConfigPostgres = NonNullable<Config["backup"]["postgres"]>;
type PostgresContainer = NonNullable<ConfigPostgres[keyof ConfigPostgres]>;

// # Format: container_name|docker_image|postgres_user|postgres_password

// Get current date in sortable ISO format(YYYY - MM - DD_HH - MM - SS)
const DATESTAMP = Date.now().toString();
const OUTPUT_DIR = env.OUTPUT_DIR ?? "./exports";

const TEMP_DIR = join(tmpdir(), "exporter", DATESTAMP);

await mkdir(OUTPUT_DIR, { recursive: true });
await mkdir(TEMP_DIR, { recursive: true });

const exportPostgresFull = async (
  { container, user, database = "postgres" }: PostgresContainer,
  exportFile: string,
) => {
  await $`docker exec -t ${container} pg_dump -d ${database} -U ${user} --compress=zstd -Fc > ${exportFile}`;
};

const zipAndClean = async () => {
  const zipfile = `${DATESTAMP}.zip`;
  if (ENCRYPTION_KEY) {
    console.info("Writing encrypted zip to output directory");
    await $`zip -j --password ${ENCRYPTION_KEY} ${zipfile} ${TEMP_DIR}/* && mv ${zipfile} ${OUTPUT_DIR} && rm -rf ${TEMP_DIR}`;
  } else {
    console.info("Writing zip to output directory");
    await $`zip -j ${zipfile} ${TEMP_DIR}/* && mv ${zipfile} ${OUTPUT_DIR} && rm -rf ${TEMP_DIR}`;
  }
};

// Process each container configuration

const handlePostgres = async () => {
  if (!parsed.backup.postgres) {
    console.info("No postgres containers found in environment");
    return;
  }
  console.log("backing up postgres", JSON.stringify(parsed.backup.postgres));
  for await (const [key, config] of Object.entries(parsed.backup.postgres)) {
    if (!config) continue;
    console.log(`Processing container: ${key}`);
    // Verify container is running
    const isRunning =
      await $`docker inspect -f '{{.State.Running}}' ${config.container} 2>/dev/null`.catch(
        () => {
          console.info(`${key} not running, skipping export`);
          return null;
        },
      );
    if (!isRunning) continue;
    console.log(isRunning.stderr, isRunning.stdout);
    const SQL_FILE = `${TEMP_DIR}/${key}_full_export__${config.container}.sql`;

    // First try with specified user
    try {
      await exportPostgresFull(config, SQL_FILE);
    } catch (e) {
      console.info(e, "trying default user");
      config.user = "postgres";

      try {
        await exportPostgresFull(config, SQL_FILE);
      } catch (e) {
        console.error("Failed to export", e);
      }
    }
  }
};

// This is just for cleanliness, not concurrency.
await Promise.all([await handlePostgres(), await zipAndClean()]).then(() => {
  (console.info(`Export process completed. Files stored in ${OUTPUT_DIR}`),
    process.exit(0));
});
