/**
 * Gemini History Manager - Popup Vue App Entry Point
 * Initializes and mounts the Vue application for the browser action popup.
 */

// Import theme initialization utility
import { initializeTheme, Logger, THEME_STORAGE_KEY } from "../lib/utils.js";

// This code will run before the DOM content is fully loaded
// Apply theme immediately as early as possible to prevent flash
// We use this approach instead of inline script due to extension CSP restrictions
(function applyInitialTheme() {
  // Initialize theme with popup context for detailed logging
  // Note: We check browser.storage too for compatibility with existing stored preferences
  const appliedTheme = initializeTheme({
    context: "popup",
    checkBrowserStorage: true,
  });

  // Store the applied theme in localStorage with a special key to indicate it was pre-initialized
  localStorage.setItem("popup_initialized_theme", appliedTheme);

  // Initialize logger with popup context
  Logger.initLogger("POPUP");

  Logger.debug("popup", `Popup initialized with theme: ${appliedTheme}`);
})();

import "../lib/polyfill.js"; // Browser compatibility polyfill
import { createApp } from "vue"; // Import createApp function from Vue
import App from "./App.vue"; // Import the root Vue component

// Import CSS files for Vite to process and bundle
import "./popup.css";

// Create the Vue application instance, using App.vue as the root component
const app = createApp(App);

// Mount the Vue application to the DOM element with the ID 'app'
// This ID is present in src/popup/popup.html
app.mount("#app");

Logger.log("popup", "Popup Vue app initialized and mounted.");
