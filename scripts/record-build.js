import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Read package.json to get the current version
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const version = packageJson.version;

// Create dist-record directory if it doesn't exist
const distRecordDir = path.join(rootDir, "dist-record");
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
const distFirefoxDir = path.join(rootDir, "dist-firefox");
const distChromeDir = path.join(rootDir, "dist-chrome");
const distZipDir = path.join(rootDir, "dist-zip");

// Handle Firefox dist directory
if (fs.existsSync(distFirefoxDir)) {
  const distFirefoxTargetDir = path.join(buildDir, "dist-firefox");
  fs.ensureDirSync(distFirefoxTargetDir);
  fs.copySync(distFirefoxDir, distFirefoxTargetDir);
  console.log(`Copied dist-firefox/ to ${path.relative(rootDir, distFirefoxTargetDir)}`);
}

// Handle Chrome dist directory
if (fs.existsSync(distChromeDir)) {
  const distChromeTargetDir = path.join(buildDir, "dist-chrome");
  fs.ensureDirSync(distChromeTargetDir);
  fs.copySync(distChromeDir, distChromeTargetDir);
  console.log(`Copied dist-chrome/ to ${path.relative(rootDir, distChromeTargetDir)}`);
}

// Handle dist-zip directory (which may contain both Firefox and Chrome zips)
if (fs.existsSync(distZipDir)) {
  const distZipTargetDir = path.join(buildDir, "dist-zip");
  fs.ensureDirSync(distZipTargetDir);
  fs.copySync(distZipDir, distZipTargetDir);
  console.log(`Copied dist-zip/ to ${path.relative(rootDir, distZipTargetDir)}`);
}

console.log(`Recorded build ${nextBuildNumber} for version ${version}`);
