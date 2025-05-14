<template>
  <div class="popup-container">
    <header>
      <div class="header-content">
        <h1>Gemini History Manager</h1>
        <div class="controls">
          <button id="themeToggle" class="theme-toggle" aria-label="Toggle dark mode" @click="handleThemeToggle">
            <svg ref="themeIconSvg" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button id="openFullPage" class="button primary-button" @click="handleOpenFullPage">Open Full View</button>
          <button id="exportHistory" class="button" @click="handleExportHistory">Export History</button>
          <button id="importHistory" class="button" @click="handleImportHistory">Import History</button>
        </div>
      </div>
    </header>

    <main>
      <div v-if="isLoading" class="loading-state">
        <p>Loading...</p>
      </div>
      <div v-else-if="errorState.hasError" class="error-state">
        <p>{{ errorState.message }}</p>
        <button @click="retryInitialization" class="button">Retry</button>
      </div>
      <div v-else>
        <div class="stats-container">
          <div class="stat-card">
            <h3>Total Conversations</h3>
            <div class="stat-value">{{ totalConversations }}</div>
          </div>
          <div class="stat-card">
            <h3>Most Used Model</h3>
            <div class="stat-value">{{ mostUsedModelText }}</div>
          </div>
          <div class="stat-card">
            <h3>Last Conversation</h3>
            <div class="stat-value">{{ lastConversationTimeText }}</div>
          </div>
        </div>

        <div class="history-preview">
          <h2>Recent Conversations</h2>
          <div id="recentConversations" class="conversation-list">
            <div v-if="recentConversationsList.length === 0 && !isLoading" class="empty-state">
              <p>No conversation history found.</p>
              <button @click="handleStartChat" class="button primary-button">Start a Gemini Chat</button>
            </div>
            <div v-else>
              <div v-for="entry in recentConversationsList" :key="entry.url" class="conversation-item" @click="openConversation(entry.url)">
                <div class="conversation-title">{{ entry.title || 'Untitled Conversation' }}</div>
                <div class="conversation-meta">
                  <span class="conversation-date">{{ formatDateForDisplay(parseTimestamp(entry.timestamp)) }}</span>
                  <span class="conversation-model">{{ entry.model || 'Unknown' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer>
      <p>{{ extensionVersion }}</p>
    </footer>

    <input type="file" ref="importFileInput" accept=".json" style="display: none;" @change="handleFileImported">
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  Logger,
  parseTimestamp,
  formatDateForDisplay,
  initTheme,
  applyTheme,
  toggleTheme,
  initDayjsPlugins
} from '../lib/utils.js'; // Assuming utils.js is in src/lib
import dayjs from 'dayjs'; // Direct import for filename formatting

// Initialize dayjs plugins before using any dayjs functionality
initDayjsPlugins();

// --- Constants ---
const STORAGE_KEY = 'geminiChatHistory';
const MAX_PREVIEW_CONVERSATIONS = 5;

// --- Reactive State ---
const totalConversations = ref(0);
const mostUsedModelText = ref('-');
const lastConversationTimeText = ref('-');
const recentConversationsList = ref([]);
const extensionVersion = ref('Gemini History Manager'); // Default, will be updated
const currentTheme = ref('light'); // Default, will be updated
const themeIconSvg = ref(null); // Ref for the SVG element of the theme toggle

const isLoading = ref(true);
const errorState = ref({ hasError: false, message: '' });

// --- Initialization and Data Loading ---
onMounted(async () => {
  Logger.log("Popup App.vue: Component mounted");
  await initializePopup();
});

async function initializePopup() {
  isLoading.value = true;
  errorState.value = { hasError: false, message: '' };
  try {
    await loadExtensionVersion();
    // Initialize theme and then apply it, passing the SVG ref
    initTheme((themeValue) => {
      currentTheme.value = themeValue;
      // Ensure themeIconSvg.value is available before calling applyTheme
      // Vue refs are typically available after the component is mounted.
      // If themeIconSvg.value is null here, it might be because initTheme callback
      // is too early. We can call applyTheme directly after setting currentTheme.value
      // and the template will reactively update the icon if needed, or update it in handleThemeToggle.
      // For initial load, setting data-theme on <html> is the most important.
      applyTheme(currentTheme.value, themeIconSvg.value);
    });

    const historyData = await loadHistoryDataFromStorage();
    if (historyData && historyData.length > 0) {
      updateStatsDisplay(historyData);
      updateRecentConversationsDisplay(historyData);
    } else {
      // Empty state is handled by template based on recentConversationsList.length
      Logger.log("No history data found.");
    }
  } catch (error) {
    Logger.error("Error initializing popup:", error);
    errorState.value = { hasError: true, message: 'Failed to load history data.' };
  } finally {
    isLoading.value = false;
  }
}

function retryInitialization() {
  Logger.log("Retrying popup initialization...");
  initializePopup();
}


async function loadExtensionVersion() {
  try {
    const manifestData = browser.runtime.getManifest();
    if (manifestData && manifestData.version) {
      extensionVersion.value = `Gemini History Manager v${manifestData.version}`;
      Logger.log(`Extension version loaded: ${manifestData.version}`);
    }
  } catch (error) {
    Logger.error("Error loading extension version:", error);
    // Keep default version string
  }
}

async function loadHistoryDataFromStorage() {
  Logger.log("Loading history data from storage...");
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const history = data[STORAGE_KEY] || [];
    // Sort by timestamp descending (most recent first)
    history.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
    Logger.log(`Retrieved and sorted ${history.length} history entries.`);
    return history;
  } catch (error) {
    Logger.error("Error loading history data from storage:", error);
    throw error; // Propagate error to be caught by initializePopup
  }
}

