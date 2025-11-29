/**
 * @file release.js
 * Unified release script that handles version bumping, building, packaging, and GitHub release creation.
 * Usage: bun release --[major|minor|patch] [--dry-run] [--skip-github]
 */
import fs from "fs";
import { execSync } from "child_process";
import { runCommand, bumpVersion, updateVersionFile, getCurrentVersion, VERSION_FILES } from "./lib/utils.js";

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  const versionArgs = args.filter((arg) => ["--major", "--minor", "--patch", "-M", "-m", "-p"].includes(arg));

  if (versionArgs.length === 0) {
    console.error("Usage: bun release --[major|minor|patch] [--dry-run] [--skip-github]");
    process.exit(1);
  }

  if (versionArgs.length > 1) {
    console.error(
      "Error: Only one version argument should be specified (--major, --minor, --patch, -M, -m, -p)"
    );
    process.exit(1);
  }

  const versionType = versionArgs[0];

  return {
    versionType: versionType
      .replace(/^-+/, "")
      .replace(/^[Mmp]$/, (m) => ({ M: "major", m: "minor", p: "patch" })[m]),
    dryRun: args.includes("--dry-run"),
    skipGithub: args.includes("--skip-github"),
  };
}

/**
 * Create release notes file if it doesn't exist
 */
async function createReleaseNotes(version, dryRun) {
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
    await new Promise((resolve) => {
      try {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once("data", () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve();
        });
      } catch (stdinError) {
        // Ensure terminal mode is restored even on error
        try {
          process.stdin.setRawMode(false);
          process.stdin.pause();
        } catch (restoreError) {
          // Ignore restore errors
        }
        resolve();
      }
    });
  }

  return releaseNotesFile;
}

/**
 * Run pre-flight checks before release
 */
function runPreflightChecks(options = {}) {
  const { dryRun = false, skipGithub = false } = options;

  console.log("=== Running Pre-flight Checks ===\n");

  // 1. Check if working directory is clean
  console.log("Checking working directory status...");
  try {
    const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
    if (status) {
      console.error("Error: Working directory is not clean. Please commit or stash your changes first.");
      console.error("\nUncommitted changes:");
      console.error(status);
      process.exit(1);
    }
    console.log("  ✓ Working directory is clean");
  } catch (error) {
    console.error("Error: Failed to check git status. Are you in a git repository?");
    process.exit(1);
  }

  // 2. Check if on main branch (warning only, not blocking)
  console.log("Checking current branch...");
  try {
    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    if (branch !== "main" && branch !== "master") {
      console.warn(`  ⚠ Warning: You are on branch '${branch}', not 'main' or 'master'.`);
      console.warn("    Releases are typically done from the main branch.");
    } else {
      console.log(`  ✓ On branch '${branch}'`);
    }
  } catch (error) {
    console.warn("  ⚠ Warning: Could not determine current branch.");
  }

  // 3. Check if local branch is up to date with remote
  console.log("Checking if branch is up to date with remote...");
  try {
    execSync("git fetch", { stdio: "pipe" });
    const localHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    let remoteHash;
    try {
      remoteHash = execSync(`git rev-parse origin/${branch}`, { encoding: "utf-8" }).trim();
    } catch {
      // Remote branch might not exist
      console.log("  ✓ No remote tracking branch (new branch)");
      remoteHash = localHash;
    }
    if (localHash !== remoteHash) {
      const behind = execSync(`git rev-list --count HEAD..origin/${branch}`, { encoding: "utf-8" }).trim();
      const ahead = execSync(`git rev-list --count origin/${branch}..HEAD`, { encoding: "utf-8" }).trim();
      if (parseInt(behind) > 0) {
        console.error(`Error: Your branch is ${behind} commit(s) behind origin/${branch}.`);
        console.error("Please pull the latest changes first: git pull");
        process.exit(1);
      }
      if (parseInt(ahead) > 0) {
        console.log(`  ✓ Branch is ${ahead} commit(s) ahead of remote (will be pushed)`);
      }
    } else {
      console.log("  ✓ Branch is up to date with remote");
    }
  } catch (error) {
    console.warn("  ⚠ Warning: Could not check remote status. Continuing anyway.");
  }

  // 4. Check GitHub CLI authentication (only if not skipping GitHub)
  if (!skipGithub) {
    console.log("Checking GitHub CLI authentication...");
    try {
      execSync("gh auth status", { stdio: "pipe" });
      console.log("  ✓ GitHub CLI is authenticated");
    } catch (error) {
      console.error("Error: GitHub CLI is not authenticated.");
      console.error(
        "Please run 'gh auth login' to authenticate, or use --skip-github to skip GitHub release."
      );
      process.exit(1);
    }
  } else {
    console.log("Skipping GitHub CLI check (--skip-github specified)");
  }

  console.log("\n✓ All pre-flight checks passed!\n");
}

/**
 * Get repository URL from git remote or package.json
 */
function getRepositoryUrl() {
  try {
    // Try to get from git remote
    const remoteUrl = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();

    // Convert SSH URL to HTTPS if needed
    if (remoteUrl.startsWith("git@github.com:")) {
      return remoteUrl.replace("git@github.com:", "https://github.com/").replace(".git", "");
    }

    // Remove .git suffix if present
    return remoteUrl.replace(/\.git$/, "");
  } catch (error) {
    // Fallback to package.json repository field
    try {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
      if (packageJson.repository) {
        if (typeof packageJson.repository === "string") {
          return packageJson.repository;
        }
        return packageJson.repository.url?.replace(/^git\+/, "").replace(/\.git$/, "");
      }
    } catch (e) {
      // Ignore package.json errors
    }

    console.warn("Warning: Could not determine repository URL. GitHub release URL will not be displayed.");
    return null;
  }
}

/**
 * Main release function
 */
async function main() {
  const { versionType, dryRun, skipGithub } = parseArgs();

  if (dryRun) {
    console.log(">>> DRY RUN MODE ENABLED <<<\n");
  }

  // Run pre-flight checks (skip in dry-run mode since we won't actually do anything)
  if (!dryRun) {
    runPreflightChecks({ dryRun, skipGithub });
  } else {
    console.log("=== Pre-flight Checks (skipped in dry-run mode) ===\n");
  }

  // Get current version
  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, versionType);
  const tagName = `v${newVersion}`;

  console.log(`Releasing ${versionType} version: ${currentVersion} → ${newVersion}`);

  // 1. Update version in all files
  console.log("\n=== Updating Version Files ===");
  for (const file of VERSION_FILES) {
    updateVersionFile(file, newVersion, dryRun);
  }

  // 2. Create release notes
  console.log("\n=== Creating Release Notes ===");
  const releaseNotesFile = await createReleaseNotes(newVersion, dryRun);

  // 3. Build, package, and record
  console.log("\n=== Building and Packaging ===");
  runCommand("bun run build:all --record", { dryRun });

  // 4. Git operations
  console.log("\n=== Git Operations ===");
  const filesToAdd = [...VERSION_FILES, releaseNotesFile].join(" ");
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
    const repoUrl = getRepositoryUrl();
    if (repoUrl) {
      console.log(`🚀 GitHub release: ${repoUrl}/releases/tag/${tagName}`);
    }
  }
}

main().catch((error) => {
  console.error("Release failed:", error.message);
  process.exit(1);
});
