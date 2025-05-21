import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs-extra";
import { globSync } from "glob";
import vue from "@vitejs/plugin-vue"; // Import the Vue plugin

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false, // Keeping minify false as per original config
    // Remove directory structure prefix from output
    copyPublicDir: false, // Don't copy the public directory
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, "src/background.js"),
        // These are our Vue app entry points
        // Note: we need these entry points for bundling, but we'll manually handle HTML placement
        popup: path.resolve(__dirname, "src/popup/main.js"),
        dashboard: path.resolve(__dirname, "src/dashboard/main.js"),
      },
      output: {
        // Output JS for entry points
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "popup" || chunkInfo.name === "dashboard") {
            return `${chunkInfo.name}/${chunkInfo.name}.js`; // e.g., popup/popup.js
          }
          return "[name].js"; // For background.js
        },
        chunkFileNames: "chunks/[name].[hash].js",
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
          // Copy manifest.json
          fs.copySync(
            path.resolve(__dirname, "src/manifest.json"),
            path.resolve(__dirname, "dist/manifest.json")
          );
          console.log("Copied manifest.json");

          // Copy icons
          const icons = globSync("src/icons/*.png");
          fs.ensureDirSync(path.resolve(__dirname, "dist/icons"));
          icons.forEach((icon) => {
            const filename = path.basename(icon);
            fs.copySync(path.resolve(__dirname, icon), path.resolve(__dirname, `dist/icons/${filename}`));
          });
          console.log("Copied icons");

          // Copy and update HTML files (popup.html, dashboard.html)
          const htmlFiles = globSync("src/{popup,dashboard}/*.html");
          htmlFiles.forEach((file) => {
            const relativePath = file.replace(/^src\//, ""); // e.g., popup/popup.html
            const targetPath = path.resolve(__dirname, `dist/${relativePath}`);
            const dirName = path.basename(path.dirname(file)); // 'popup' or 'dashboard'

            // Make sure the directory exists
            fs.ensureDirSync(path.dirname(targetPath));

            // Read HTML content and update JS file references
            let htmlContent = fs.readFileSync(path.resolve(__dirname, file), "utf-8");

            // Replace references to main.js with the correct JS file name
            htmlContent = htmlContent.replace(/src="\.\/main\.js"/g, `src="./${dirName}.js"`);

            // Write the modified HTML
            fs.writeFileSync(targetPath, htmlContent);
            console.log(`Processed HTML: ${relativePath} (updated script reference to ${dirName}.js)`);
          });

          // Copy content scripts directly, preserving subdirectory structure
          const contentScriptSourceBasePath = "src/content-scripts";
          // Use glob to find all .js files within src/content-scripts and its subdirectories
          const contentScriptsPaths = globSync(`${contentScriptSourceBasePath}/**/*.js`, { cwd: __dirname });

          if (contentScriptsPaths.length > 0) {
            fs.ensureDirSync(path.resolve(__dirname, "dist/content-scripts")); // Ensure base dir exists
          }

          contentScriptsPaths.forEach((scriptPath) => {
            // scriptPath is like 'src/content-scripts/gemini-tracker/file.js'
            // Determine the path relative to the contentScriptSourceBasePath
            // e.g., 'gemini-tracker/file.js'
            const relativePathToCopy = path.relative(contentScriptSourceBasePath, scriptPath);

            const sourceFullPath = path.resolve(__dirname, scriptPath);
            const targetFullPath = path.resolve(__dirname, "dist/content-scripts", relativePathToCopy);

            // Ensure the target directory structure exists (e.g., dist/content-scripts/gemini-tracker/)
            fs.ensureDirSync(path.dirname(targetFullPath));

            fs.copySync(sourceFullPath, targetFullPath);
          });
          if (contentScriptsPaths.length > 0) {
            console.log("Copied content scripts, preserving subdirectory structure.");
          } else {
            console.log("No content scripts found to copy.");
          }

          // Copy CSS files directly (e.g., dashboard.css, popup.css)
          // These will be linked from their respective HTML files.
          // Vue component styles will be handled by Vite and the Vue plugin.
          const cssFiles = globSync("src/{popup,dashboard}/*.css");
          cssFiles.forEach((file) => {
            const relativePath = file.replace(/^src\//, ""); // e.g., popup/popup.css
            const targetPath = path.resolve(__dirname, `dist/${relativePath}`);
            fs.ensureDirSync(path.dirname(targetPath));
            fs.copySync(path.resolve(__dirname, file), targetPath);
            console.log(`Copied CSS: ${relativePath}`);
          });

          // Clean up unwanted directories
          if (fs.existsSync(path.resolve(__dirname, "dist/src"))) {
            fs.removeSync(path.resolve(__dirname, "dist/src"));
            console.log("Cleaned up dist/src directory");
          }

          console.log("Extension files copied successfully!");
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
