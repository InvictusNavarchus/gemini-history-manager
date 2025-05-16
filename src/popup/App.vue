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
      <LoadingError 
        :is-loading="isLoading"
        :error-state="errorState"
        @retry="retryInitialization" 
      />
      
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

    <input type="file" ref="importFileInput" accept=".json" style="display: none;" @change="handleFileImported">
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import dayjs from 'dayjs'; // Direct import for filename formatting
import {
  Logger,
  parseTimestamp,
  formatDateForDisplay,
  initTheme,
  applyTheme,
  toggleTheme,
  initDayjsPlugins,
  updateThemeToggleIcon
} from '../lib/utils.js';

// Import components
import Header from './components/Header.vue';
import StatsOverview from './components/StatsOverview.vue';
import ConversationList from './components/ConversationList.vue';
import LoadingError from './components/LoadingError.vue';

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
const headerComponent = ref(null); // Ref for the Header component to access themeIconSvg

const isLoading = ref(true);
const errorState = ref({ hasError: false, message: '' });

// --- Initialization and Data Loading ---
onMounted(async () => {
  Logger.log("Popup App.vue: Component mounted");
  await initializePopup();
  
  // Enable transitions only after the app is fully initialized and rendered
  // This prevents theme transition flash on initial load
  setTimeout(() => {
    document.documentElement.classList.add('ready-for-transitions');
    Logger.log("Transitions enabled");
  }, 100); // Short delay to ensure rendering is complete
});

async function initializePopup() {
  isLoading.value = true;
  errorState.value = { hasError: false, message: '' };
  try {
    await loadExtensionVersion();
    // Initialize theme and then apply it, passing the SVG ref
    // Note: Initial theme was already applied by script in main.js before Vue mounts
    initTheme((themeValue) => {
      currentTheme.value = themeValue;
      // Apply theme to icon after component is mounted
      if (headerComponent.value) {
        updateThemeToggleIcon(themeValue, headerComponent.value.themeIconSvg);
      }
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
function handleThemeToggle(themeIconSvgElement) {
  Logger.log("Theme toggle button clicked");
  currentTheme.value = toggleTheme(currentTheme.value, themeIconSvgElement);
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
  Component-specific styles are mainly moved to their respective components.
  Only keep layout-related styles here.
*/

.popup-container {
  display: flex;
  flex-direction: column;
  height: 100%; /* Ensure it tries to fill the popup window */
  max-height: 580px; /* Approximate max height for a typical popup */
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

/* Header controls moved to Header.vue component */

/* Since components have their own styles, we only need to keep
   layout and positioning styles in the main App.vue */

/* Minor adjustments for button sizing consistency if needed */
.button {
  white-space: nowrap; /* Prevent text wrapping in buttons */
}

</style>
