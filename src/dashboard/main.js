/**
 * Gemini History Manager - Dashboard Vue App Entry Point
 * Initializes and mounts the Vue application for the main dashboard page.
 */

// Import theme initialization utility
import { initializeTheme, Logger, THEME_STORAGE_KEY } from "../lib/utils.js";

// Apply theme immediately before any rendering or Vue initialization
// This prevents any flash of unthemed content
(function applyInitialTheme() {
  // Initialize theme with dashboard context and transitions enabled
  // Note: We check browser.storage too for compatibility with existing stored preferences
  const appliedTheme = initializeTheme({
    context: "dashboard",
    enableTransitions: true,
    checkBrowserStorage: true,
  });

  // Store the applied theme in localStorage with a special key to indicate it was pre-initialized
  localStorage.setItem("dashboard_initialized_theme", appliedTheme);

  // Initialize logger with dashboard context
  Logger.initLogger("DASHBOARD");

  Logger.debug("main.js", `Dashboard initialized with theme: ${appliedTheme}`);
})();

import "../lib/browserShim.js"; // Browser compatibility shim
import { createApp } from "vue"; // Import createApp function from Vue
import App from "./App.vue"; // Import the root Vue component for the dashboard

// Optionally, import dashboard.css here if you want Vite to process it.
// It's currently linked in dashboard.html.
// import './dashboard.css';

// Create the Vue application instance, using App.vue as the root component
const app = createApp(App);

// Mount the Vue application to the DOM element with the ID 'app'
// This ID is present in src/dashboard/dashboard.html
app.mount("#app");

Logger.log("main.js", "Dashboard Vue app initialized and mounted.");
