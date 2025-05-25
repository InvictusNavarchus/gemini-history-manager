import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

// Get the directory of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Read package.json to get the current version
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const currentVersion = packageJson.version;

// Get command line arguments (excluding the first two: node and script path)
const args = process.argv.slice(2);

// If no version is provided, use the current version from package.json
if (args.length === 0 || args[0].startsWith('--')) {
  console.log(`No version specified. Using current version from package.json: ${currentVersion}`);
  
  // Insert the version as the first argument
  args.unshift(currentVersion);
}

// Run the Python script with the arguments
const pythonScript = path.join(__dirname, 'compare_checksums.py');
const result = spawnSync('python3', [pythonScript, ...args], { 
  stdio: 'inherit',
  encoding: 'utf-8'
});

// Exit with the same code as the Python script
process.exit(result.status);