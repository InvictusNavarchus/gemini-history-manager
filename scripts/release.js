/**
 * @file release.js
 * Unified release script that handles version bumping, building, packaging, and GitHub release creation.
 * Usage: pnpm release --[major|minor|patch] [--dry-run] [--skip-github]
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const RELEASE_FILES = ["src/manifest-chrome.json", "src/manifest-firefox.json", "package.json", "README.md"];

/**
 * Executes a command with proper error handling
 */
function runCommand(command, options = {}) {
  const { dryRun = false, silent = false } = options;

  if (!silent) console.log(`\n$ ${command}`);

  if (dryRun) {
    console.log("--- DRY RUN: Command not executed ---");
    return;
  }

  try {
    return execSync(command, { stdio: silent ? "pipe" : "inherit", encoding: "utf-8" });
  } catch (error) {
    console.error(`\nCommand failed: ${command}`);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  const versionType = args.find((arg) => ["--major", "--minor", "--patch", "-M", "-m", "-p"].includes(arg));

  if (!versionType) {
    console.error("Usage: pnpm release --[major|minor|patch] [--dry-run] [--skip-github]");
    process.exit(1);
  }

  return {
    versionType: versionType
      .replace(/^-+/, "")
      .replace(/^[Mmp]$/, (m) => ({ M: "major", m: "minor", p: "patch" })[m]),
    dryRun: args.includes("--dry-run"),
    skipGithub: args.includes("--skip-github"),
  };
}

/**
 * Bump version in all relevant files
 */
function bumpVersion(currentVersion, type) {
  let [major, minor, patch] = currentVersion.split(".").map(Number);

  if (type === "major") {
    major++;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor++;
    patch = 0;
  } else if (type === "patch") {
    patch++;
  }

  return [major, minor, patch].join(".");
}

/**
 * Update version in JSON files
 */
function updateJsonFile(file, newVersion, dryRun) {
  if (dryRun) {
    console.log(`DRY RUN: Would update ${file} to version ${newVersion}`);
    return;
  }

  const content = JSON.parse(fs.readFileSync(file, "utf-8"));
  content.version = newVersion;
  fs.writeFileSync(file, JSON.stringify(content, null, 2) + "\n");
  console.log(`Updated ${file} to version ${newVersion}`);
}

/**
 * Update version badge in README
 */
function updateReadmeBadge(file, newVersion, dryRun) {
  if (dryRun) {
    console.log(`DRY RUN: Would update README badge to version ${newVersion}`);
    return;
  }

  const content = fs.readFileSync(file, "utf-8");
  const versionBadgeRegex =
    /(https:\/\/img\.shields\.io\/badge\/version-v)([0-9]+\.[0-9]+\.[0-9]+)(-blue\.svg)/;

  if (!versionBadgeRegex.test(content)) {
    throw new Error(`No version badge found in ${file}`);
  }

  const updatedContent = content.replace(versionBadgeRegex, `$1${newVersion}$3`);
  fs.writeFileSync(file, updatedContent);
  console.log(`Updated ${file} badge to version ${newVersion}`);
}

/**
 * Create release notes file if it doesn't exist
 */
function createReleaseNotes(version, dryRun) {
  const releaseNotesFile = `release-notes/v${version}.md`;

  if (fs.existsSync(releaseNotesFile)) {
    console.log(`Release notes already exist: ${releaseNotesFile}`);
    return releaseNotesFile;
  }

  if (dryRun) {
    console.log(`DRY RUN: Would create release notes file: ${releaseNotesFile}`);
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
  console.log(`Created release notes template: ${releaseNotesFile}`);
  console.log("Please edit the release notes before continuing...");

  // Open editor
  try {
    if (process.env.EDITOR) {
      runCommand(`${process.env.EDITOR} ${releaseNotesFile}`);
    } else {
      runCommand(`nano ${releaseNotesFile}`);
    }
  } catch (error) {
    console.log("Please edit the release notes manually and press Enter to continue...");
    // Simple readline for user input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", () => process.exit(0));
  }

  return releaseNotesFile;
}

/**
 * Main release function
 */
async function main() {
  const { versionType, dryRun, skipGithub } = parseArgs();

  if (dryRun) {
    console.log(">>> DRY RUN MODE ENABLED <<<\n");
  }

  // Get current version
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  const currentVersion = packageJson.version;
  const newVersion = bumpVersion(currentVersion, versionType);
  const tagName = `v${newVersion}`;

  console.log(`Releasing ${versionType} version: ${currentVersion} → ${newVersion}`);

  // 1. Update version in all files
  console.log("\n=== Updating Version Files ===");
  for (const file of RELEASE_FILES) {
    if (file === "README.md") {
      updateReadmeBadge(file, newVersion, dryRun);
    } else {
      updateJsonFile(file, newVersion, dryRun);
    }
  }

  // 2. Create release notes
  console.log("\n=== Creating Release Notes ===");
  const releaseNotesFile = createReleaseNotes(newVersion, dryRun);

  // 3. Build and package
  console.log("\n=== Building and Packaging ===");
  runCommand("pnpm run build:all", { dryRun });
  runCommand("pnpm run package", { dryRun });
  runCommand("pnpm run record-build", { dryRun });

  // 4. Git operations
  console.log("\n=== Git Operations ===");
  const filesToAdd = [...RELEASE_FILES, releaseNotesFile].join(" ");
  runCommand(`git add ${filesToAdd}`, { dryRun });
  runCommand(`git commit -m "chore: bump version to ${tagName}"`, { dryRun });
  runCommand("git push", { dryRun });
  runCommand(`git tag -a "${tagName}" -m "Release ${newVersion}"`, { dryRun });
  runCommand(`git push origin "${tagName}"`, { dryRun });

  // 5. GitHub release (optional)
  if (!skipGithub) {
    console.log("\n=== Creating GitHub Release ===");

    // Check required files exist
    const chromeZip = `dist-zip/gemini_history_manager_chrome-${newVersion}.zip`;
    const firefoxZip = `dist-zip/gemini_history_manager_firefox-${newVersion}.zip`;

    if (!dryRun && (!fs.existsSync(chromeZip) || !fs.existsSync(firefoxZip))) {
      console.error("Error: Required zip files not found. Package step may have failed.");
      process.exit(1);
    }

    const releaseCommand = `gh release create ${tagName} \\
      --title "${tagName}" \\
      --notes-file "${releaseNotesFile}" \\
      "${chromeZip}" \\
      "${firefoxZip}"`;

    runCommand(releaseCommand, { dryRun });
  }

  console.log(`\n✅ Release ${tagName} completed successfully!`);

  if (!skipGithub && !dryRun) {
    console.log(`🚀 GitHub release: https://github.com/your-repo/releases/tag/${tagName}`);
  }
}

main().catch((error) => {
  console.error("Release failed:", error.message);
  process.exit(1);
});
