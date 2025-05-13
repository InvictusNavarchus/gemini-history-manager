export default {
  verbose: true,
  sourceDir: './src', // Where your manifest.json and sources are
  artifactsDir: './dist', // Where to save the zip file
  ignoreFiles: [
    '.git',
    'node_modules',
  ],
  build: {
    overwriteDest: true,
  },
};