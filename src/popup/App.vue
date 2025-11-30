<template>
  <div class="popup-container">
    <Header
      ref="headerComponent"
      @theme-toggle="handleThemeToggle"
      @open-full-page="handleOpenFullPage"
      @export-history="handleExportHistory"
      @import-history="handleImportHistory"
    />

    <main>
      <LoadingError :is-loading="isLoading" :error-state="errorState" @retry="retryInitialization" />

      <div v-if="!isLoading && !errorState.hasError">
        <StatsOverview
          :total-conversations="totalConversations"
          :most-used-model-text="mostUsedModelText"
          :last-conversation-time-text="lastConversationTimeText"
        />

        <ConversationList
          :conversations="recentConversationsList"
          :is-loading="isLoading"
          @start-chat="handleStartChat"
          @open-conversation="openConversation"
        />
      </div>
    </main>

    <footer>
      <p>{{ extensionVersion }}</p>
    </footer>

    <input
      type="file"
      ref="importFileInput"
      accept=".json"
      style="display: none"
      @change="handleFileImported"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import dayjs from "dayjs"; // Direct import for filename formatting
import {
  Logger,
  parseTimestamp,
  formatDateForDisplay,
  initializeTheme,
  applyTheme,
  toggleTheme,
  initDayjsPlugins,
  updateThemeToggleIcon,
  THEME_STORAGE_KEY,
} from "../lib/utils.js";

// Import components
import Header from "./components/Header.vue";
import StatsOverview from "./components/StatsOverview.vue";
import ConversationList from "./components/ConversationList.vue";
import LoadingError from "./components/LoadingError.vue";

// Initialize dayjs plugins before using any dayjs functionality
initDayjsPlugins();

// --- Constants ---
const STORAGE_KEY = "geminiChatHistory";
const MAX_PREVIEW_CONVERSATIONS = 5;

// --- Reactive State ---
const totalConversations = ref(0);
const mostUsedModelText = ref("-");
const lastConversationTimeText = ref("-");
const recentConversationsList = ref([]);
const extensionVersion = ref("Gemini History Manager"); // Default, will be updated
const currentTheme = ref("light"); // Default, will be updated
const headerComponent = ref(null); // Ref for the Header component to access themeIconSvg

const isLoading = ref(true);
const errorState = ref({ hasError: false, message: "" });

/**
 * Handles real-time storage changes for live popup updates.
 * This listener is called whenever browser.storage.local changes,
 * allowing the popup to stay in sync while it's open.
 *
 * @param {Object} changes - Object containing changed keys with oldValue/newValue
 * @param {string} areaName - The storage area that changed ('local', 'sync', etc.)
 */
function handleStorageChange(changes, areaName) {
  // Only react to local storage changes for our history key
  if (areaName !== "local" || !changes[STORAGE_KEY]) {
    return;
  }

  const { oldValue, newValue } = changes[STORAGE_KEY];
  const previousCount = Array.isArray(oldValue) ? oldValue.length : 0;
  const newCount = Array.isArray(newValue) ? newValue.length : 0;

  Logger.log("App", "Storage changed in popup", {
    previousCount,
    newCount,
    component: "popup",
  });

  // Sort the new data by timestamp (most recent first)
  const sortedHistory = [...(newValue || [])].sort(
    (a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf()
  );

  // Update the popup displays with new data
  if (sortedHistory.length > 0) {
    updateStatsDisplay(sortedHistory);
    updateRecentConversationsDisplay(sortedHistory);
  } else {
    // Reset to empty state
    totalConversations.value = 0;
    mostUsedModelText.value = "-";
    lastConversationTimeText.value = "-";
    recentConversationsList.value = [];
  }
}

// --- Initialization and Data Loading ---
onMounted(async () => {
  Logger.log("App", "Component mounted", { component: "popup" });
  await initializePopup();

  // Set up real-time storage change listener for live updates
  browser.storage.onChanged.addListener(handleStorageChange);
  Logger.log("App", "Storage change listener registered for popup real-time updates");

  // Clean up the temporary theme storage after it's been used
  localStorage.removeItem("popup_initialized_theme");

  // Enable transitions only after the app is fully initialized and rendered
  // This prevents theme transition flash on initial load
  // Using requestAnimationFrame is more reliable than a timeout as it
  // ensures we wait for the next rendering cycle to complete
  requestAnimationFrame(() => {
    // Using a second requestAnimationFrame ensures we wait for the painting to complete
    requestAnimationFrame(() => {
      document.documentElement.classList.add("ready-for-transitions");
      Logger.debug("App", "CSS transitions enabled for theme changes");
    });
  });
});

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  // Remove storage change listener to prevent memory leaks
  browser.storage.onChanged.removeListener(handleStorageChange);
  Logger.log("App", "Storage change listener removed from popup");
});

