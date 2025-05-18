/**
 * Gemini History Manager - Popup Vue App Entry Point
 * Initializes and mounts the Vue application for the browser action popup.
 */

// Import theme initialization utility
import { initializeTheme, Logger, THEME_STORAGE_KEY } from '../lib/utils.js';

// This code will run before the DOM content is fully loaded
// Apply theme immediately as early as possible to prevent flash
// We use this approach instead of inline script due to extension CSP restrictions
(function applyInitialTheme() {
  // Initialize theme with popup context for detailed logging
  // Note: We check browser.storage too for compatibility with existing stored preferences
  const appliedTheme = initializeTheme({ 
    context: 'popup',
    checkBrowserStorage: true
  });
  
  // Store the applied theme in localStorage with a special key to indicate it was pre-initialized
  localStorage.setItem('popup_initialized_theme', appliedTheme);
  
  Logger.debug(`Popup initialized with theme: ${appliedTheme}`);
})();

import { createApp } from 'vue'; // Import createApp function from Vue
import App from './App.vue';     // Import the root Vue component (we'll create this next)

// Optionally, if you want to manage all styles through Vue components,
// you can import popup.css here. Otherwise, it's already linked in popup.html.
// If imported here, ensure it's not linked in popup.html to avoid duplication,
// or ensure the styles are designed to be applied once correctly.
// For this migration, keeping it in popup.html is fine, but importing here is also an option.
// import './popup.css';

// Create the Vue application instance, using App.vue as the root component
const app = createApp(App);

// Mount the Vue application to the DOM element with the ID 'app'
// This ID is present in src/popup/popup.html
app.mount('#app');

Logger.log('Popup Vue app initialized and mounted.');
