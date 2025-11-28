/**
 * @file compare-checksums.js
 * Compare checksums across builds of the same version to verify build reproducibility.
 * Usage: bun run compare-checksums [version] [--output report.json]
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getCurrentVersion, ROOT_DIR } from "./lib/utils.js";

/**
 * Calculate SHA-256 checksum of a file.
 * @param {string} filePath - Path to the file.
 * @returns {string} Hex-encoded SHA-256 hash.
 */
function calculateFileChecksum(filePath) {
  const hash = crypto.createHash("sha256");
  const fileBuffer = fs.readFileSync(filePath);
  hash.update(fileBuffer);
  return hash.digest("hex");
}

/**
 * Get all files in a directory recursively.
 * @param {string} directory - Directory to scan.
 * @returns {string[]} Array of file paths.
 */
function getAllFiles(directory) {
  const files = [];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  walkDir(directory);
  return files;
}

/**
 * Find all builds for a specific version.
 * @param {string} distRecordDir - Path to dist-record directory.
 * @param {string} version - Version to find builds for.
 * @returns {string[]} Array of build directory paths.
 */
function findBuilds(distRecordDir, version) {
  const versionDir = path.join(distRecordDir, version);

  if (!fs.existsSync(versionDir)) {
    console.log(`No builds found for version ${version}`);
    return [];
  }

  const builds = fs
    .readdirSync(versionDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("build-"))
    .map((entry) => path.join(versionDir, entry.name))
    .sort();

  return builds;
}

/**
 * Compare checksums across builds.
 * @param {string[]} builds - Array of build directory paths.
 * @returns {{checksums: Object, fileSizes: Object}} Checksums and file sizes by file and build.
 */
function compareChecksums(builds) {
  // {relative_file_path: {build_number: checksum}}
  const checksums = {};
  // {relative_file_path: {build_number: size}}
  const fileSizes = {};

  for (const buildPath of builds) {
    const buildNumber = path.basename(buildPath).replace("build-", "");

    // Process browser-specific directories
    for (const dirname of ["dist-firefox", "dist-chrome"]) {
      const distDir = path.join(buildPath, dirname);
      if (fs.existsSync(distDir)) {
        for (const filePath of getAllFiles(distDir)) {
          const relPath = path.relative(buildPath, filePath);

          if (!checksums[relPath]) {
            checksums[relPath] = {};
            fileSizes[relPath] = {};
          }

          checksums[relPath][buildNumber] = calculateFileChecksum(filePath);
          fileSizes[relPath][buildNumber] = fs.statSync(filePath).size;
        }
      }
    }

    // Process dist-zip directory
    const distZipDir = path.join(buildPath, "dist-zip");
    if (fs.existsSync(distZipDir)) {
      for (const filePath of getAllFiles(distZipDir)) {
        const relPath = path.relative(buildPath, filePath);

        if (!checksums[relPath]) {
          checksums[relPath] = {};
          fileSizes[relPath] = {};
        }

        checksums[relPath][buildNumber] = calculateFileChecksum(filePath);
        fileSizes[relPath][buildNumber] = fs.statSync(filePath).size;
      }
    }
  }

  return { checksums, fileSizes };
}

/**
 * Find files with inconsistent checksums across builds.
 * @param {Object} checksums - Checksums by file and build.
 * @param {Object} fileSizes - File sizes by file and build.
 * @returns {{inconsistentFiles: Object, missingFiles: Object, sizeDifferences: Object}}
 */
function findInconsistencies(checksums, fileSizes) {
  const inconsistentFiles = {};
  const missingFiles = {};
  const sizeDifferences = {};

  // Get all build numbers
  const allBuildNumbers = new Set();
  for (const buildChecksums of Object.values(checksums)) {
    for (const buildNumber of Object.keys(buildChecksums)) {
      allBuildNumbers.add(buildNumber);
    }
  }

  for (const [filePath, buildChecksums] of Object.entries(checksums)) {
    const buildNumbers = Object.keys(buildChecksums);

    // Check if file exists in all builds
    if (buildNumbers.length < allBuildNumbers.size) {
      const missingInBuilds = [...allBuildNumbers].filter((b) => !buildNumbers.includes(b));
      missingFiles[filePath] = missingInBuilds.sort();
    }

    // Check if checksums are consistent across builds
    const uniqueChecksums = new Set(Object.values(buildChecksums));
    if (uniqueChecksums.size > 1) {
      inconsistentFiles[filePath] = buildChecksums;

      // Check if size is different
      const fileBuildSizes = fileSizes[filePath];
      const uniqueSizes = new Set(Object.values(fileBuildSizes));
      if (uniqueSizes.size > 1) {
        sizeDifferences[filePath] = fileBuildSizes;
      }
    }
  }

  return { inconsistentFiles, missingFiles, sizeDifferences };
}