/**
 * Initializes the popup by loading extension version, theme, and user history data.
 * Handles theme icon update and error state.
 * @async
 * @returns {Promise<void>}
 */
async function initializePopup() {
  Logger.debug("App", "Starting popup initialization");
  isLoading.value = true;
  errorState.value = { hasError: false, message: "" };
  try {
    await loadExtensionVersion();
    // Use the theme that was already applied by script in main.js before Vue mounts

    // Get the theme that was already applied during initialization in main.js
    const themeValue =
      localStorage.getItem("popup_initialized_theme") || localStorage.getItem(THEME_STORAGE_KEY) || "light";
    currentTheme.value = themeValue;
    Logger.log("App", "Using pre-initialized theme", { theme: themeValue });

    // Apply theme to icon after component is mounted
    if (headerComponent.value) {
      updateThemeToggleIcon(themeValue, headerComponent.value.themeIconSvg);
      Logger.debug("App", "Theme icon updated", { theme: themeValue });
    } else {
      Logger.warn("App", "Header component reference not available, cannot update theme icon");
    }

    const historyData = await loadHistoryDataFromStorage();
    if (historyData && historyData.length > 0) {
      Logger.log("App", "History data loaded successfully", { count: historyData.length });
      updateStatsDisplay(historyData);
      updateRecentConversationsDisplay(historyData);
    } else {
      // Empty state is handled by template based on recentConversationsList.length
      Logger.log("App", "No history data found in storage");
    }
  } catch (error) {
    Logger.error("App", "Error initializing popup", error);
    errorState.value = { hasError: true, message: "Failed to load history data." };
  } finally {
    isLoading.value = false;
    Logger.log("App", "Popup initialization completed", { hasError: errorState.value.hasError });
  }
}

/**
 * Retries the popup initialization process, typically after an error.
 */
function retryInitialization() {
  Logger.log("App", "User initiated retry of popup initialization");
  initializePopup();
}

/**
 * Loads the extension version from the manifest and updates the UI.
 * Handles errors gracefully and logs version info.
 * @async
 * @returns {Promise<void>}
 */
async function loadExtensionVersion() {
  Logger.debug("App", "Loading extension version from manifest");
  try {
    const manifestData = browser.runtime.getManifest();
    if (manifestData && manifestData.version) {
      extensionVersion.value = `Gemini History Manager v${manifestData.version}`;
      Logger.log("App", "Extension version loaded", { version: manifestData.version });
    } else {
      Logger.warn("App", "Could not retrieve version from manifest");
    }
  } catch (error) {
    Logger.error("App", "Error loading extension version", error);
    // Keep default version string
  }
}

/**
 * Loads chat history data from browser storage, sorts it, and logs relevant info.
 * @async
 * @returns {Promise<Array>} Resolves with the loaded and sorted history data array.
 * @throws Will throw if loading from storage fails.
 */
