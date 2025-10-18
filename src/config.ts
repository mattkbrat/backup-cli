import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "bun";
import z from "zod";
import { options } from "./program";

export const DATESTAMP = Date.now().toString();
export const OUTPUT_DIR = options.output;
export const TEMP_DIR = join(tmpdir(), "backup-exporter", DATESTAMP);
export const ZIP_FILE = join(OUTPUT_DIR, `backup-${DATESTAMP}.zip`);

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

export const config = configSchema.parse(await import(options.config));
export type Config = z.infer<typeof configSchema>;
export type ConfigPostgres = NonNullable<Config["backup"]["postgres"]>;
export type PostgresContainer = NonNullable<
	ConfigPostgres[keyof ConfigPostgres]
>;

export const ENCRYPTION_KEY = env.ENCRYPTION_KEY;
