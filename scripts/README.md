# Scripts Documentation

This directory contains streamlined build and release scripts for the Gemini History Manager extension.

## Quick Reference

### Development
```bash
# Quick development build
pnpm build:all

# Development with auto-reload (Firefox)
pnpm dev

# Development for Chrome
pnpm dev:chrome

# Development helper commands
pnpm dev-helper clean        # Clean build directories
pnpm dev-helper quick-build  # Build without recording
pnpm dev-helper full-build   # Build with recording
pnpm dev-helper lint-all     # Lint both browsers
pnpm dev-helper format-fix   # Format all code
```

### Release Process
```bash
# Complete release (recommended)
pnpm release:patch   # or :minor, :major

# Manual release steps
pnpm release --patch --dry-run  # Preview changes
pnpm release --patch            # Execute release
pnpm release --patch --skip-github  # Skip GitHub release
```

### Build & Package
```bash
# Build and package everything
pnpm package

# Build with recording for comparison
pnpm package-record

# Compare builds
pnpm compare-checksums
```

## Script Overview

### Core Scripts

#### `release.js` - Unified Release Script
Handles the complete release workflow:
- Version bumping in all files
- Release notes creation
- Building and packaging
- Git operations (commit, tag, push)
- GitHub release creation

**Usage:**
```bash
pnpm release --[major|minor|patch] [--dry-run] [--skip-github]
```

#### `build-all.js` - Unified Build Script
Combines building, packaging, and optional recording:
- Builds for Firefox and Chrome
- Creates zip packages
- Optionally records builds for comparison
- Shows build summary

**Usage:**
```bash
pnpm build:all [--record] [--compare] [--clean]
```

#### `dev-helper.js` - Development Helper
Common development tasks in one place:
- Clean build directories
- Quick/full builds
- Linting and formatting
- Version information

**Usage:**
```bash
pnpm dev-helper [command]
```

### Legacy Scripts (Still Available)

#### `bump-version.js`
Standalone version bumping utility.

#### `record-build.js`
Records builds in `dist-record/` for checksum comparison.

#### `compare-checksums-wrapper.js` & `compare_checksums.py`
Compares checksums across different builds of the same version.

#### `create-github-release.js`
Standalone GitHub release creation.

#### `post-bump.sh`
Shell script for git operations after version bump.

## Migration Guide

### Old vs New Commands

| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `pnpm run build:all && pnpm run package:firefox && pnpm run package:chrome` | `pnpm package` | Simplified |
| `pnpm run package && pnpm run record-build` | `pnpm package-record` | Combined |
| `pnpm run bump -- --patch && scripts/post-bump.sh` | `pnpm release:patch` | Unified |
| Multiple manual steps | `pnpm release --patch` | Single command |

### Benefits of Streamlined Scripts

1. **Fewer Commands**: Common workflows reduced to single commands
2. **Better Error Handling**: Consistent error handling across all scripts
3. **Dry Run Support**: Preview changes before execution
4. **Progress Feedback**: Clear progress indicators and summaries
5. **Flexible Options**: Skip steps as needed (e.g., `--skip-github`)

## Configuration

Scripts read configuration from:
- `package.json` - Version and project metadata
- `vite.config.js` - Build configuration
- `web-ext-config-*.cjs` - Extension packaging configuration

## Environment Requirements

- Node.js (ES modules support)
- pnpm package manager
- GitHub CLI (`gh`) for release creation
- Python 3 for checksum comparison
- Git for version control operations

## Troubleshooting

### Common Issues

1. **GitHub CLI not authenticated**
   ```bash
   gh auth login
   ```

2. **Missing release notes**
   - Scripts will create template and open editor
   - Edit manually if editor fails to open

3. **Build failures**
   - Check `vite.config.js` for browser-specific settings
   - Ensure all dependencies are installed

4. **Permission errors**
   - Check file permissions in build directories
   - Ensure Node.js has write access to project directories

### Debug Mode

Most scripts support verbose output and dry-run modes:
```bash
pnpm release --patch --dry-run  # Preview release changes
pnpm build:all --clean          # Clean build with verbose output
```