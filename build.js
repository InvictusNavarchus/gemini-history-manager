import fs from 'fs-extra';
import path from 'path';

// Define paths
const nodeModulesDir = path.join(process.cwd(), 'node_modules');
const libDir = path.join(process.cwd(), 'src', 'lib');

// Create lib directory if it doesn't exist
fs.ensureDirSync(libDir);

// Copy dayjs
console.log('Copying dayjs...');
fs.copySync(
  path.join(nodeModulesDir, 'dayjs', 'dayjs.min.js'),
  path.join(libDir, 'dayjs.min.js')
);

// Create dayjs-plugins directory if it doesn't exist
const dayjsPluginsDir = path.join(libDir, 'dayjs-plugins');
fs.ensureDirSync(dayjsPluginsDir);

// Copy dayjs plugins
const pluginsToInclude = [
  'utc',
  'relativeTime',
  'isToday',
  'localizedFormat',
  'calendar',
  'timezone'
];

console.log('Copying dayjs plugins...');
pluginsToInclude.forEach(plugin => {
  try {
    fs.copySync(
      path.join(nodeModulesDir, 'dayjs', 'plugin', `${plugin}.js`),
      path.join(dayjsPluginsDir, `${plugin}.js`)
    );
    console.log(`  - ${plugin}.js`);
  } catch (err) {
    console.warn(`  - Failed to copy plugin ${plugin}: ${err.message}`);
  }
});

// Copy Chart.js
console.log('Copying Chart.js...');
fs.copySync(
  path.join(nodeModulesDir, 'chart.js', 'dist', 'chart.umd.js'),
  path.join(libDir, 'chart.min.js')
);

console.log('Build completed successfully!');
