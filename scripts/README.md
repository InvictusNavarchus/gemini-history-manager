# Scripts Documentation

This directory contains streamlined build and release scripts for the Gemini History Manager extension.

## Quick Reference

### Development Workflow
```bash
# Start fresh
pnpm dev-helper clean           # Remove all build artifacts

# Quick iteration
pnpm build:all                  # Build + package both browsers
pnpm dev                        # Watch mode for Firefox
pnpm dev:chrome                 # Watch mode for Chrome

# Quality checks
pnpm dev-helper lint-all        # Lint Firefox + Chrome builds
pnpm dev-helper format-fix      # Auto-format all code files

# Build verification
pnpm build:all --record         # Build + save for comparison
pnpm dev-helper compare         # Compare current version builds
```

### Release Workflow
```bash
# Preview release (recommended first step)
pnpm release --patch --dry-run  # See what would happen

# Execute release
pnpm release --patch            # Complete patch release process
pnpm release --minor            # Complete minor release process  
pnpm release --major            # Complete major release process

# Partial release (if GitHub step fails)
pnpm release --patch --skip-github  # Stop before GitHub release
pnpm release:create             # Create GitHub release separately
```

### Build Combinations
```bash
# Basic operations
pnpm build:all                  # Build Firefox + Chrome + package
pnpm build:all --clean          # Clean first, then build
pnpm package-record             # Same as: pnpm build:all --record

# Advanced verification
pnpm build:all --clean --record --compare  # Full build verification
pnpm compare-checksums          # Compare existing builds only
```

## Complete Workflow Guide

### Approach 1: Fully Automated Release (Recommended)

**Single command does everything:**
```bash
pnpm release --patch
```

**What happens automatically:**
1. ✅ Version bump in all files
2. ✅ Release notes creation/editing
3. ✅ Clean build for both browsers
4. ✅ Package into zip files
5. ✅ Record build for comparison
6. ✅ Git commit and tag
7. ✅ Push to remote
8. ✅ Create GitHub release with assets

**When to use:** Most releases, when you trust the automation

**Time required:** ~2-5 minutes (mostly waiting for builds)

### Approach 2: Cautious Release with Verification

**Step-by-step with verification:**
```bash
# 1. Preview what will happen
pnpm release --patch --dry-run

# 2. Build and verify first (optional)
pnpm build:all --clean --record --compare

# 3. Execute release (skips rebuild since files exist)
pnpm release --patch
```

**When to use:** 
- Important releases
- After significant code changes
- When you want to verify build consistency

**Time required:** ~5-10 minutes (includes manual verification)

### Approach 3: Manual Control Release

**Maximum control over each step:**
```bash
# 1. Build and verify
pnpm build:all --clean --record
pnpm compare-checksums

# 2. Version bump only
pnpm bump --patch

# 3. Manual git operations
git add package.json src/manifest-*.json README.md
git commit -m "chore: bump version to v1.2.4"
git push
git tag -a "v1.2.4" -m "Release 1.2.4"
git push origin "v1.2.4"

# 4. Create GitHub release
pnpm release:create
```

**When to use:**
- Complex releases requiring manual intervention
- When automation fails partway through
- Custom release notes or special procedures

**Time required:** ~10-15 minutes (lots of manual steps)

### Approach 4: Build Verification Workflow

**For testing build consistency without releasing:**
```bash
# Build multiple times and compare
pnpm build:all --clean --record
pnpm build:all --clean --record  # Build again
pnpm compare-checksums            # Should show no differences

# Or use the verification shortcut
pnpm build:all --clean --record --compare
```

**When to use:**
- Debugging build inconsistencies
- Verifying reproducible builds
- Before important releases

### Decision Tree: Which Approach?

```
Are you doing a routine patch/minor release?
├─ YES → Use Approach 1 (pnpm release --patch)
└─ NO → Continue...

Is this a major release or after big changes?
├─ YES → Use Approach 2 (verify first)
└─ NO → Continue...

Do you need custom release procedures?
├─ YES → Use Approach 3 (manual control)
└─ NO → Use Approach 1 (automated)

Are you debugging build issues?
├─ YES → Use Approach 4 (verification only)
└─ NO → Use Approach 1 (automated)
```

