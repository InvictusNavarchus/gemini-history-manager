/**
 * @file record-build.js
 * Records the current build to dist-record/ for checksum comparison.
 * Usage: bun run record-build
 */
import fs from "fs-extra";
import path from "node:path";
import { getCurrentVersion, ROOT_DIR } from "./lib/utils.js";

const version = getCurrentVersion();

// Create dist-record directory if it doesn't exist
const distRecordDir = path.join(ROOT_DIR, "dist-record");
fs.ensureDirSync(distRecordDir);

// Create version directory if it doesn't exist
const versionDir = path.join(distRecordDir, version);
fs.ensureDirSync(versionDir);

// Determine the next build number
const existingBuilds = fs
  .readdirSync(versionDir)
  .filter((dir) => dir.startsWith("build-"))
  .map((dir) => parseInt(dir.replace("build-", ""), 10))
  .filter((num) => !isNaN(num));

const nextBuildNumber = existingBuilds.length > 0 ? Math.max(...existingBuilds) + 1 : 1;
const buildDir = path.join(versionDir, `build-${nextBuildNumber}`);

// Create build directory
fs.ensureDirSync(buildDir);

// Copy dist-firefox, dist-chrome, and their zip contents to the build directory
const distFirefoxDir = path.join(ROOT_DIR, "dist-firefox");
const distChromeDir = path.join(ROOT_DIR, "dist-chrome");
const distZipDir = path.join(ROOT_DIR, "dist-zip");

// Warn if no build artifacts exist
if (!fs.existsSync(distFirefoxDir) && !fs.existsSync(distChromeDir) && !fs.existsSync(distZipDir)) {
  console.warn("⚠ Warning: No build artifacts found. Did you run 'bun build:all' first?");
}

// Handle Firefox dist directory
if (fs.existsSync(distFirefoxDir)) {
  const distFirefoxTargetDir = path.join(buildDir, "dist-firefox");
  fs.ensureDirSync(distFirefoxTargetDir);
  fs.copySync(distFirefoxDir, distFirefoxTargetDir);
  console.log(`Copied dist-firefox/ to ${path.relative(ROOT_DIR, distFirefoxTargetDir)}`);
}

// Handle Chrome dist directory
if (fs.existsSync(distChromeDir)) {
  const distChromeTargetDir = path.join(buildDir, "dist-chrome");
  fs.ensureDirSync(distChromeTargetDir);
  fs.copySync(distChromeDir, distChromeTargetDir);
  console.log(`Copied dist-chrome/ to ${path.relative(ROOT_DIR, distChromeTargetDir)}`);
}

// Handle dist-zip directory (which may contain both Firefox and Chrome zips)
if (fs.existsSync(distZipDir)) {
  const distZipTargetDir = path.join(buildDir, "dist-zip");
  fs.ensureDirSync(distZipTargetDir);
  fs.copySync(distZipDir, distZipTargetDir);
  console.log(`Copied dist-zip/ to ${path.relative(ROOT_DIR, distZipTargetDir)}`);
}

console.log(`Recorded build ${nextBuildNumber} for version ${version}`);
