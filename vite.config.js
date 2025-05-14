import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import { globSync } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'src/background.js'),
        'popup/popup': path.resolve(__dirname, 'src/popup/popup.js'),
        'dashboard/dashboard': path.resolve(__dirname, 'src/dashboard/dashboard.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  plugins: [
    {
      name: 'copy-extension-files',
      buildStart() {
        // This will run before the build starts
        // We're using ES modules, so require.resolve won't work
        // Just log a message about dependencies
        console.log('Ensuring extension files are copied after build...');
      },
      closeBundle: {
        sequential: true,
        handler: () => {
          // Copy manifest.json
          fs.copySync(
            path.resolve(__dirname, 'src/manifest.json'),
            path.resolve(__dirname, 'dist/manifest.json')
          );
          
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
          
          // Copy HTML files directly (without bundling)
          const htmlFiles = globSync('src/**/*.html');
          htmlFiles.forEach(file => {
            const relativePath = file.replace(/^src\//, '');
            const targetPath = path.resolve(__dirname, `dist/${relativePath}`);
            fs.ensureDirSync(path.dirname(targetPath));
            fs.copySync(
              path.resolve(__dirname, file),
              targetPath
            );
          });
          
          // Copy content scripts directly (without bundling)
          const contentScripts = globSync('src/content-scripts/*.js');
          fs.ensureDirSync(path.resolve(__dirname, 'dist/content-scripts'));
          contentScripts.forEach(script => {
            const filename = path.basename(script);
            fs.copySync(
              path.resolve(__dirname, script),
              path.resolve(__dirname, `dist/content-scripts/${filename}`)
            );
          });
          
          // Copy CSS files
          const cssFiles = globSync('src/**/*.css');
          cssFiles.forEach(file => {
            const relativePath = file.replace(/^src\//, '');
            const targetPath = path.resolve(__dirname, `dist/${relativePath}`);
            fs.ensureDirSync(path.dirname(targetPath));
            fs.copySync(
              path.resolve(__dirname, file),
              targetPath
            );
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