### What Gets Built and When

**During `pnpm release --patch`:**
- Builds are created fresh every time
- No reuse of existing `dist-*` directories
- Build is recorded automatically for comparison
- Checksums are NOT compared automatically (use Approach 2 for that)

**Build artifacts created:**
```
dist-firefox/           # Firefox extension files
├── manifest.json
├── background.js
├── popup/
├── dashboard/
└── ...

dist-chrome/            # Chrome extension files  
├── manifest.json
├── background.js
├── popup/
├── dashboard/
└── ...

dist-zip/               # Packaged extensions
├── gemini_history_manager_firefox-1.2.4.zip
└── gemini_history_manager_chrome-1.2.4.zip

dist-record/1.2.4/      # Build history
└── build-1/
    ├── dist-firefox/
    ├── dist-chrome/
    └── dist-zip/
```

### Recovery Scenarios

**If automated release fails at step 3 (building):**
```bash
# Fix the build issue, then retry
pnpm release --patch  # Will rebuild from scratch
```

**If automated release fails at step 7 (GitHub):**
```bash
# Version was bumped and pushed, just create GitHub release
pnpm release:create
```

**If you want to verify before GitHub release:**
```bash
# Stop before GitHub step
pnpm release --patch --skip-github

# Verify the build/release locally
# Then create GitHub release manually
pnpm release:create
```

### Workflow FAQ

**Q: Do I need to build before running `pnpm release --patch`?**
A: No! The release script builds everything fresh automatically. Any existing `dist-*` directories are ignored.

**Q: Does the release script compare checksums automatically?**
A: No. It records the build for later comparison, but doesn't compare automatically. Use `pnpm build:all --record --compare` if you want verification.

**Q: Can I reuse an existing build for release?**
A: No. The release script always builds fresh to ensure consistency. This prevents issues with stale build artifacts.

**Q: What if I want to test the build before releasing?**
A: Use the cautious approach:
```bash
pnpm build:all --clean --record --compare  # Build and verify
pnpm release --patch --dry-run             # Preview release
pnpm release --patch                       # Execute if satisfied
```

**Q: How do I know if my builds are consistent?**
A: Run multiple builds and compare:
```bash
pnpm build:all --clean --record  # Build 1
pnpm build:all --clean --record  # Build 2  
pnpm compare-checksums           # Should show identical checksums
```

**Q: Can I skip the GitHub release but keep everything else?**
A: Yes! Use `--skip-github`:
```bash
pnpm release --patch --skip-github  # Version bump + git operations only
pnpm release:create                  # Create GitHub release later
```

**Q: What's the difference between `pnpm package` and `pnpm build:all`?**
A: They're the same! `pnpm package` now calls `build-all.js` internally for consistency.

## Script Overview

### Core Scripts

#### `release.js` - Unified Release Script

**What it does:**
1. Bumps version in `package.json`, `manifest-*.json`, and `README.md`
2. Creates/opens release notes file (`release-notes/vX.X.X.md`)
3. Builds Firefox and Chrome extensions
4. Packages extensions into zip files
5. Records build for comparison
6. Commits changes and creates git tag
7. Pushes to remote repository
8. Creates GitHub release with zip attachments

**Arguments:**
- **Required**: Exactly one of `--major`, `--minor`, `--patch` (or `-M`, `-m`, `-p`)
- **Optional**: `--dry-run` - Shows what would happen without executing
- **Optional**: `--skip-github` - Stops before GitHub release creation

**Argument Combinations:**
```bash
# ✅ Valid combinations
pnpm release --patch                    # Full patch release
pnpm release --minor --dry-run          # Preview minor release
pnpm release --major --skip-github      # Release without GitHub
pnpm release --patch --dry-run --skip-github  # Preview without GitHub

# ❌ Invalid combinations
pnpm release --patch --minor            # Error: Only one version type allowed
pnpm release                            # Error: Version type required
pnpm release --dry-run                  # Error: Version type required
```

**What happens without arguments:**
- Script exits with error message showing usage
- No files are modified

