import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import { globSync } from 'glob';
import vue from '@vitejs/plugin-vue'; // Import the Vue plugin

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false, // Keeping minify false as per original config
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'src/background.js'),
        // These entry points will later be updated to initialize Vue apps
        // For now, they remain the same, but their content will change.
        'popup/popup': path.resolve(__dirname, 'src/popup/popup.html'), // Entry point is HTML for Vue apps
        'dashboard/dashboard': path.resolve(__dirname, 'src/dashboard/dashboard.html') // Entry point is HTML for Vue apps
      },
      output: {
        // Output JS for HTML entry points will be named based on the HTML file
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'popup/popup' || chunkInfo.name === 'dashboard/dashboard') {
            return `assets/${chunkInfo.name.replace(/\//g, '-')}.js`; // e.g., assets/popup-popup.js
          }
          return '[name].js'; // For background.js
        },
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep original CSS and other assets structure if possible
          if (assetInfo.name.endsWith('.css')) {
            // Try to place CSS in a similar path structure or a general assets/css folder
            // This example places them in assets/css, but you might want to adjust
            // based on how popup.css and dashboard.css are referenced in your HTML.
            // For now, let's keep them as they are copied by the custom plugin.
            // The custom plugin will handle CSS copying.
            // Vite might also emit CSS from Vue components here.
            return 'assets/css/[name].[ext]';
          }
          return 'assets/[name].[ext]';
        }
      }
    }
  },
  plugins: [
    vue(), // Add the Vue plugin
    {
      name: 'copy-extension-files',
      buildStart() {
        console.log('Ensuring extension files are copied after build...');
      },
      closeBundle: {
        sequential: true,
        handler: async () => { // Changed to async to allow for potential async operations
          // Copy manifest.json
          fs.copySync(
            path.resolve(__dirname, 'src/manifest.json'),
            path.resolve(__dirname, 'dist/manifest.json')
          );
          console.log('Copied manifest.json');

          // Copy icons
          const icons = globSync('src/icons/*.png');
          fs.ensureDirSync(path.resolve(__dirname, 'dist/icons'));
          icons.forEach(icon => {
            const filename = path.basename(icon);
            fs.copySync(
              path.resolve(__dirname, icon),
              path.resolve(__dirname, `dist/icons/${filename}`)
            );
          });
          console.log('Copied icons');

          // Copy HTML files (popup.html, dashboard.html)
          // These will serve as entry points for the Vue apps
          const htmlFiles = globSync('src/{popup,dashboard}/*.html');
          htmlFiles.forEach(file => {
            const relativePath = file.replace(/^src\//, ''); // e.g., popup/popup.html
            const targetPath = path.resolve(__dirname, `dist/${relativePath}`);
            fs.ensureDirSync(path.dirname(targetPath));
            fs.copySync(
              path.resolve(__dirname, file),
              targetPath
            );
            console.log(`Copied HTML: ${relativePath}`);
          });
          
          // Copy content scripts directly (without bundling by Vite's main process)
          const contentScripts = globSync('src/content-scripts/*.js');
          fs.ensureDirSync(path.resolve(__dirname, 'dist/content-scripts'));
          contentScripts.forEach(script => {
            const filename = path.basename(script);
            fs.copySync(
              path.resolve(__dirname, script),
              path.resolve(__dirname, `dist/content-scripts/${filename}`)
            );
          });
          console.log('Copied content scripts');

          // Copy CSS files directly (e.g., dashboard.css, popup.css)
          // These will be linked from their respective HTML files.
          // Vue component styles will be handled by Vite and the Vue plugin.
          const cssFiles = globSync('src/{popup,dashboard}/*.css');
          cssFiles.forEach(file => {
            const relativePath = file.replace(/^src\//, ''); // e.g., popup/popup.css
            const targetPath = path.resolve(__dirname, `dist/${relativePath}`);
            fs.ensureDirSync(path.dirname(targetPath));
            fs.copySync(
              path.resolve(__dirname, file),
              targetPath
            );
            console.log(`Copied CSS: ${relativePath}`);
          });

          console.log('Extension files copied successfully!');
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});
