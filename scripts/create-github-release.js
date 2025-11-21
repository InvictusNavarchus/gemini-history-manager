import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Executes a shell command and streams its output. Exits the process on error.
 * @param {string} command - The command to execute.
 * @param {boolean} dryRun - If true, logs the command instead of executing it.
 */
function runCommand(command, dryRun = false) {
  console.log(`\n$ ${command}`);
  if (dryRun) {
    console.log("--- DRY RUN: Command not executed. ---");
    return;
  }
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error("\nCommand failed. Aborting.");
    process.exit(1);
  }
}

/**
 * The main function to orchestrate the release creation process.
 */
function main() {
  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log(">>> DRY RUN MODE ENABLED: No actual commands will be executed. <<<");
  }

  // 1. Check for GitHub CLI
  try {
    execSync("gh --version", { stdio: "pipe" });
  } catch (error) {
    console.error("Error: GitHub CLI ('gh') is not installed or not in your PATH.");
    console.error("Please install it to create GitHub releases. See: https://cli.github.com/");
    process.exit(1);
  }

  // 2. Get the current version from package.json
  const packageJsonPath = path.resolve("package.json");
  if (!fs.existsSync(packageJsonPath)) {
    console.error("Error: package.json not found. Please run this script from the project root.");
    process.exit(1);
  }
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const version = packageJson.version;
  const tagName = `v${version}`;
  console.log(`Preparing to create GitHub release for version: ${version} (tag: ${tagName})`);

  // 3. Define paths for release notes and assets
  const releaseNotesFile = `${tagName}.md`;
  const releaseNotesPath = path.resolve("release-notes", releaseNotesFile);
  const chromeAssetPath = path.resolve(`dist-zip/gemini_history_manager_chrome-${version}.zip`);
  const firefoxAssetPath = path.resolve(`dist-zip/gemini_history_manager_firefox-${version}.zip`);

  // 4. Check if all required files exist
  const requiredFiles = [releaseNotesPath, chromeAssetPath, firefoxAssetPath];
  let allFilesFound = true;
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`Error: Required file not found: ${file}`);
      allFilesFound = false;
    }
  }

  if (!allFilesFound) {
    console.error("\nPlease ensure the version is correct and the `bun run package` script has been run.");
    process.exit(1);
  }
  console.log("All required release assets found.");

  // 5. Validate GitHub CLI authentication
  try {
    execSync("gh auth status --hostname github.com", { stdio: "pipe" });
  } catch (error) {
    console.error("Error: GitHub CLI is not authenticated for github.com.");
    console.error("Please run 'gh auth login' to authenticate.");
    process.exit(1);
  }
  console.log("GitHub CLI authentication verified.");

  // 6. Check if release tag already exists
  try {
    execSync(`gh release view ${tagName}`, { stdio: "pipe" });
    console.error(`Error: Release tag '${tagName}' already exists on GitHub.`);
    console.error("Please delete the existing release or bump the version number.");
    process.exit(1);
  } catch (error) {
    // Expected behavior - release should not exist yet
    console.log(`Release tag '${tagName}' does not exist - good to proceed.`);
  }

  // 7. Verify release notes file is not empty
  const releaseNotesStats = fs.statSync(releaseNotesPath);
  if (releaseNotesStats.size === 0) {
    console.error(`Error: Release notes file '${releaseNotesPath}' is empty.`);
    console.error("Please add content to the release notes before creating the release.");
    process.exit(1);
  }
  console.log("Release notes file contains content.");

  // 8. Construct and execute the 'gh release create' command
  const command = `gh release create ${tagName} \\
    --title "${tagName}" \\
    --notes-file "${releaseNotesPath}" \\
    "${chromeAssetPath}" \\
    "${firefoxAssetPath}"`;

  runCommand(command, isDryRun);

  if (!isDryRun) {
    console.log(`\n✅ Successfully created GitHub release for ${tagName}.`);
  }
}

main();
