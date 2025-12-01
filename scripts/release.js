/**
 * @file release.js
 * Release preparation script for PR-based workflow.
 *
 * This script prepares a release by:
 * 1. Bumping version in all version files
 * 2. Committing the version bump (with correct commit message for CI)
 * 3. Creating a release notes template (unstaged, for manual editing)
 *
 * After running this script, you should:
 * 1. Edit the release notes
 * 2. Commit the release notes
 * 3. Create a PR to main
 * 4. Merge the PR - GitHub Actions handles the rest
 *
 * Usage: bun release --[major|minor|patch] [--dry-run]
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { bumpVersion, updateVersionFile, getCurrentVersion, VERSION_FILES } from "./lib/utils.js";

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  const versionArgs = args.filter((arg) => ["--major", "--minor", "--patch", "-M", "-m", "-p"].includes(arg));

  if (versionArgs.length === 0) {
    console.error("Usage: bun release --[major|minor|patch] [--dry-run]");
    console.error("");
    console.error("Options:");
    console.error("  --major, -M    Bump major version (x.0.0)");
    console.error("  --minor, -m    Bump minor version (0.x.0)");
    console.error("  --patch, -p    Bump patch version (0.0.x)");
    console.error("  --dry-run      Preview changes without modifying files");
    process.exit(1);
  }

  if (versionArgs.length > 1) {
    console.error("Error: Only one version argument should be specified");
    process.exit(1);
  }

  const versionType = versionArgs[0];

  return {
    versionType: versionType
      .replace(/^-+/, "")
      .replace(/^[Mmp]$/, (m) => ({ M: "major", m: "minor", p: "patch" })[m]),
    dryRun: args.includes("--dry-run"),
  };
}

/**
 * Create release notes file if it doesn't exist
 */
function createReleaseNotes(version, dryRun) {
  const releaseNotesFile = `release-notes/v${version}.md`;

  if (fs.existsSync(releaseNotesFile)) {
    console.log(`  ✓ Release notes already exist: ${releaseNotesFile}`);
    return releaseNotesFile;
  }

  if (dryRun) {
    console.log(`  Would create: ${releaseNotesFile}`);
    return releaseNotesFile;
  }

  // Ensure directory exists
  fs.mkdirSync("release-notes", { recursive: true });

  // Create template (see docs/release-notes-guidelines.md for formatting rules)
  const template = `# Release v${version}

### ✨ New Features

### 🚀 Improvements

### 🐛 Bug Fixes

### ♻️ Refactoring
`;

  fs.writeFileSync(releaseNotesFile, template);
  console.log(`  ✓ Created: ${releaseNotesFile}`);

  return releaseNotesFile;
}

/**
 * Run pre-flight checks
 */
function runPreflightChecks() {
  console.log("Running pre-flight checks...\n");

  // Check if in a git repository
  try {
    execSync("git rev-parse --git-dir", { stdio: "pipe" });
  } catch {
    console.error("Error: Not in a git repository");
    process.exit(1);
  }

  // Check current branch (warning if on main)
  try {
    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    if (branch === "main" || branch === "master") {
      console.warn(`⚠ Warning: You are on '${branch}'.`);
      console.warn("  Consider creating a release branch: git checkout -b release/vX.X.X\n");
    } else {
      console.log(`  ✓ On branch '${branch}'`);
    }
  } catch {
    console.warn("  ⚠ Could not determine current branch");
  }

  // Check for uncommitted changes (required for auto-commit to work correctly)
  try {
    const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
    if (status) {
      console.error("  ✗ You have uncommitted changes. Commit or stash them first.\n");
      process.exit(1);
    } else {
      console.log("  ✓ Working directory is clean");
    }
  } catch (error) {
    console.warn("  ⚠ Could not check git status:", error.message);
  }

  console.log("");
}

/**
 * Main function
 */
function main() {
  const { versionType, dryRun } = parseArgs();

  console.log("╔══════════════════════════════════════════╗");
  console.log("║       Release Preparation Script         ║");
  console.log("╚══════════════════════════════════════════╝\n");

  if (dryRun) {
    console.log(">>> DRY RUN MODE - No files will be modified <<<\n");
  }

  // Run pre-flight checks (skip in dry-run)
  if (!dryRun) {
    runPreflightChecks();
  }

  // Calculate new version
  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, versionType);
  const tagName = `v${newVersion}`;

  console.log(`Version: ${currentVersion} → ${newVersion} (${versionType})\n`);

  // Step 1: Update version files
  console.log("Updating version files...");
  for (const file of VERSION_FILES) {
    updateVersionFile(file, newVersion, dryRun);
  }
  console.log("");

  // Step 2: Commit version bump (this ensures correct commit message for CI)
  console.log("Committing version bump...");
  const commitMessage = `chore: bump version to ${tagName}`;
  if (dryRun) {
    console.log(`  Would run: git add ${VERSION_FILES.join(" ")}`);
    console.log(`  Would run: git commit -m "${commitMessage}"`);
  } else {
    try {
      execSync(`git add ${VERSION_FILES.join(" ")}`, { stdio: "pipe" });
      execSync(`git commit -m "${commitMessage}"`, { stdio: "pipe" });
      console.log(`  ✓ Created commit: "${commitMessage}"`);
    } catch (error) {
      console.error("  ✗ Failed to create commit:", error.message);
      process.exit(1);
    }
  }
  console.log("");

  // Step 3: Create release notes (unstaged, for manual editing)
  console.log("Creating release notes template...");
  const releaseNotesFile = createReleaseNotes(newVersion, dryRun);
  console.log("");

  // Show next steps
  console.log("╔══════════════════════════════════════════╗");
  console.log("║            Next Steps                    ║");
  console.log("╚══════════════════════════════════════════╝\n");

  console.log(`1. Edit release notes:`);
  console.log(`   ${process.env.EDITOR || "vim"} ${releaseNotesFile}\n`);

  console.log(`2. Commit release notes:`);
  console.log(`   git add ${releaseNotesFile}`);
  console.log(`   git commit -m "docs: add release notes for ${tagName}"\n`);

  console.log(`3. Push and create PR:`);
  console.log(`   git push -u origin $(git branch --show-current)`);
  console.log(`   gh pr create --title "Release ${tagName}" --body "Release ${newVersion}"\n`);

  console.log(`4. After PR is merged, GitHub Actions will automatically:`);
  console.log(`   • Build Chrome and Firefox extensions`);
  console.log(`   • Create git tag ${tagName}`);
  console.log(`   • Create GitHub release with assets\n`);

  if (dryRun) {
    console.log(">>> DRY RUN COMPLETE - No files were modified <<<");
  } else {
    console.log(`✅ Release ${tagName} prepared successfully!`);
  }
}

main();
