/**
 * Gemini History Manager - Popup Vue App Entry Point
 * Initializes and mounts the Vue application for the browser action popup.
 */

// This code will run before the DOM content is fully loaded
// Apply theme immediately as early as possible to prevent flash
// We use this approach instead of inline script due to extension CSP restrictions
(function applyInitialTheme() {
  try {
    const savedTheme = localStorage.getItem('geminiHistoryTheme');
    if (savedTheme) {
      console.log('[Gemini History] Applying saved theme from localStorage:', savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // If no saved theme, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('[Gemini History] No saved theme found. Using system preference:', prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  } catch (e) {
    console.error('[Gemini History] Error setting initial theme:', e);
    // Default to light theme if there's an error
    document.documentElement.setAttribute('data-theme', 'light');
  }
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
