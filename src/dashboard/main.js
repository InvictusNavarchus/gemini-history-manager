/**
 * Gemini History Manager - Dashboard Vue App Entry Point
 * Initializes and mounts the Vue application for the main dashboard page.
 */

// Apply theme immediately before any rendering or Vue initialization
// This prevents any flash of unthemed content
// Use shared theme helper for consistent experience across contexts
import { applyInitialTheme } from '../lib/themeHelper.js';
(function() {
  // CRITICAL: This needs to happen as fast as possible to avoid any flash
  applyInitialTheme(true); // Use transition delay for smoother experience
})();

import { createApp } from 'vue'; // Import createApp function from Vue
import App from './App.vue';     // Import the root Vue component for the dashboard

// Optionally, import dashboard.css here if you want Vite to process it.
// It's currently linked in dashboard.html.
// import './dashboard.css';

// Create the Vue application instance, using App.vue as the root component
const app = createApp(App);

// Mount the Vue application to the DOM element with the ID 'app'
// This ID is present in src/dashboard/dashboard.html
app.mount('#app');

console.log('[Gemini History Manager] Dashboard Vue app initialized and mounted.');
