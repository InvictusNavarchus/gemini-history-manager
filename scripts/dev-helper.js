/**
 * @file dev-helper.js
 * Development helper script for common tasks.
 * Usage: bun dev-helper [command]
 */
import fs from "fs-extra";
import path from "path";
import { runCommand, getPackageJson, ROOT_DIR } from "./lib/utils.js";

function showHelp() {
  console.log(`
🛠️  Development Helper

Available commands:
  clean       - Clean all build directories
  quick-build - Build and package (no recording)
  full-build  - Build, package, and record
  compare     - Compare checksums of current version
  lint-all    - Lint both Firefox and Chrome builds
  format-fix  - Format all code files
  version     - Show current version info

Usage: bun dev-helper [command]
`);
}

function cleanAll() {
  console.log("🧹 Cleaning all build directories...");
  const dirsToClean = ["dist-firefox", "dist-chrome", "dist-zip"];

  dirsToClean.forEach((dir) => {
    const dirPath = path.join(ROOT_DIR, dir);
    if (fs.existsSync(dirPath)) {
      fs.removeSync(dirPath);
      console.log(`  Removed ${dir}/`);
    }
  });

  console.log("✅ Clean complete!");
}

function quickBuild() {
  console.log("⚡ Quick build (no recording)...");
  runCommand("node scripts/build-all.js");
}

function fullBuild() {
  console.log("🔨 Full build with recording...");
  runCommand("node scripts/build-all.js --record");
}

function compareBuilds() {
  console.log("🔍 Comparing builds...");
  runCommand("bun run compare-checksums");
}

function lintAll() {
  console.log("🔍 Linting all builds...");
  runCommand("bun run lint");
  runCommand("bun run lint:chrome");
}

function formatFix() {
  console.log("✨ Formatting all files...");
  runCommand("bun run format:all");
}

function showVersion() {
  const packageJson = getPackageJson();
  console.log(`
📦 Version Information
Current version: ${packageJson.version}
Name: ${packageJson.name}
Description: ${packageJson.description}
`);
}

function main() {
  const command = process.argv[2];

  switch (command) {
    case "clean":
      cleanAll();
      break;
    case "quick-build":
      quickBuild();
      break;
    case "full-build":
      fullBuild();
      break;
    case "compare":
      compareBuilds();
      break;
    case "lint-all":
      lintAll();
      break;
    case "format-fix":
      formatFix();
      break;
    case "version":
      showVersion();
      break;
    case "help":
    case "--help":
    case "-h":
    default:
      showHelp();
      break;
  }
}

main();
