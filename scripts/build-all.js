/**
 * @file build-all.js
 * Unified build script that handles building, packaging, and optionally recording builds.
 * Usage: pnpm build-all [--record] [--compare] [--clean]
 */
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

/**
 * Execute command with error handling
 */
function runCommand(command, options = {}) {
  const { silent = false } = options;

  if (!silent) console.log(`\n$ ${command}`);

  try {
    return execSync(command, {
      stdio: silent ? "pipe" : "inherit",
      encoding: "utf-8",
      cwd: rootDir,
    });
  } catch (error) {
    console.error(`\nCommand failed: ${command}`);
    process.exit(1);
  }
}

/**
 * Clean build directories
 */
function cleanBuildDirs() {
  const dirsToClean = ["dist-firefox", "dist-chrome", "dist-zip"];

  console.log("🧹 Cleaning build directories...");
  dirsToClean.forEach((dir) => {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
      fs.removeSync(dirPath);
      console.log(`  Removed ${dir}/`);
    }
  });
}

/**
 * Build for all browsers
 */
function buildAll() {
  console.log("🔨 Building for all browsers...");
  runCommand("pnpm run build:firefox");
  runCommand("pnpm run build:chrome");
}

/**
 * Package for all browsers
 */
function packageAll() {
  console.log("📦 Packaging extensions...");
  runCommand("pnpm run package:firefox");
  runCommand("pnpm run package:chrome");
}

/**
 * Record build for comparison
 */
function recordBuild() {
  console.log("📝 Recording build...");
  runCommand("node scripts/record-build.js");
}

/**
 * Compare checksums with previous builds
 */
function compareChecksums() {
  console.log("🔍 Comparing checksums...");
  runCommand("pnpm run compare-checksums");
}

/**
 * Display build summary
 */
function showSummary() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const version = packageJson.version;

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Build Summary");
  console.log("=".repeat(50));
  console.log(`Version: ${version}`);

  // Check if files exist and show sizes
  const files = [
    `dist-zip/gemini_history_manager_firefox-${version}.zip`,
    `dist-zip/gemini_history_manager_chrome-${version}.zip`,
  ];

  files.forEach((file) => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`✅ ${file} (${sizeKB} KB)`);
    } else {
      console.log(`❌ ${file} (missing)`);
    }
  });

  console.log("=".repeat(50));
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const shouldRecord = args.includes("--record");
  const shouldCompare = args.includes("--compare");
  const shouldClean = args.includes("--clean");

  console.log("🚀 Starting unified build process...");

  // Clean if requested
  if (shouldClean) {
    cleanBuildDirs();
  }

  // Build
  buildAll();

  // Package
  packageAll();

  // Record build if requested
  if (shouldRecord) {
    recordBuild();
  }

  // Compare checksums if requested
  if (shouldCompare) {
    compareChecksums();
  }

  // Show summary
  showSummary();

  console.log("\n✅ Build process completed successfully!");
}

main();
