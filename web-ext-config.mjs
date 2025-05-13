export default {
  verbose: true,
  sourceDir: './', // Where your manifest.json and sources are
  artifactsDir: './dist', // Where to save the zip file
  ignoreFiles: [
    '.git',
    'node_modules',
    'README.md',
    'LICENSE',
    'web-ext-config.mjs',
  ],
  build: {
    overwriteDest: true,
  },
};