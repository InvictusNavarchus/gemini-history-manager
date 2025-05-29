#!/usr/bin/env node
/**
 * @file bump-version.js
 * Bumps the version in package.json, src/manifest-chrome.json, and src/manifest-firefox.json.
 * Usage: pnpm bump --[major|minor|patch] or -[M|m|p]
 */
import fs from "fs";
import path from "path";

const files = [
  path.join("src", "manifest-chrome.json"),
  path.join("src", "manifest-firefox.json"),
  "package.json",
];

/**
 * Parses CLI arguments to determine the type of version bump.
 * @returns {('major'|'minor'|'patch')|null} The type of version bump, or null if not specified.
 */
function parseArgs() {
  const arg = process.argv.slice(2).find((a) => a.startsWith("-") || a.startsWith("--"));
  if (!arg) return null;
  if (arg === "--major" || arg === "-M") return "major";
  if (arg === "--minor" || arg === "-m") return "minor";
  if (arg === "--patch" || arg === "-p") return "patch";
  return null;
}

/**
 * Bumps the given semantic version string according to the specified type.
 * @param {string} version - The current version string (e.g., "1.2.3").
 * @param {'major'|'minor'|'patch'} type - The type of version bump.
 * @returns {string} The new version string.
 */
function bumpVersion(version, type) {
  let [major, minor, patch] = version.split(".").map(Number);
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
 * Updates the version field in the specified JSON file.
 * @param {string} file - Path to the JSON file.
 * @param {string} newVersion - The new version string to set.
 * @throws If the file does not have a version field.
 */
function updateFile(file, newVersion) {
  const content = fs.readFileSync(file, "utf-8");
  const json = JSON.parse(content);
  if (!json.version) throw new Error(`No version field in ${file}`);
  json.version = newVersion;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`Updated ${file} to version ${newVersion}`);
}

/**
 * Main entry point: parses arguments, bumps version, and updates all relevant files.
 */
function main() {
  const type = parseArgs();
  if (!type) {
    console.error("Usage: pnpm bump --[major|minor|patch] or -[M|m|p]");
    process.exit(1);
  }
  // Read version from package.json
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  const newVersion = bumpVersion(pkg.version, type);
  files.forEach((file) => updateFile(file, newVersion));
}

main();
