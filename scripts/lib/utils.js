/**
 * @file scripts/lib/utils.js
 * Shared utilities for build and release scripts.
 * Consolidates common functions to reduce code duplication.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

// Resolve root directory relative to this module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "../..");

/**
 * Files that contain version information and need to be updated during releases.
 */
export const VERSION_FILES = [
  "src/manifest-chrome.json",
  "src/manifest-firefox.json",
  "package.json",
  "README.md",
];

/**
 * Executes a shell command with proper error handling.
 * @param {string} command - The command to execute.
 * @param {Object} options - Execution options.
 * @param {boolean} [options.dryRun=false] - If true, logs the command without executing.
 * @param {boolean} [options.silent=false] - If true, suppresses stdout/stderr.
 * @param {string} [options.cwd] - Working directory for the command.
 * @returns {string|undefined} Command output if silent mode, undefined otherwise.
 */
export function runCommand(command, options = {}) {
  const { dryRun = false, silent = false, cwd = ROOT_DIR } = options;

  if (!silent) console.log(`\n$ ${command}`);

  if (dryRun) {
    console.log("--- DRY RUN: Command not executed ---");
    return;
  }

  try {
    return execSync(command, {
      stdio: silent ? "pipe" : "inherit",
      encoding: "utf-8",
      cwd,
    });
  } catch (error) {
    console.error(`\nCommand failed: ${command}`);
    process.exit(1);
  }
}

/**
 * Bumps a semantic version string according to the specified type.
 * @param {string} currentVersion - The current version string (e.g., "1.2.3").
 * @param {'major'|'minor'|'patch'} type - The type of version bump.
 * @returns {string} The new version string.
 */
export function bumpVersion(currentVersion, type) {
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
 * Updates the version field in a JSON file.
 * @param {string} file - Path to the JSON file (relative to ROOT_DIR or absolute).
 * @param {string} newVersion - The new version string to set.
 * @param {boolean} [dryRun=false] - If true, logs what would happen without modifying.
 * @throws {Error} If the file does not have a version field.
 */
export function updateJsonFile(file, newVersion, dryRun = false) {
  const filePath = path.isAbsolute(file) ? file : path.join(ROOT_DIR, file);

  if (dryRun) {
    console.log(`DRY RUN: Would update ${file} to version ${newVersion}`);
    return;
  }

  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!content.version) {
    throw new Error(`No version field in ${file}`);
  }
  content.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n");
  console.log(`Updated ${file} to version ${newVersion}`);
}

/**
 * Updates the version badge in README.md.
 * @param {string} file - Path to the README.md file (relative to ROOT_DIR or absolute).
 * @param {string} newVersion - The new version string to set.
 * @param {boolean} [dryRun=false] - If true, logs what would happen without modifying.
 * @throws {Error} If no version badge pattern is found in the file.
 */
export function updateReadmeBadge(file, newVersion, dryRun = false) {
  const filePath = path.isAbsolute(file) ? file : path.join(ROOT_DIR, file);

  if (dryRun) {
    console.log(`DRY RUN: Would update README badge to version ${newVersion}`);
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const versionBadgeRegex =
    /(https:\/\/img\.shields\.io\/badge\/version-v)([0-9]+\.[0-9]+\.[0-9]+)(-blue\.svg)/;

  if (!versionBadgeRegex.test(content)) {
    throw new Error(`No version badge found in ${file}`);
  }

  const updatedContent = content.replace(versionBadgeRegex, `$1${newVersion}$3`);
  fs.writeFileSync(filePath, updatedContent);
  console.log(`Updated ${file} badge to version ${newVersion}`);
}

/**
 * Updates version in the appropriate file based on file type.
 * @param {string} file - Path to the file.
 * @param {string} newVersion - The new version string to set.
 * @param {boolean} [dryRun=false] - If true, logs what would happen without modifying.
 */
export function updateVersionFile(file, newVersion, dryRun = false) {
  if (file === "README.md" || file.endsWith("/README.md")) {
    updateReadmeBadge(file, newVersion, dryRun);
  } else {
    updateJsonFile(file, newVersion, dryRun);
  }
}

/**
 * Reads the current version from package.json.
 * @returns {string} The current version string.
 */
export function getCurrentVersion() {
  return getPackageJson().version;
}

/**
 * Reads and parses package.json.
 * @returns {Object} The parsed package.json content.
 */
export function getPackageJson() {
  const packageJsonPath = path.join(ROOT_DIR, "package.json");
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
}

/**
 * Clean build directories
 */
export function cleanBuildDirs() {
  const dirsToClean = ["dist-firefox", "dist-chrome", "dist-zip"];

  console.log("🧹 Cleaning build directories...");
  dirsToClean.forEach((dir) => {
    const dirPath = path.join(ROOT_DIR, dir);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`  Removed ${dir}/`);
    }
  });
}
