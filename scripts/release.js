/**
 * @file release.js
 * Release preparation script for PR-based workflow.
 *
 * This script prepares a release by:
 * 1. Bumping version in all version files
 * 2. Creating a release notes template
 *
 * After running this script, you should:
 * 1. Edit the release notes
 * 2. Commit the changes
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

  // Create template
  const template = `# Release v${version}

## What's New

## Bug Fixes

## Technical Changes

## Breaking Changes (if any)
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

  // Check for uncommitted changes (warning only)
  try {
    const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
    if (status) {
      console.warn("  ⚠ You have uncommitted changes. They will be included in the release commit.\n");
    } else {
      console.log("  ✓ Working directory is clean");
    }
  } catch {
    // Ignore errors
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

  // Step 2: Create release notes
  console.log("Creating release notes...");
  const releaseNotesFile = createReleaseNotes(newVersion, dryRun);
  console.log("");

  // Show next steps
  const allFiles = [...VERSION_FILES, releaseNotesFile].join(" ");

  console.log("╔══════════════════════════════════════════╗");
  console.log("║            Next Steps                    ║");
  console.log("╚══════════════════════════════════════════╝\n");

  console.log(`1. Edit release notes:`);
  console.log(`   ${process.env.EDITOR || "vim"} ${releaseNotesFile}\n`);

  console.log(`2. Stage and commit:`);
  console.log(`   git add ${allFiles}`);
  console.log(`   git commit -m "chore: release ${tagName}"\n`);

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
