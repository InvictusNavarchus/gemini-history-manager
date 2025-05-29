#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const files = [
  path.join('src', 'manifest-chrome.json'),
  path.join('src', 'manifest-firefox.json'),
  'package.json',
];

function parseArgs() {
  const arg = process.argv.slice(2).find(a => a.startsWith('-') || a.startsWith('--'));
  if (!arg) return null;
  if (arg === '--major' || arg === '-M') return 'major';
  if (arg === '--minor' || arg === '-m') return 'minor';
  if (arg === '--patch' || arg === '-p') return 'patch';
  return null;
}

function bumpVersion(version, type) {
  let [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') {
    major++;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor++;
    patch = 0;
  } else if (type === 'patch') {
    patch++;
  }
  return [major, minor, patch].join('.');
}

function updateFile(file, newVersion) {
  const content = fs.readFileSync(file, 'utf-8');
  const json = JSON.parse(content);
  if (!json.version) throw new Error(`No version field in ${file}`);
  json.version = newVersion;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`Updated ${file} to version ${newVersion}`);
}

function main() {
  const type = parseArgs();
  if (!type) {
    console.error('Usage: pnpm bump --[major|minor|patch] or -[M|m|p]');
    process.exit(1);
  }
  // Read version from package.json
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const newVersion = bumpVersion(pkg.version, type);
  files.forEach(file => updateFile(file, newVersion));
}

main();
