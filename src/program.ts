import { join } from "node:path";
import { Command } from "commander";
import thisPackage from "../package.json";

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

export { program, options };
