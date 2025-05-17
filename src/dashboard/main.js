/**
 * Gemini History Manager - Dashboard Vue App Entry Point
 * Initializes and mounts the Vue application for the main dashboard page.
 */

// Apply theme immediately before any rendering or Vue initialization
// This prevents any flash of unthemed content
(function applyInitialTheme() {
  // Start with the initial load class that disables all transitions
  document.documentElement.classList.add('initial-load');
  
  try {
    // CRITICAL: This needs to happen as fast as possible to avoid any flash
    const savedTheme = localStorage.getItem('geminiHistoryTheme');
    
    if (savedTheme) {
      // Set the data-theme attribute immediately from localStorage
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // If no saved theme, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
    
    // Enable transitions only after the rendering is complete
    // Using requestAnimationFrame is more reliable than a timeout
    requestAnimationFrame(() => {
      // Using a second requestAnimationFrame ensures we wait for the painting to complete
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('initial-load');
      });
    });
    
  } catch (e) {
    console.error('[Gemini History] Error setting initial theme:', e);
    // Default to light theme if there's an error
    document.documentElement.setAttribute('data-theme', 'light');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('initial-load');
      });
    });
  }
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
