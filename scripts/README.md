# Scripts Documentation

This directory contains build and release scripts for the Gemini History Manager extension.

## Quick Reference

### Development
```bash
bun dev-helper clean           # Remove all build artifacts
bun build:all                  # Build + package both browsers
bun dev                        # Watch mode for Firefox
bun dev:chrome                 # Watch mode for Chrome
bun dev-helper lint-all        # Lint Firefox + Chrome builds
bun dev-helper format-fix      # Auto-format all code files
```

### Release
```bash
bun release --patch            # Prepare a patch release (0.0.x)
bun release --minor            # Prepare a minor release (0.x.0)
bun release --major            # Prepare a major release (x.0.0)
bun release --patch --dry-run  # Preview what would change
```

## Release Workflow

This project uses a **PR-based release workflow**. The release process is split between local preparation and automated CI/CD.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     LOCAL (You)                             │
├─────────────────────────────────────────────────────────────┤
│  1. bun release --patch                                     │
│     → Updates version in package.json, manifests, README    │
│     → Creates release notes template                        │
│                                                             │
│  2. Edit release notes                                      │
│     → vim release-notes/vX.X.X.md                          │
│                                                             │
│  3. Commit and create PR                                    │
│     → git add . && git commit -m "chore: release vX.X.X"   │
│     → git push && gh pr create                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   GITHUB (Automated)                        │
├─────────────────────────────────────────────────────────────┤
│  4. Review and merge PR                                     │
│                                                             │
│  5. GitHub Actions automatically:                           │
│     → Builds Chrome and Firefox extensions                  │
│     → Creates git tag vX.X.X                               │
│     → Creates GitHub release with zip attachments          │
└─────────────────────────────────────────────────────────────┘
```

### Step-by-Step Guide

#### 1. Prepare the Release

```bash
# Create a release branch (optional but recommended)
git checkout main && git pull
git checkout -b release/v0.19.0

# Run the release preparation script
bun release --patch   # or --minor, --major
```

The script will:
- Update version in `package.json`, `manifest-chrome.json`, `manifest-firefox.json`, and `README.md`
- Create `release-notes/vX.X.X.md` with a template

#### 2. Edit Release Notes

```bash
# Edit the generated release notes
vim release-notes/v0.19.0.md
```

#### 3. Commit and Create PR

```bash
# Stage all changes
git add package.json src/manifest-*.json README.md release-notes/

# Commit with the release message format
git commit -m "chore: release v0.19.0"

# Push and create PR
git push -u origin release/v0.19.0
gh pr create --title "Release v0.19.0" --body "Release version 0.19.0"
```

#### 4. Merge the PR

After review, merge the PR to main. GitHub Actions will automatically:
- Build Chrome and Firefox extensions
- Create the git tag `v0.19.0`
- Create a GitHub release with the zip files attached

### Why This Workflow?

| Benefit | Description |
|---------|-------------|
| **Reproducible builds** | Extensions are built in CI, not on your machine |
| **Auditable** | Every release goes through PR review |
| **No "works on my machine"** | CI environment is consistent |
| **Atomic releases** | Tag and release are created from the exact merged code |

## Script Reference

### `release.js` - Release Preparation

Prepares a release by updating version files and creating release notes.

```bash
bun release --patch            # Bump patch version (0.0.x)
bun release --minor            # Bump minor version (0.x.0)
bun release --major            # Bump major version (x.0.0)
bun release --patch --dry-run  # Preview changes without modifying files
```

**What it does:**
1. Bumps version in `package.json`, `manifest-*.json`, and `README.md` badge
2. Creates `release-notes/vX.X.X.md` template
3. Shows next steps for creating a PR

**What it does NOT do:**
- Build the extension (GitHub Actions does this)
- Create git tags (GitHub Actions does this)
- Create GitHub releases (GitHub Actions does this)

### `build-all.js` - Build Script

Builds and packages the extension for both browsers.

```bash
bun build:all                  # Build Firefox + Chrome + package
bun build:all --clean          # Clean first, then build
bun build:all --record         # Build + save for comparison
bun build:all --compare        # Build + compare checksums (needs 2+ builds)
```

### `dev-helper.js` - Development Helper

Provides shortcuts for common development tasks.

```bash
bun dev-helper clean           # Remove all build directories
bun dev-helper quick-build     # Fast build (no recording)
bun dev-helper full-build      # Build with recording
bun dev-helper compare         # Compare checksums
bun dev-helper lint-all        # Lint both builds
bun dev-helper format-fix      # Format all code files
bun dev-helper version         # Show current version
bun dev-helper help            # Show help
```

### `record-build.js` - Build Recording

Records builds in `dist-record/` for checksum comparison.

### `compare-checksums.js` - Build Verification

Compares checksums across different builds to verify reproducibility.

```bash
bun compare-checksums              # Compare current version
bun compare-checksums 0.18.8       # Compare specific version
```

## GitHub Actions Workflow

The release workflow (`.github/workflows/release.yml`) triggers on:
- Push to `main` branch
- When `package.json` is modified
- When commit message matches `chore: release vX.X.X`

It will:
1. Build extensions using Bun
2. Create and push the git tag
3. Create GitHub release with Chrome and Firefox zip files

## Troubleshooting

### Release didn't trigger

Check that your commit message follows the format:

```text
chore: release v0.19.0
```

Or for squash-merged PRs:

```text
Release v0.19.0 (#123)
```

### Build failed in CI

1. Check the Actions tab for error details
2. Try building locally: `bun build:all`
3. Ensure all dependencies are in `package.json`

### Tag already exists

If you need to re-release the same version:
```bash
# Delete the tag locally and remotely
git tag -d v0.19.0
git push origin :refs/tags/v0.19.0

# Delete the GitHub release manually, then re-merge or re-run the workflow
```