async function loadHistoryDataFromStorage() {
  Logger.debug("App", "Loading history data from browser storage");
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const history = data[STORAGE_KEY] || [];

    // Sort by timestamp descending (most recent first)
    if (history.length > 0) {
      Logger.debug("App", "Sorting history entries by timestamp");
      history.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
    }

    Logger.log("App", "History data retrieved from storage", {
      entryCount: history.length,
      storageKey: STORAGE_KEY,
      newestEntry: history.length > 0 ? history[0].timestamp : null,
    });

    return history;
  } catch (error) {
    Logger.error("App", "Failed to load history data from storage", error);
    throw error; // Propagate error to be caught by initializePopup
  }
}

// --- UI Update Functions ---
/**
 * Updates statistics display (total conversations, most used model, last conversation time) based on history data.
 * @param {Array} historyData - The array of conversation history objects.
 */
function updateStatsDisplay(historyData) {
  Logger.debug("App", "Updating statistics display with history data");
  totalConversations.value = historyData.length;

  // Calculate model usage statistics
  const modelCounts = historyData.reduce((acc, entry) => {
    const model = entry.model || "Unknown";
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});

  Logger.debug("App", "Model usage counts calculated", {
    modelCounts: Logger.formatObject(modelCounts),
  });

  // Find most used model
  const mostUsedEntry = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];
  mostUsedModelText.value = mostUsedEntry ? mostUsedEntry[0] : "-";

  Logger.log("App", "Most used model determined", {
    model: mostUsedModelText.value,
    count: mostUsedEntry ? mostUsedEntry[1] : 0,
  });

  // Format last conversation time
  if (historyData.length > 0 && historyData[0].timestamp) {
    const lastDateDayjs = parseTimestamp(historyData[0].timestamp);
    if (lastDateDayjs.isValid() && typeof lastDateDayjs.fromNow === "function") {
      lastConversationTimeText.value = lastDateDayjs.fromNow();
      Logger.log("App", "Last conversation time formatted", {
        formatted: lastConversationTimeText.value,
        timestamp: historyData[0].timestamp,
      });
    } else {
      lastConversationTimeText.value = "Invalid date";
      Logger.warn("App", "Invalid timestamp for last conversation", {
        timestamp: historyData[0].timestamp,
      });
    }
  } else {
    lastConversationTimeText.value = "-";
    Logger.debug("App", "No timestamp available for last conversation");
  }
}

/**
 * Updates the list of recent conversations displayed in the popup.
 * @param {Array} historyData - The array of conversation history objects.
 */
function updateRecentConversationsDisplay(historyData) {
  const displayCount = Math.min(historyData.length, MAX_PREVIEW_CONVERSATIONS);
  Logger.log("App", "Updating recent conversations display", {
    total: historyData.length,
    displayed: displayCount,
    maxAllowed: MAX_PREVIEW_CONVERSATIONS,
  });

  recentConversationsList.value = historyData.slice(0, MAX_PREVIEW_CONVERSATIONS);
}

// --- Event Handlers ---
/**
 * Handles the theme toggle action, switching between light and dark themes.
 * @param {SVGElement} themeIconSvgElement - The SVG element for the theme icon.
 */
function handleThemeToggle(themeIconSvgElement) {
  Logger.log("App", "Theme toggle button clicked", { currentTheme: currentTheme.value });
  currentTheme.value = toggleTheme(currentTheme.value, themeIconSvgElement);
  Logger.log("App", "Theme toggled", { newTheme: currentTheme.value });
  // applyTheme is called within toggleTheme
}

/**
 * Handles the event to open the full dashboard page from the popup.
 */
function handleOpenFullPage() {
  Logger.log("App", "Open full dashboard page button clicked");
  browser.runtime
    .sendMessage({ action: "openHistoryPage" })
    .then(() => {
      Logger.debug("App", "Message sent to open history page");
      window.close();
    })
    .catch((error) => {
      Logger.error("App", "Error sending message to open history page", error);
      // Try alternative method to open the page
      browser.tabs
        .create({ url: browser.runtime.getURL("dashboard/dashboard.html") })
        .then(() => window.close())
        .catch((err) => Logger.error("App", "Failed to open dashboard page via tabs API", err));
    });
}

/**
 * Handles exporting chat history to a JSON file. Loads history, creates a file, and triggers download.
 * @async
 * @returns {Promise<void>}
 */
