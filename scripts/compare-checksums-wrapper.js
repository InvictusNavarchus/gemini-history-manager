/**
 * @file compare-checksums-wrapper.js
 * Wrapper script that calls the Python checksum comparison tool.
 * Usage: bun run compare-checksums [version]
 */
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { getCurrentVersion } from "./lib/utils.js";

// Get the directory of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get command line arguments (excluding the first two: node and script path)
const args = process.argv.slice(2);

// If no version is provided, use the current version from package.json
if (args.length === 0 || args[0].startsWith("--")) {
  const currentVersion = getCurrentVersion();
  console.log(`No version specified. Using current version from package.json: ${currentVersion}`);

  // Insert the version as the first argument
  args.unshift(currentVersion);
}

// Run the Python script with the arguments
const pythonScript = path.join(__dirname, "compare_checksums.py");
const result = spawnSync("python3", [pythonScript, ...args], {
  stdio: "inherit",
  encoding: "utf-8",
});

// Exit with the same code as the Python script
process.exit(result.status);