// --- UI Update Functions ---
function updateStatsDisplay(historyData) {
  Logger.log("Updating statistics display...");
  totalConversations.value = historyData.length;

  const modelCounts = historyData.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});

  const mostUsedEntry = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];
  mostUsedModelText.value = mostUsedEntry ? mostUsedEntry[0] : '-';

  if (historyData.length > 0 && historyData[0].timestamp) {
    const lastDateDayjs = parseTimestamp(historyData[0].timestamp);
    if (lastDateDayjs.isValid() && typeof lastDateDayjs.fromNow === 'function') {
      lastConversationTimeText.value = lastDateDayjs.fromNow();
    } else {
      lastConversationTimeText.value = 'Invalid date';
    }
  } else {
    lastConversationTimeText.value = '-';
  }
}

function updateRecentConversationsDisplay(historyData) {
  Logger.log(`Displaying up to ${MAX_PREVIEW_CONVERSATIONS} recent conversations.`);
  recentConversationsList.value = historyData.slice(0, MAX_PREVIEW_CONVERSATIONS);
}

// --- Event Handlers ---
function handleThemeToggle() {
  Logger.log("Theme toggle button clicked");
  currentTheme.value = toggleTheme(currentTheme.value, themeIconSvg.value);
  // applyTheme is called within toggleTheme
}

function handleOpenFullPage() {
  Logger.log("Open full page button clicked");
  browser.runtime.sendMessage({ action: 'openHistoryPage' });
  window.close();
}

async function handleExportHistory() {
  Logger.log("Export history button clicked");
  try {
    const historyData = await loadHistoryDataFromStorage(); // Get latest sorted data
    if (historyData.length === 0) {
      Logger.warn('No history data to export');
      // Consider a small, non-blocking notification in Vue if possible
      alert('No history data to export');
      return;
    }

    const blob = new Blob([JSON.stringify(historyData, null, 2)], {
      type: 'application/json'
    });
    const objectURL = URL.createObjectURL(blob);
    const filename = `gemini-history-export-${dayjs().format('YYYY-MM-DD')}.json`;

    // Create a temporary link to trigger download
    const downloadLink = document.createElement('a');
    downloadLink.href = objectURL;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(objectURL);

    Logger.log(`History exported successfully as ${filename}`);
  } catch (error) {
    Logger.error('Error exporting history:', error);
    alert('Failed to export history data.');
  }
}

function handleImportHistory() {
  Logger.log("Import history button clicked, redirecting to full view for import.");
  // Show a message or simply redirect. For extensions, often better to redirect quickly.
  // The dashboard page will handle the ?action=import parameter.
  browser.tabs.create({
    url: browser.runtime.getURL('dashboard/dashboard.html?action=import')
  });
  window.close();
}

function handleStartChat() {
  Logger.log("Start a Gemini Chat button clicked.");
  browser.tabs.create({ url: 'https://gemini.google.com/app' });
  window.close();
}

function openConversation(url) {
  Logger.log(`Opening conversation: ${url}`);
  browser.tabs.create({ url: url });
  window.close();
}

// The importFileInput ref and handleFileImported method are placeholders
// if we were to handle import directly in popup, but it's redirected.
const importFileInput = ref(null);
function handleFileImported(event) {
    // This logic would be more complex and involve reading the file,
    // parsing JSON, merging with existing history, and saving.
    // Since import is redirected, this is mostly a placeholder.
    Logger.log("File selected for import (though typically handled by dashboard):", event.target.files[0]);
}

// Expose methods to template (not strictly necessary with <script setup> for direct use in template)
// but can be useful for clarity or if you need to call them from parent/child in complex scenarios.
// For <script setup>, all top-level bindings are automatically exposed.

// --- Utility Functions (already imported but good to remember their usage) ---
// parseTimestamp, formatDateForDisplay, initTheme, applyTheme, toggleTheme are used directly.

</script>

<style scoped>
/* Global styles are primarily handled by popup.css, linked in popup.html.
  Add any component-specific styles here if needed.
  For example, if you want to style the .popup-container or specific elements
  only within this App.vue component without affecting other parts of the extension.
*/

.popup-container {
  display: flex;
  flex-direction: column;
  height: 100%; /* Ensure it tries to fill the popup window */
  max-height: 580px; /* Approximate max height for a typical popup */
}

header {
  flex-shrink: 0; /* Prevent header from shrinking */
}

main {
  flex-grow: 1; /* Allow main content to take available space */
  overflow-y: auto; /* Allow scrolling for content if it overflows */
  padding-bottom: 10px; /* Add some padding at the bottom */
}

footer {
  flex-shrink: 0; /* Prevent footer from shrinking */
  border-top: 1px solid var(--border-color); /* Re-add border that might be in global */
  padding: 8px;
  font-size: 11px;
  text-align: center;
  color: var(--text-light);
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-light);
}

.error-state button {
  margin-top: 15px;
}

/* Ensure controls in header don't wrap too aggressively */
.header-content .controls {
  flex-wrap: nowrap; /* Try to keep them in one line */
  overflow-x: auto; /* Allow horizontal scroll if they must overflow */
}

/* Minor adjustments for button sizing consistency if needed */
.button {
  white-space: nowrap; /* Prevent text wrapping in buttons */
}

</style>
