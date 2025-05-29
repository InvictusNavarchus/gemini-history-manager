module.exports = {
  verbose: false,
  sourceDir: "./dist-chrome", // Where your manifest.json and sources are
  artifactsDir: "./dist-zip", // Where to save the zip file
  ignoreFiles: [".git", "node_modules"],
  build: {
    overwriteDest: true,
    filename: "gemini_history_manager_chrome-{version}.zip",
  },
};
