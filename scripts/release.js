/**
 * @file release.js
 * Unified release script that handles version bumping, building, packaging, and GitHub release creation.
 * Usage: bun release --[major|minor|patch] [--dry-run] [--skip-github]
 */
import fs from "fs";
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
  const releaseNotesFile = await createReleaseNotes(newVersion, dryRun);

  // 3. Build and package
  console.log("\n=== Building and Packaging ===");
  runCommand("bun run build:all", { dryRun });
  runCommand("bun run package", { dryRun });
  runCommand("bun run record-build", { dryRun });

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
