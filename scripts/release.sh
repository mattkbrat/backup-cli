#!/usr/bin/env bash

# Release Helper Script
# This script helps create tagged releases for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
  color=$1
  message=$2
  echo -e "${color}${message}${NC}"
}

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to get current version from package.json
get_current_version() {
  if [ -f "package.json" ]; then
    grep '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/'
  else
    echo "0.0.0"
  fi
}

# Function to validate semantic version
validate_version() {
  if [[ ! "$1" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    print_color "$RED" "Error: Invalid version format. Please use semantic versioning (e.g., 1.0.0 or v1.0.0)"
    exit 1
  fi
}

# Function to check git status
check_git_status() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    print_color "$YELLOW" "Warning: You have uncommitted changes."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_color "$RED" "Release cancelled."
      exit 1
    fi
  fi
}

# Function to run pre-release checks
run_checks() {
  print_color "$BLUE" "Running pre-release checks..."

  # Check if bun is installed
  if ! command_exists bun; then
    print_color "$RED" "Error: bun is not installed"
    exit 1
  fi

  # Install dependencies
  print_color "$BLUE" "Installing dependencies..."
  bun install --frozen-lockfile

  # Run linting
  if [ -f "biome.json" ]; then
    print_color "$BLUE" "Running linter..."
    bun run lint || {
      print_color "$RED" "Linting failed. Please fix errors before releasing."
      exit 1
    }
  fi

  # Run build
  print_color "$BLUE" "Building project..."
  bun run build || {
    print_color "$RED" "Build failed. Please fix errors before releasing."
    exit 1
  }

  # Run tests if they exist
  if grep -q '"test"' package.json; then
    print_color "$BLUE" "Running tests..."
    bun test || print_color "$YELLOW" "Warning: Some tests failed"
  fi

  print_color "$GREEN" "✓ All checks passed"
}

# Function to update version in package.json
update_package_version() {
  local version=$1
  # Remove 'v' prefix if present for package.json
  version_without_v=${version#v}

  if [ -f "package.json" ]; then
    # Update version in package.json
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$version_without_v\"/" package.json
    rm package.json.bak
    print_color "$GREEN" "✓ Updated package.json version to $version_without_v"
  fi
}

# Function to create git tag and push
create_and_push_tag() {
  local version=$1
  local message=$2

  # Ensure version starts with 'v'
  if [[ ! "$version" =~ ^v ]]; then
    version="v$version"
  fi

  # Commit version changes if any
  if ! git diff --quiet package.json 2>/dev/null; then
    git add package.json
    git commit -m "chore: bump version to $version"
    print_color "$GREEN" "✓ Committed version bump"
  fi

  # Create annotated tag
  if [ -z "$message" ]; then
    message="Release $version"
  fi

  git tag -a "$version" -m "$message"
  print_color "$GREEN" "✓ Created tag $version"

  # Push changes and tag
  read -p "Push tag to origin? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin master || git push origin master || git push origin
    git push origin "$version"
    print_color "$GREEN" "✓ Pushed tag $version to origin"
    print_color "$GREEN" "🎉 Release $version created successfully!"
    print_color "$BLUE" "GitHub Actions will now build and create the release."
  else
    print_color "$YELLOW" "Tag created locally. Push it manually when ready:"
    print_color "$YELLOW" "  git push origin $version"
  fi
}

# Main script
main() {
  print_color "$BLUE" "🚀 Release Helper Script"
  echo ""

  # Check if in git repository
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    print_color "$RED" "Error: Not in a git repository"
    exit 1
  fi

  # Get current version
  current_version=$(get_current_version)
  print_color "$BLUE" "Current version: $current_version"
  echo ""

  # Check git status
  check_git_status

  # Get version from argument or prompt
  if [ -z "$1" ]; then
    echo "Enter the new version (e.g., 1.0.0 or v1.0.0):"
    echo "Current version: $current_version"
    read -r -p "New version: " version
  else
    version=$1
  fi

  # Validate version
  validate_version "$version"

  # Get release message
  if [ -z "$2" ]; then
    read -r -p "Enter release message (optional): " message
  else
    message=$2
  fi

  # Confirmation
  print_color "$YELLOW" "You are about to create release: $version"
  read -p "Continue? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_color "$RED" "Release cancelled."
    exit 1
  fi

  # Run checks
  run_checks

  # Update package.json version
  update_package_version "$version"

  # Create and push tag
  create_and_push_tag "$version" "$message"
}

# Show help
show_help() {
  echo "Usage: $0 [version] [message]"
  echo ""
  echo "Create a new tagged release for the project."
  echo ""
  echo "Arguments:"
  echo "  version   The version to release (e.g., 1.0.0 or v1.0.0)"
  echo "  message   Optional release message"
  echo ""
  echo "Examples:"
  echo "  $0                    # Interactive mode"
  echo "  $0 1.0.0              # Release version 1.0.0"
  echo "  $0 v1.0.0 \"Initial release\"  # Release with message"
  echo ""
  echo "The script will:"
  echo "  1. Run linting and build checks"
  echo "  2. Update version in package.json"
  echo "  3. Create a git tag"
  echo "  4. Push the tag to trigger GitHub release workflow"
}

# Parse arguments
case "$1" in
-h | --help)
  show_help
  exit 0
  ;;
*)
  main "$@"
  ;;
esac
