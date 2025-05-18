/**
 * Gemini History Manager - Popup Vue App Entry Point
 * Initializes and mounts the Vue application for the browser action popup.
 */

// This code will run before the DOM content is fully loaded
// Apply theme immediately as early as possible to prevent flash
// We use this approach instead of inline script due to extension CSP restrictions
// Use shared theme helper for consistent experience across contexts
import { applyInitialTheme } from '../lib/themeHelper.js';
(function() {
  applyInitialTheme(true); // Use transition delay for smoother experience
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

console.log('[Gemini History Manager] Popup Vue app initialized and mounted.');