#### `build-all.js` - Unified Build Script

**What it does by default:**
1. Builds Firefox extension (`dist-firefox/`)
2. Builds Chrome extension (`dist-chrome/`)
3. Creates zip packages (`dist-zip/`)
4. Shows build summary with file sizes

**Arguments (all optional, can be combined):**
- `--clean` - Removes `dist-firefox/`, `dist-chrome/`, `dist-zip/` before building
- `--record` - Saves build to `dist-record/VERSION/build-N/` for comparison
- `--compare` - Runs checksum comparison after building

**Argument Combinations:**
```bash
# ✅ All valid combinations
pnpm build:all                          # Basic build + package
pnpm build:all --clean                  # Clean then build
pnpm build:all --record                 # Build + save for comparison
pnpm build:all --compare                # Build + compare checksums
pnpm build:all --clean --record         # Clean, build, record
pnpm build:all --record --compare       # Build, record, compare
pnpm build:all --clean --record --compare  # All operations
```

**What happens without arguments:**
- Performs basic build and packaging
- No cleaning, recording, or comparison

#### `dev-helper.js` - Development Helper

**What it does:**
Provides shortcuts for common development tasks through subcommands.

**Subcommands:**
- `clean` - Removes all build directories
- `quick-build` - Calls `build-all.js` with no arguments
- `full-build` - Calls `build-all.js --record`
- `compare` - Runs checksum comparison on current version
- `lint-all` - Lints both Firefox and Chrome builds
- `format-fix` - Formats all code files
- `version` - Shows current version information
- `help` (or no argument) - Shows help message

**Usage Examples:**
```bash
# ✅ Valid usage
pnpm dev-helper clean                   # Clean build directories
pnpm dev-helper quick-build             # Fast build
pnpm dev-helper                         # Shows help
pnpm dev-helper help                    # Shows help
pnpm dev-helper invalid-command         # Shows help

# ❌ No argument combinations
# Each call takes exactly one subcommand
```

**What happens without arguments:**
- Shows help message with all available subcommands

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

### Common Error Scenarios

#### Release Script Errors

**"Error: Only one version bump argument is allowed"**
```bash
# ❌ This fails
pnpm release --patch --minor

# ✅ Use only one
pnpm release --patch
```

**"Error: GitHub CLI is not authenticated"**
```bash
# Fix with:
gh auth login
# Then retry release
```

**"Error: Release tag 'v1.2.3' already exists"**
- Tag already exists on GitHub
- Either delete the existing release or bump version again
- Check: `gh release list` to see existing releases

**"Error: Required file not found: dist-zip/..."**
- Build step failed before GitHub release
- Run `pnpm build:all` separately to debug
- Check for Vite build errors

#### Build Script Errors

**Build fails with Vite errors**
```bash
# Clean and retry
pnpm dev-helper clean
pnpm build:all

# Check dependencies
pnpm install
```

**"No builds found for version X.X.X" (during compare)**
- No recorded builds exist for that version
- Run `pnpm build:all --record` first
- Check `dist-record/` directory exists

#### File Permission Issues

**"EACCES: permission denied"**
- Node.js can't write to directories
- Check directory permissions
- Ensure you own the project directory

**"Command not found: gh"**
```bash
# Install GitHub CLI
# macOS: brew install gh
# Ubuntu: sudo apt install gh
# Or see: https://cli.github.com/
```

### Recovery Procedures

#### Partial Release Failure

If release fails after version bump but before GitHub release:

```bash
# 1. Check what was committed
git log --oneline -5

# 2. If version was bumped and pushed:
pnpm release:create  # Just create GitHub release

# 3. If you need to rollback:
git reset --hard HEAD~1  # Undo local commit
git push --force-with-lease  # Push rollback (dangerous!)
```

#### Build Directory Issues

If build directories get corrupted:

```bash
# Nuclear option - clean everything
pnpm dev-helper clean
rm -rf node_modules/.vite  # Clear Vite cache
pnpm install  # Reinstall dependencies
pnpm build:all  # Rebuild from scratch
```

#### Git State Issues

If git is in weird state during release:

