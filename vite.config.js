import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs-extra";
import { globSync } from "glob";
import vue from "@vitejs/plugin-vue"; // Import the Vue plugin

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get the target browser from environment variable or default to 'firefox'
const TARGET_BROWSER = process.env.TARGET_BROWSER || "firefox";

export default defineConfig({
  base: "./", // Use relative paths for assets
  build: {
    outDir: TARGET_BROWSER === "chrome" ? "dist-chrome" : "dist-firefox",
    emptyOutDir: true,
    minify: false, // Keeping minify false as per original config
    // Remove directory structure prefix from output
    copyPublicDir: false, // Don't copy the public directory
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, "src/background.js"),
        // HTML files as entry points - Vite will process and inject assets automatically
        popup: path.resolve(__dirname, "src/popup/popup.html"),
        dashboard: path.resolve(__dirname, "src/dashboard/dashboard.html"),
      },
      output: {
        // Output JS for entry points
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "popup" || chunkInfo.name === "dashboard") {
            return `${chunkInfo.name}/${chunkInfo.name}.js`; // e.g., popup/popup.js
          }
          return "[name].js"; // For background.js
        },
        chunkFileNames: "chunks/[name].js",
        assetFileNames: (assetInfo) => {
          // Keep original CSS and other assets structure if possible
          if (assetInfo.name.endsWith(".css")) {
            // Try to place CSS in a similar path structure or a general assets/css folder
            // This example places them in assets/css, but you might want to adjust
            // based on how popup.css and dashboard.css are referenced in your HTML.
            // For now, let's keep them as they are copied by the custom plugin.
            // The custom plugin will handle CSS copying.
            // Vite might also emit CSS from Vue components here.
            return "assets/css/[name].[ext]";
          }
          return "assets/[name].[ext]";
        },
      },
    },
  },
  plugins: [
    vue(), // Add the Vue plugin
    {
      name: "copy-extension-files",
      buildStart() {
        console.log("Ensuring extension files are copied after build...");
      },
      closeBundle: {
        sequential: true,
        handler: async () => {
          // Changed to async to allow for potential async operations
          const outDir = TARGET_BROWSER === "chrome" ? "dist-chrome" : "dist-firefox";
          console.log(`Building for ${TARGET_BROWSER} in ${outDir}...`);

          // Copy appropriate manifest file
          const manifestSource =
            TARGET_BROWSER === "chrome"
              ? path.resolve(__dirname, "src/manifest-chrome.json")
              : path.resolve(__dirname, "src/manifest-firefox.json");

          fs.copySync(manifestSource, path.resolve(__dirname, `${outDir}/manifest.json`));
          console.log(`Copied ${TARGET_BROWSER} manifest file`);

          // Copy icons
          const icons = globSync("src/icons/*.png");
          fs.ensureDirSync(path.resolve(__dirname, `${outDir}/icons`));
          icons.forEach((icon) => {
            const filename = path.basename(icon);
            fs.copySync(
              path.resolve(__dirname, icon),
              path.resolve(__dirname, `${outDir}/icons/${filename}`)
            );
          });
          console.log("Copied icons");

          // HTML files are now processed automatically by Vite as entry points
          // CSS and JS will be automatically injected by Vite

          // Copy content scripts directly, preserving subdirectory structure
          const contentScriptSourceBasePath = "src/content-scripts";
          // Use glob to find all .js files within src/content-scripts and its subdirectories
          const contentScriptsPaths = globSync(`${contentScriptSourceBasePath}/**/*.js`, { cwd: __dirname });

          if (contentScriptsPaths.length > 0) {
            fs.ensureDirSync(path.resolve(__dirname, `${outDir}/content-scripts`)); // Ensure base dir exists
          }

          contentScriptsPaths.forEach((scriptPath) => {
            // scriptPath is like 'src/content-scripts/gemini-tracker/file.js'
            // Determine the path relative to the contentScriptSourceBasePath
            // e.g., 'gemini-tracker/file.js'
            const relativePathToCopy = path.relative(contentScriptSourceBasePath, scriptPath);

            const sourceFullPath = path.resolve(__dirname, scriptPath);
            const targetFullPath = path.resolve(__dirname, `${outDir}/content-scripts`, relativePathToCopy);

            // Ensure the target directory structure exists (e.g., dist/content-scripts/gemini-tracker/)
            fs.ensureDirSync(path.dirname(targetFullPath));

            // Copy content script files directly without modification
            fs.copySync(sourceFullPath, targetFullPath);
          });
          if (contentScriptsPaths.length > 0) {
            console.log(`Copied content scripts for ${TARGET_BROWSER}, preserving subdirectory structure.`);
          } else {
            console.log("No content scripts found to copy.");
          }

          // Copy background script with browser shim for Chrome
          const backgroundSource = path.resolve(__dirname, "src/background.js");
          const backgroundTarget = path.resolve(__dirname, `${outDir}/background.js`);

          // Background script is already processed by Vite build, so we don't need to modify it here
          console.log("Background script processed by Vite build process");

          // Move HTML files from src subdirectories to correct locations and fix paths
          // HTML files are generated in dist-{browser}/src/popup/popup.html etc.
          const generatedHtmlFiles = globSync(`${outDir}/src/{popup,dashboard}/*.html`);
          generatedHtmlFiles.forEach((file) => {
            const relativePath = file.replace(`${outDir}/src/`, ""); // e.g., popup/popup.html
            const targetPath = path.resolve(__dirname, `${outDir}/${relativePath}`);

            // Make sure the target directory exists
            fs.ensureDirSync(path.dirname(targetPath));

            // Read and fix the HTML content paths
            let htmlContent = fs.readFileSync(file, "utf-8");

            // Fix the relative paths - change ../../ to ../
            htmlContent = htmlContent.replace(/src="\.\.\/\.\.\//g, 'src="../');
            htmlContent = htmlContent.replace(/href="\.\.\/\.\.\//g, 'href="../');

            // Write the corrected HTML to the target location
            fs.writeFileSync(targetPath, htmlContent);
            console.log(`Moved and fixed HTML file: ${relativePath}`);
          });

          // Clean up unwanted directories after moving HTML files
          if (fs.existsSync(path.resolve(__dirname, `${outDir}/src`))) {
            fs.removeSync(path.resolve(__dirname, `${outDir}/src`));
            console.log(`Cleaned up ${outDir}/src directory`);
          }

          console.log(`Extension files copied successfully for ${TARGET_BROWSER}!`);
        },
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
