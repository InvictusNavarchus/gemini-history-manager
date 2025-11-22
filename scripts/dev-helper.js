/**
 * @file dev-helper.js
 * Development helper script for common tasks.
 * Usage: bun dev-helper [command]
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function runCommand(command) {
  console.log(`\n$ ${command}`);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

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
  runCommand("node scripts/build-all.js --clean");
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
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
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
