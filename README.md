# Backup

A Docker container backup utility specifically designed for PostgreSQL databases. This tool provides automated backups with support for multiple containers, encryption, and flexible configuration.

## Features

- 🐘 PostgreSQL database backups using `pg_dump`
- 🔐 Optional ZIP encryption with password protection
- 📦 Compressed backups using Zstandard compression
- 🚀 Concurrent backup support for multiple containers
- 🔍 Verbose logging mode for debugging
- 🏃 Dry-run mode for testing configurations
- ⚙️ TOML-based configuration

## Installation

To install dependencies:

```bash
bun install
```

## Usage

### Basic Usage

```bash
bun run index.ts
```

### Command-Line Options

```bash
bun run index.ts [options]

Options:
  -V, --version          output the version number
  -v, --verbose          enable verbose logging
  -c, --config <path>    path to config.toml file (default: "./config.toml")
  -o, --output <path>    output directory for backups (default: "./exports")
  -d, --dry-run          perform a dry run without creating backups
  -h, --help             display help for command
```

### Examples

```bash
# Run with verbose logging
bun run index.ts --verbose

# Use a custom config file
bun run index.ts --config /path/to/custom-config.toml

# Specify output directory
bun run index.ts --output /backup/location

# Perform a dry run to test configuration
bun run index.ts --dry-run --verbose

# Combine multiple options
bun run index.ts -v -c ./production.toml -o /mnt/backups
```

## Configuration

The backup tool uses a TOML configuration file to define which PostgreSQL containers to backup.

### Basic Configuration

Create a `config.toml` file in your project root:

```toml
[backup]
[backup.postgres]

# Define each PostgreSQL container to backup
[backup.postgres.myapp_db]
container = "myapp-postgres"
database = "myapp"        # Optional, defaults to "postgres"
user = "myuser"          # Optional, defaults to "postgres"
enabled = true           # Optional, defaults to true

[backup.postgres.analytics_db]
container = "analytics-postgres"
database = "analytics"
user = "analytics_user"

# Disable a backup without removing configuration
[backup.postgres.legacy_db]
container = "legacy-postgres"
enabled = false
```

### Configuration Options

#### PostgreSQL Backup Configuration

Each PostgreSQL backup entry supports the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | string | *required* | Docker container name |
| `database` | string | `"postgres"` | Database name to backup |
| `user` | string | `"postgres"` | PostgreSQL user for pg_dump |
| `enabled` | boolean | `true` | Enable/disable this backup |

### Multiple Configuration Files

You can maintain multiple configuration files for different environments:

```bash
# Development
bun run index.ts -c config.dev.toml

# Production
bun run index.ts -c config.prod.toml

# Staging
bun run index.ts -c config.staging.toml
```

## Environment Variables

### `ENCRYPTION_KEY`

Set this environment variable to enable ZIP encryption:

```bash
# Using environment variable directly
ENCRYPTION_KEY="your-secure-password" bun run index.ts

# Using .env file
echo "ENCRYPTION_KEY=your-secure-password" >> .env
bun run index.ts
```

### `OUTPUT_DIR`

Default output directory (can be overridden with `--output` flag):

```bash
OUTPUT_DIR="/mnt/backups" bun run index.ts
```

## Output

Backups are saved as ZIP files in the output directory with the following naming convention:

```
backup-{timestamp}.zip
```

Where `{timestamp}` is the Unix timestamp in milliseconds.

### Backup Contents

Each ZIP file contains:
- Individual `.sql` files for each database
- Files are compressed using Zstandard compression
- Naming format: `{config_key}_{container_name}_{database_name}.sql`

## Docker Requirements

- Docker must be installed and running
- The user running the script must have Docker permissions
- Target containers must be running during backup

## Security Considerations

1. **Encryption Keys**: Never commit encryption keys to version control
2. **File Permissions**: Ensure backup directories have appropriate permissions
3. **Container Access**: The script requires Docker exec permissions
4. **Password Storage**: Use environment variables or secure key management systems

## Troubleshooting

### Verbose Mode

Use the `--verbose` flag to see detailed logging:

```bash
bun run index.ts --verbose
```

### Dry Run

Test your configuration without creating backups:

```bash
bun run index.ts --dry-run --verbose
```

### Common Issues

1. **Container not found**: Ensure the container name in config.toml matches the Docker container name
2. **Permission denied**: Check Docker permissions and file system permissions
3. **pg_dump failed**: Verify PostgreSQL user credentials and database names
4. **No backups created**: Check if containers are running and enabled in configuration

## Development

This project was created using `bun init` in bun v1.2.23. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

### Project Structure

```
backup/
├── index.ts         # Main backup script
├── config.toml      # Default configuration file
├── package.json     # Dependencies and scripts
├── README.md        # This file
└── exports/         # Default output directory
```

### Dependencies

- `commander`: Command-line interface
- `zod`: Configuration validation
- `bun`: JavaScript runtime and toolkit