```bash
# Check status
git status

# If files are staged but not committed:
git reset  # Unstage files
# Then retry release

# If merge conflict during release:
git status  # See conflicted files
# Resolve conflicts manually
git add .
git commit
# Then retry release
```

## Detailed Behavior

### What `pnpm release --patch` Actually Does

**Step-by-step execution:**
1. **Version Bump**: `1.2.3` → `1.2.4` in:
   - `package.json`
   - `src/manifest-chrome.json`
   - `src/manifest-firefox.json`
   - `README.md` (shield badge)

2. **Release Notes**: 
   - Creates `release-notes/v1.2.4.md` if missing
   - Opens editor for you to write release notes
   - Waits for you to save and close editor

3. **Build Process**:
   - `pnpm run build:firefox` → `dist-firefox/`
   - `pnpm run build:chrome` → `dist-chrome/`
   - `web-ext build` → `dist-zip/gemini_history_manager_firefox-1.2.4.zip`
   - `web-ext build` → `dist-zip/gemini_history_manager_chrome-1.2.4.zip`
   - Copies build to `dist-record/1.2.4/build-N/`

4. **Git Operations**:
   - `git add` all modified files + release notes
   - `git commit -m "chore: bump version to v1.2.4"`
   - `git push` to current branch
   - `git tag -a "v1.2.4" -m "Release 1.2.4"`
   - `git push origin "v1.2.4"`

5. **GitHub Release**:
   - `gh release create v1.2.4 --title "v1.2.4" --notes-file "release-notes/v1.2.4.md"`
   - Attaches both zip files as release assets

**Important Notes:**
- Build is recorded but checksums are NOT compared automatically
- If you want checksum verification, use `pnpm build:all --record --compare` first
- If any step fails, script stops immediately with no further steps executed
- Existing `dist-*` directories are cleaned and rebuilt fresh

### What `pnpm build:all --clean --record` Actually Does

**Step-by-step execution:**
1. **Clean** (`--clean`):
   - `rm -rf dist-firefox/`
   - `rm -rf dist-chrome/`
   - `rm -rf dist-zip/`

2. **Build**:
   - `TARGET_BROWSER=firefox vite build --outDir dist-firefox`
   - `TARGET_BROWSER=chrome vite build --outDir dist-chrome`

3. **Package**:
   - `web-ext build --config ./web-ext-config-firefox.cjs`
   - `web-ext build --config ./web-ext-config-chrome.cjs`

4. **Record** (`--record`):
   - Reads version from `package.json` (e.g., `0.18.7`)
   - Creates `dist-record/0.18.7/build-N/` (N = next build number)
   - Copies `dist-firefox/`, `dist-chrome/`, `dist-zip/` to build directory

5. **Summary**:
   - Shows file sizes of generated zip files
   - Reports success/failure

### Argument Processing Logic

**`release.js` argument validation:**
```javascript
// ✅ Exactly one version argument required
const versionArgs = args.filter(a => ["--major", "--minor", "--patch", "-M", "-m", "-p"].includes(a));
if (versionArgs.length !== 1) {
  console.error("Error: Exactly one version argument required");
  process.exit(1);
}

// ✅ Optional flags can be combined
const dryRun = args.includes("--dry-run");
const skipGithub = args.includes("--skip-github");
```

**`build-all.js` argument processing:**
```javascript
// ✅ All arguments are optional and can be combined
const shouldRecord = args.includes("--record");
const shouldCompare = args.includes("--compare");  
const shouldClean = args.includes("--clean");

// Each flag independently enables its behavior
```

### Debug and Preview Modes

**Dry Run Mode** (`--dry-run`):
- Shows every command that would be executed
- Prefixes output with "DRY RUN:"
- No files are modified
- No git operations performed
- No GitHub API calls made

**Example dry run output:**
```
$ pnpm release --patch --dry-run
>>> DRY RUN MODE ENABLED <<<

Releasing patch version: 0.18.7 → 0.18.8
DRY RUN: Would update package.json to version 0.18.8
DRY RUN: Would update src/manifest-chrome.json to version 0.18.8
--- DRY RUN: Command not executed ---
$ pnpm run build:all
```