async function handleExportHistory() {
  Logger.log("App", "Export history button clicked");
  try {
    Logger.debug("App", "Loading history data for export");
    const historyData = await loadHistoryDataFromStorage(); // Get latest sorted data

    if (historyData.length === 0) {
      Logger.warn("App", "No history data available to export");
      alert("No history data to export");
      return;
    }

    Logger.debug("App", "Creating export file", { entryCount: historyData.length });
    const blob = new Blob([JSON.stringify(historyData, null, 2)], {
      type: "application/json",
    });
    const objectURL = URL.createObjectURL(blob);
    const filename = `gemini-history-export-${dayjs().format("YYYY-MM-DD")}.json`;

    // Create a temporary link to trigger download
    Logger.debug("App", "Creating temporary download link");
    const downloadLink = document.createElement("a");
    downloadLink.href = objectURL;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(objectURL);

    Logger.log("App", "History exported successfully", {
      filename: filename,
      sizeBytes: blob.size,
      entryCount: historyData.length,
    });
  } catch (error) {
    Logger.error("App", "Failed to export history data", error);
    alert("Failed to export history data.");
  }
}

/**
 * Handles the import history button click, redirects user to dashboard import page.
 */
function handleImportHistory() {
  Logger.log("App", "Import history button clicked", { redirectTarget: "dashboard" });
  browser.tabs
    .create({
      url: browser.runtime.getURL("dashboard/dashboard.html?action=import"),
    })
    .then(() => {
      Logger.debug("App", "Dashboard page opened with import action");
      window.close();
    })
    .catch((error) => {
      Logger.error("App", "Failed to open dashboard for import", error);
      // Alert user of the failure
      alert("Failed to open dashboard page for import. Please try again.");
    });
}

/**
 * Handles the start chat action, opening a new Gemini chat tab.
 */
function handleStartChat() {
  Logger.log("App", "Start new Gemini chat button clicked");
  browser.tabs
    .create({ url: "https://gemini.google.com/app" })
    .then(() => {
      Logger.debug("App", "New Gemini chat tab opened successfully");
      window.close();
    })
    .catch((error) => {
      Logger.error("App", "Failed to open new Gemini chat tab", error);
    });
}

/**
 * Opens an existing conversation in a new browser tab.
 * @param {string} url - The URL of the conversation to open.
 */
function openConversation(url) {
  Logger.log("App", "Opening existing conversation", { url });

  if (!url || typeof url !== "string") {
    Logger.warn("App", "Invalid conversation URL provided", { receivedUrl: url });
    return;
  }

  browser.tabs
    .create({ url })
    .then(() => {
      Logger.debug("App", "Opened conversation in new tab");
      window.close();
    })
    .catch((error) => {
      Logger.error("App", "Failed to open conversation tab", error);
    });
}

// The importFileInput ref and handleFileImported method are placeholders
// if we were to handle import directly in popup, but it's redirected.
const importFileInput = ref(null);
/**
 * Placeholder handler for file import events in the popup (actual import is redirected).
 * Logs file info if present.
 * @param {Event} event - The file input change event.
 */
function handleFileImported(event) {
  // This logic would be more complex and involve reading the file,
  // parsing JSON, merging with existing history, and saving.
  // Since import is redirected, this is mostly a placeholder.
  if (event && event.target && event.target.files && event.target.files[0]) {
    const file = event.target.files[0];
    Logger.debug("App", "File selected for import (handled by dashboard)", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } else {
    Logger.warn("App", "File import triggered but no file selected or invalid event");
  }
}

// Expose methods to template (not strictly necessary with <script setup> for direct use in template)
// but can be useful for clarity or if you need to call them from parent/child in complex scenarios.
// For <script setup>, all top-level bindings are automatically exposed.

// --- Utility Functions (already imported but good to remember their usage) ---
// parseTimestamp, formatDateForDisplay, initializeTheme, applyTheme, toggleTheme are used directly.
</script>