/**
 * Generate and print a report of inconsistencies.
 * @param {Object} inconsistentFiles - Files with inconsistent checksums.
 * @param {Object} missingFiles - Files missing in some builds.
 * @param {Object} sizeDifferences - Files with size differences.
 * @param {string[]} builds - Build directory paths.
 * @param {string|null} outputFile - Optional output file for JSON report.
 */
function generateReport(inconsistentFiles, missingFiles, sizeDifferences, builds, outputFile) {
  const buildNumbers = builds.map((build) => path.basename(build).replace("build-", ""));

  const report = {
    builds_analyzed: buildNumbers,
    total_builds: buildNumbers.length,
    inconsistent_files: {
      count: Object.keys(inconsistentFiles).length,
      files: inconsistentFiles,
    },
    missing_files: {
      count: Object.keys(missingFiles).length,
      files: missingFiles,
    },
    size_differences: {
      count: Object.keys(sizeDifferences).length,
      files: sizeDifferences,
    },
  };

  // Print summary to console
  console.log("\nChecksum Comparison Report");
  console.log("========================");
  console.log(`Builds analyzed: ${buildNumbers.join(", ")}`);
  console.log(`Total builds: ${buildNumbers.length}`);
  console.log(`Files with inconsistent checksums: ${Object.keys(inconsistentFiles).length}`);
  console.log(`Files missing in some builds: ${Object.keys(missingFiles).length}`);
  console.log(`Files with size differences: ${Object.keys(sizeDifferences).length}`);

  // Print details of inconsistent files
  if (Object.keys(inconsistentFiles).length > 0) {
    console.log("\nInconsistent Files:");
    for (const [filePath, checksums] of Object.entries(inconsistentFiles)) {
      console.log(`\n  ${filePath}:`);
      for (const [build, checksum] of Object.entries(checksums)) {
        console.log(`    Build ${build}: ${checksum}`);
      }
    }
  }

  // Write report to file if specified
  if (outputFile) {
    const outputPath = path.isAbsolute(outputFile) ? outputFile : path.join(process.cwd(), outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to ${outputPath}`);
  }

  // Return exit code based on inconsistencies
  return Object.keys(inconsistentFiles).length === 0 ? 0 : 1;
}

/**
 * Parse command line arguments.
 * @returns {{version: string, output: string|null}}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let version = null;
  let output = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) {
      output = args[i + 1];
      i++;
    } else if (!args[i].startsWith("-")) {
      version = args[i];
    }
  }

  // If no version provided, use current version from package.json
  if (!version) {
    version = getCurrentVersion();
    console.log(`No version specified. Using current version from package.json: ${version}`);
  }

  return { version, output };
}

/**
 * Main function.
 */
function main() {
  const { version, output } = parseArgs();
  const distRecordDir = path.join(ROOT_DIR, "dist-record");

  // Find builds for the specified version
  const builds = findBuilds(distRecordDir, version);
  if (builds.length === 0) {
    process.exit(1);
  }

  console.log(`Found ${builds.length} builds for version ${version}`);
  for (const build of builds) {
    console.log(`  - ${path.basename(build)}`);
  }

  if (builds.length < 2) {
    console.log("\n⚠ Warning: Need at least 2 builds to compare. Run 'bun build:all --record' again.");
    process.exit(0);
  }

  // Compare checksums
  console.log("\nCalculating checksums...");
  const { checksums, fileSizes } = compareChecksums(builds);

  // Find inconsistencies
  console.log("Finding inconsistencies...");
  const { inconsistentFiles, missingFiles, sizeDifferences } = findInconsistencies(checksums, fileSizes);

  // Generate report
  const exitCode = generateReport(inconsistentFiles, missingFiles, sizeDifferences, builds, output);

  process.exit(exitCode);
}

main();
