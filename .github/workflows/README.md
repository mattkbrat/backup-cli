# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### 🚀 Release Workflow (`main.yml`)

**Trigger:** Push to version tags (`v*.*.*`)

This workflow handles the automated release process:

1. **Linting** - Validates code quality using Biome
2. **Building** - Compiles the TypeScript source with Bun
3. **Release** - Creates GitHub releases with built artifacts

#### Features:
- ✅ Automatic release creation on version tags
- ✅ Biome linting and formatting checks
- ✅ Bun build with output verification
- ✅ Artifact upload (`.js` files, `.tar.gz`, `.zip` archives)
- ✅ Automatic changelog generation
- ✅ Pre-release support (alpha, beta, rc tags)

### 🔄 Continuous Integration (`ci.yml`)

**Trigger:** Pull requests and pushes to main branches

This workflow runs quality checks on every code change:

1. **Lint** - Code style and quality checks with Biome
2. **TypeCheck** - TypeScript type validation
3. **Test** - Runs test suite (if available)
4. **Build** - Multi-platform build verification
5. **Security** - Vulnerability scanning

#### Features:
- ✅ Parallel job execution for faster feedback
- ✅ Dependency caching for improved performance
- ✅ Multi-OS build matrix (Ubuntu, macOS, Windows)
- ✅ Security vulnerability scanning
- ✅ Detailed CI summary report

## Usage

### Creating a Release

To create a new release, use semantic versioning tags:

```bash
# Using the release script (recommended)
./scripts/release.sh

# Or manually create and push a tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

The release workflow will automatically:
1. Run all quality checks
2. Build the project
3. Create a GitHub release with artifacts
4. Generate release notes from commit history

### Version Tag Format

- **Standard releases:** `v1.0.0`, `v2.1.3`
- **Pre-releases:** `v1.0.0-beta.1`, `v2.0.0-rc.1`, `v3.0.0-alpha`

Pre-releases are automatically marked as such in GitHub.

### Pull Request Checks

All pull requests must pass the following checks:
- ✅ Biome linting
- ✅ TypeScript type checking
- ✅ Successful build
- ✅ Security scan (informational)

## Configuration Files

### Required Files

1. **`biome.json`** - Biome linter and formatter configuration
2. **`package.json`** - Must include these scripts:
   ```json
   {
     "scripts": {
       "build": "bun build index.ts --target=bun --outfile=dist/out.js",
       "lint": "biome check --apply ./src ./index.ts",
       "check": "biome ci ./src ./index.ts"
     }
   }
   ```
3. **`tsconfig.json`** - TypeScript configuration

### Optional Files

1. **`.github/release.yml`** - Customizes automatic release notes generation
2. **`.github/dependabot.yml`** - Automated dependency updates

## Workflow Permissions

The release workflow requires write permissions for:
- `contents: write` - To create releases and upload artifacts

## Environment Variables

No environment variables or secrets are required for the basic workflows. However, you may want to add:

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- Custom secrets for deployment targets (if needed)

## Troubleshooting

### Release Not Triggering

Ensure your tag follows the correct format:
```bash
# Correct
git tag -a v1.0.0 -m "Release v1.0.0"

# Incorrect (won't trigger)
git tag 1.0.0
git tag version-1.0.0
```

### Build Artifacts Not Found

The build expects output at `dist/out.js`. Verify your build script:
```json
"build": "bun build index.ts --target=bun --outfile=dist/out.js"
```

### Biome Errors

Install Biome locally to test:
```bash
bun add -d @biomejs/biome
bunx biome check ./src ./index.ts
```

## Local Testing

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Test CI workflow
act pull_request

# Test release workflow with a tag
act push --eventpath event.json
```

Example `event.json` for release testing:
```json
{
  "ref": "refs/tags/v1.0.0",
  "ref_type": "tag"
}
```

## Best Practices

1. **Semantic Versioning** - Always follow semantic versioning for releases
2. **Commit Messages** - Use conventional commits for better changelogs
3. **Testing** - Ensure all tests pass before creating releases
4. **Documentation** - Update README and docs with version changes
5. **Branch Protection** - Enable branch protection rules for main branches

## Support

For issues with workflows, check:
1. [GitHub Actions status](https://www.githubstatus.com/)
2. [Actions tab](../../actions) in this repository
3. Workflow run logs for detailed error messages

## License

These workflows are part of the project and follow the same license.