<template>
  <div class="dashboard-container">
    <!-- Header -->
    <DashboardHeader
      ref="headerComponent"
      v-model:searchQuery="searchFilterQuery"
      @theme-toggle="handleThemeToggle"
      @export="handleExportHistoryData"
      @import="triggerImportFile"
      @clear-history="confirmClearAllHistory"
    />

    <main>
      <!-- Main Navigation Tabs -->
      <TabNavigation
        :tabs="[
          { id: 'history', label: 'History' },
          { id: 'visualizations', label: 'Visualizations' },
          { id: 'settings', label: 'Settings' },
        ]"
        v-model:activeTab="activeMainTab"
      />

      <div class="page-tab-content-area">
        <!-- History Tab Content -->
        <div class="page-tab-content" :class="{ active: activeMainTab === 'history' }">
          <LoadingState v-if="isLoading" message="Loading your conversation history..." />

          <div v-else class="history-view-layout">
            <div class="sidebar">
              <Filters
                v-model:selectedModelFilter="selectedModelFilter"
                v-model:selectedPlanFilter="selectedPlanFilter"
                v-model:selectedGemFilter="selectedGemFilter"
                v-model:selectedDateFilter="selectedDateFilter"
                v-model:customStartDate="customStartDate"
                v-model:customEndDate="customEndDate"
                v-model:currentSortBy="currentSortBy"
                :availableModels="availableModels"
                :availablePlans="availablePlans"
                :availableGems="availableGems"
                :hasSearchQuery="!!searchFilterQuery"
                @filter-change="handleFilterChange"
                @reset-filters="resetAllFilters"
              />
            </div>

            <div class="content">
              <ConversationsList
                :conversations="filteredHistory"
                :totalConversations="allHistory.length"
                :currentSortBy="currentSortBy"
                :hasSearchQuery="!!searchFilterQuery"
                :searchQuery="searchFilterQuery"
                @update:currentSortBy="
                  (value) => {
                    currentSortBy = value;
                    handleSortChange();
                  }
                "
                @show-details="showConversationDetailsModal"
                @start-chat="startGeminiChat"
                @reset-filters="resetAllFilters"
              />
            </div>
          </div>
        </div>

        <!-- Visualizations Tab Content -->
        <div class="page-tab-content" :class="{ active: activeMainTab === 'visualizations' }">
          <LoadingState v-if="isLoading" message="Loading visualizations..." />

          <EmptyState
            v-else-if="allHistory.length === 0"
            icon="📊"
            title="No Data for Visualizations"
            message="Chat with Gemini to see your activity visualized here."
          />

          <div v-else class="visualization-view-layout">
            <StatsOverview :stats="stats" />

            <Visualizations
              ref="visualizations"
              v-model:activeVizTab="activeVizTab"
              v-model:activityChartOptions="activityChartOptions"
              :availableModels="availableModels"
              :currentTheme="currentTheme"
              @render-chart="renderCurrentVisualization"
            />
          </div>
        </div>

        <!-- Settings Tab Content -->
        <div class="page-tab-content" :class="{ active: activeMainTab === 'settings' }">
          <div class="settings-view-layout">
            <div class="settings-sidebar">
              <div class="settings-nav">
                <button class="settings-nav-item active" @click="activeSettingsTab = 'logging'">
                  Logging
                </button>
                <!-- More settings categories can be added here -->
              </div>
            </div>

            <div class="settings-content">
              <LoggingSettings v-if="activeSettingsTab === 'logging'" />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modals -->
    <ConversationDetail
      :show="modals.conversationDetail.show"
      :conversation="modals.conversationDetail.data"
      @close="closeConversationDetailsModal"
      @open-in-gemini="
        (url) => {
          browser.tabs.create({ url });
        }
      "
      @copy-url="
        (url) => {
          showToast('URL copied to clipboard', 'success');
        }
      "
      @delete="confirmDeleteConversation"
    />

    <ConfirmationModal
      :show="modals.confirmation.show"
      :title="modals.confirmation.title"
      :message="modals.confirmation.message"
      @confirm="executeConfirmedAction"
      @cancel="closeConfirmationModal"
    />

    <!-- Toast Notifications -->
    <ToastContainer :toasts="activeToasts" @remove-toast="removeToast" />

    <!-- Hidden File Input for Import -->
    <input
      type="file"
      ref="importFileInputRef"
      accept=".json"
      style="display: none"
      @change="handleFileSelectedForImport"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import Chart from "chart.js/auto";
import dayjs from "dayjs";
import {
  initDayjsPlugins,
  Logger,
  parseTimestamp,
  dayjsFormatDate,
  readFile,
  initializeTheme,
  applyTheme,
  toggleTheme,
  updateThemeToggleIcon,
  THEME_STORAGE_KEY,
} from "../lib/utils.js";

// Import helper modules
import {
  STORAGE_KEY,
  saveHistoryData,
  loadHistoryData,
  filterAndSortHistory,
  generateDashboardStats,
  getAvailableModels,
  getAvailablePlans,
  getAvailableGems,
  importHistoryData,
} from "./helpers/dataHelpers.js";
import { createSearchIndex } from "./helpers/searchHelpers.js";
import {
  getModelDistributionChartConfig,
  getActivityOverTimeChartConfig,
  getPlanDistributionChartConfig,
  getGemDistributionChartConfig,
} from "./helpers/chartHelpers.js";
import {
  createToastManager,
  exportHistoryData,
  processGuidedImportFromUrl,
  createImportGuidedExperience,
  removeImportGuidance,
} from "./helpers/uiHelpers.js";
import {
  createModalManager,
  createDeleteConversationConfirmation,
  createClearHistoryConfirmation,
} from "./helpers/modalHelpers.js";

// Import components
import DashboardHeader from "./components/DashboardHeader.vue";
import TabNavigation from "./components/TabNavigation.vue";
import Filters from "./components/Filters.vue";
import ConversationsList from "./components/ConversationsList.vue";
import StatsOverview from "./components/StatsOverview.vue";
import Visualizations from "./components/Visualizations.vue";
import ConversationDetail from "./components/ConversationDetail.vue";
import ConfirmationModal from "./components/ConfirmationModal.vue";
import ToastContainer from "./components/ToastContainer.vue";
import LoadingState from "./components/LoadingState.vue";
import EmptyState from "./components/EmptyState.vue";
import LoggingSettings from "./components/LoggingSettings.vue";

// Initialize Day.js plugins
initDayjsPlugins();

// --- Reactive State ---
const isLoading = ref(true);
const activeSettingsTab = ref("logging");
const allHistory = ref([]);
const searchFilterQuery = ref("");
const selectedModelFilter = ref("");
const selectedPlanFilter = ref("");
const selectedGemFilter = ref("");
const selectedDateFilter = ref("all");
const customStartDate = ref(dayjs().subtract(30, "days").format("YYYY-MM-DD"));
const customEndDate = ref(dayjs().format("YYYY-MM-DD"));
const currentSortBy = ref("date-desc");
const searchIndex = ref(null); // MiniSearch instance
const activeMainTab = ref("history");
const activeVizTab = ref("modelDistribution");
const currentTheme = ref("light");
const headerComponent = ref(null);
const visualizations = ref(null);
let chartInstance = null;
const importFileInputRef = ref(null);

const stats = ref({
  totalConversations: 0,
  mostUsedModel: "-",
  mostUsedModelCount: "",
  avgTitleLength: "-",
  firstConversationTime: "-",
  lastConversationTime: "-",
  totalFilesUploaded: 0,
});

// Initialize modal manager
const modalManager = createModalManager();
const modals = computed(() => modalManager.getModalState());

const activityChartOptions = ref({
  displayMode: "combined",
  selectedModel: "all",
});

// Initialize toast manager
const toastManager = createToastManager();
const activeToasts = computed(() => toastManager.getActiveToasts());

// --- Computed Properties ---
const availableModels = computed(() => getAvailableModels(allHistory.value));
const availablePlans = computed(() => getAvailablePlans(allHistory.value));
const availableGems = computed(() => getAvailableGems(allHistory.value));

const filteredHistory = computed(() => {
  Logger.log("App.vue", "Re-calculating filtered history...");

  // Use the persistent search index for better performance
  // Pass the search index to filterAndSortHistory function
  return filterAndSortHistory(allHistory.value, {
    searchQuery: searchFilterQuery.value,
    modelFilter: selectedModelFilter.value,
    planFilter: selectedPlanFilter.value,
    gemFilter: selectedGemFilter.value,
    dateFilter: selectedDateFilter.value,
    customStartDate: customStartDate.value,
    customEndDate: customEndDate.value,
    sortBy: currentSortBy.value,
    searchIndex: searchIndex.value, // Pass the persistent search index
  });
});

// --- Lifecycle Hooks ---
// Ensure the settings tab always shows logging settings by default
watch(activeMainTab, (newTab) => {
  if (newTab === "settings") activeSettingsTab.value = "logging";
});

/**
 * Handles real-time storage changes for live dashboard updates.
 * This listener is called whenever browser.storage.local changes,
 * allowing the dashboard to stay in sync without polling.
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

  Logger.log("App.vue", `Storage changed: ${previousCount} → ${newCount} entries`);

  // Update the reactive history data
  // Note: The allHistory watcher handles updateDashboardStats() and renderCurrentVisualization()
  allHistory.value = newValue || [];

  // Rebuild search index with new data (not handled by watcher)
  Logger.log("App.vue", "Rebuilding search index after storage change");
  searchIndex.value = createSearchIndex(allHistory.value);

  // Show a subtle toast notification for new entries (good UX feedback)
  const entriesAdded = newCount - previousCount;
  if (entriesAdded > 0) {
    const message =
      entriesAdded === 1 ? "New conversation added to history" : `${entriesAdded} new conversations added`;
    showToast(message, "success", 3000);
  } else if (entriesAdded < 0) {
    // Entries were removed (deletion or clear)
    const entriesRemoved = Math.abs(entriesAdded);
    if (newCount === 0 && previousCount > 0) {
      // All history was cleared - don't show toast as user likely triggered this
      Logger.log("App.vue", "History cleared via storage change");
    } else if (entriesRemoved === 1) {
      Logger.log("App.vue", "Single entry removed via storage change");
    }
  }
}

onMounted(async () => {
  Logger.log("App.vue", "Dashboard App.vue: Component mounted");

  await initializeDashboard();

  // Set up real-time storage change listener for live updates
  browser.storage.onChanged.addListener(handleStorageChange);
  Logger.log("App.vue", "Storage change listener registered for real-time updates");

  // Clean up the temporary theme storage after it's been used
  localStorage.removeItem("dashboard_initialized_theme");

  // Add event listener to clean up guidance elements when the page is unloaded
  window.addEventListener("beforeunload", removeImportGuidance);

  checkUrlParameters(); // For guided import
});

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  // Remove storage change listener to prevent memory leaks
  browser.storage.onChanged.removeListener(handleStorageChange);
  Logger.log("App.vue", "Storage change listener removed");

  window.removeEventListener("beforeunload", removeImportGuidance);
});

// --- Initialization ---
async function initializeDashboard() {
  isLoading.value = true;
  try {
    // Get the theme that was pre-initialized in main.js
    // Check our special key first, then fallback to data-theme attribute
    currentTheme.value =
      localStorage.getItem("dashboard_initialized_theme") ||
      document.documentElement.getAttribute("data-theme") ||
      "light";

    // Only update the icon state - don't re-apply the theme which causes a redundant DOM update
    if (headerComponent.value) {
      updateThemeToggleIcon(currentTheme.value, headerComponent.value.themeIconSvg);
    }

    // Load history data using the helper function
    allHistory.value = await loadHistoryData();

    // Initialize search index for faster searching
    Logger.log("App.vue", "Creating search index for faster searching");
    searchIndex.value = createSearchIndex(allHistory.value);

    // Update stats and visualizations
    updateDashboardStats();

    if (activeMainTab.value === "visualizations" && allHistory.value.length > 0) {
      // Wait for the DOM to update and then render charts
      await nextTick();
      renderCurrentVisualization();
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, "error");
  } finally {
    isLoading.value = false;
  }
}

// --- Theme ---
function handleThemeToggle(themeIconSvgElement) {
  currentTheme.value = toggleTheme(currentTheme.value, themeIconSvgElement);
  if (chartInstance) {
    // Re-render chart with new theme colors
    renderCurrentVisualization();
  }
}

// --- Tabs ---
function setActiveMainTab(tabName) {
  activeMainTab.value = tabName;

  // Clean up any import guidance elements when switching tabs
  removeImportGuidance();

  if (tabName === "visualizations" && allHistory.value.length > 0) {
    // Wait for the DOM to update and then render the chart
    nextTick(() => {
      renderCurrentVisualization();
    });
  }
}

// --- Filters and Sorting ---
function handleFilterChange() {
  // Computed property `filteredHistory` will update automatically.
  Logger.log("App.vue", "Filter changed, computed property will update list.");
}

function handleDateFilterTypeChange() {
  if (selectedDateFilter.value !== "custom") {
    handleFilterChange();
  }
  // If 'custom', user needs to select dates, then handleFilterChange will be triggered by date inputs
}

function handleSortChange() {
  // Computed property `filteredHistory` will re-sort.
  Logger.log("App.vue", "Sort option changed, computed property will update list.");
}

function resetAllFilters() {
  searchFilterQuery.value = "";
  selectedModelFilter.value = "";
  selectedPlanFilter.value = "";
  selectedGemFilter.value = "";
  selectedDateFilter.value = "all";
  customStartDate.value = dayjs().subtract(30, "days").format("YYYY-MM-DD");
  customEndDate.value = dayjs().format("YYYY-MM-DD");
  currentSortBy.value = "date-desc"; // Reset sort
  showToast("Filters have been reset.", "info");
  // `filteredHistory` will update automatically
}

// --- Data Management ---
async function saveData() {
  try {
    // Create a clean copy of the data without Vue reactive proxies to avoid DataCloneError
    const cleanHistoryData = JSON.parse(JSON.stringify(allHistory.value));
    await saveHistoryData(cleanHistoryData);
  } catch (error) {
    showToast(`Error saving data: ${error.message}`, "error");
    throw error; // Re-throw for caller to handle
  }
}

// --- Modals ---
// Use the modal manager functions
const showConversationDetailsModal = modalManager.showConversationDetailsModal;
const closeConversationDetailsModal = modalManager.closeConversationDetailsModal;
const showConfirmationModal = modalManager.showConfirmationModal;
const closeConfirmationModal = modalManager.closeConfirmationModal;
const executeConfirmedAction = modalManager.executeConfirmedAction;

// --- Actions ---
function startGeminiChat() {
  browser.tabs.create({ url: "https://gemini.google.com/app" });
}

// Create the delete conversation handler
const confirmDeleteConversation = createDeleteConversationConfirmation(modalManager, async (conversation) => {
  try {
    // Remove the conversation
    const conversationUrl = conversation.url;
    if (!conversationUrl) {
      showToast("Error: Unable to identify conversation to delete.", "error");
      return;
    }

    const index = allHistory.value.findIndex((item) => item.url === conversationUrl);
    if (index !== -1) {
      allHistory.value.splice(index, 1);
      await saveData();
      // Note: updateDashboardStats() is handled by allHistory watcher
      showToast("Conversation deleted successfully.", "success");
      closeConversationDetailsModal();
    } else {
      showToast("Conversation not found in history.", "warning");
    }
  } catch (error) {
    showToast(`Error deleting conversation: ${error.message}`, "error");
  }
});

// Create the clear all history handler
const confirmClearAllHistory = createClearHistoryConfirmation(modalManager, async () => {
  try {
    allHistory.value = [];
    await saveData();
    // Note: updateDashboardStats() and chart cleanup are handled by allHistory watcher
    showToast("All conversation history has been cleared.", "success");
  } catch (error) {
    showToast(`Error clearing history: ${error.message}`, "error");
  }
});

// --- Import/Export ---
function handleExportHistoryData() {
  try {
    const dataToExport =
      filteredHistory.value.length !== allHistory.value.length ? filteredHistory.value : allHistory.value;
    const isFiltered = filteredHistory.value.length !== allHistory.value.length;

    const result = exportHistoryData(dataToExport, isFiltered);
    if (result.success) {
      showToast(result.message, "success");
    } else {
      showToast(result.message, "warning");
    }
  } catch (error) {
    showToast(`Export error: ${error.message}`, "error");
  }
}

function triggerImportFile() {
  // Clear URL parameters if they exist from guided import
  if (window.location.search.includes("action=import")) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  importFileInputRef.value?.click();
}

async function handleFileSelectedForImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    // Reset file input so same file can be selected again
    event.target.value = null;

    const fileContent = await readFile(file);

    // Use the helper function to import data - now with await since the function is async
    const { newItems, updatedHistory } = await importHistoryData(fileContent, allHistory.value);

    if (newItems.length > 0) {
      // Update history with imported data
      // Note: updateDashboardStats() and renderCurrentVisualization() are handled by allHistory watcher
      allHistory.value = updatedHistory;

      showToast(`Import complete: Added ${newItems.length} new conversation(s).`, "success");
    } else {
      showToast("No new conversations were found in the imported file.", "info");
    }
  } catch (error) {
    showToast(`Import error: ${error.message}`, "error");
  } finally {
    // Clean up all guidance elements using the helper function
    removeImportGuidance();
  }
}

// --- Statistics ---
function updateDashboardStats() {
  // Use the helper function to generate statistics
  stats.value = generateDashboardStats(allHistory.value);
}

// --- Visualizations (Chart.js) ---
function renderCurrentVisualization() {
  Logger.log(
    "App.vue",
    `Attempting to render visualization: tab=${activeMainTab.value}, vizTab=${activeVizTab.value}`
  );

  if (!visualizations.value) {
    Logger.log("App.vue", "Visualizations component reference is not available");
    return;
  }

  if (!visualizations.value.vizChartCanvas) {
    Logger.log("App.vue", "Canvas element is not available in the visualizations component");
    return;
  }

  if (allHistory.value.length === 0) {
    Logger.log("App.vue", "No history data available to render visualization");
    return;
  }

  if (chartInstance) {
    Logger.log("App.vue", "Destroying previous chart instance");
    chartInstance.destroy();
    chartInstance = null;
  }

  const chartCtx = visualizations.value.vizChartCanvas.getContext("2d");
  let chartConfig;

  // Use the chart helper functions
  if (activeVizTab.value === "modelDistribution") {
    Logger.log("App.vue", "Generating model distribution chart config");
    chartConfig = getModelDistributionChartConfig(allHistory.value, currentTheme.value);
  } else if (activeVizTab.value === "planDistribution") {
    Logger.log("App.vue", "Generating plan distribution chart config");
    chartConfig = getPlanDistributionChartConfig(allHistory.value, currentTheme.value);
  } else if (activeVizTab.value === "gemDistribution") {
    Logger.log("App.vue", "Generating gem distribution chart config");
    chartConfig = getGemDistributionChartConfig(allHistory.value, currentTheme.value);
  } else if (activeVizTab.value === "activityOverTime") {
    Logger.log("App.vue", "Generating activity over time chart config");
    chartConfig = getActivityOverTimeChartConfig(
      allHistory.value,
      availableModels.value,
      activityChartOptions.value,
      currentTheme.value
    );
  }

  if (chartConfig) {
    Logger.log("App.vue", `Creating new chart instance for ${activeVizTab.value}`);
    chartInstance = new Chart(chartCtx, chartConfig);
  }
}

function updateActivityChart() {
  if (activeVizTab.value === "activityOverTime") {
    renderCurrentVisualization();
  }
}

// Watchers for re-rendering chart
watch(currentTheme, () => {
  if (activeMainTab.value === "visualizations" && allHistory.value.length > 0) renderCurrentVisualization();
});

// Watch for main tab changes to immediately render visualizations when that tab is selected
watch(activeMainTab, (newTab) => {
  if (newTab === "visualizations" && allHistory.value.length > 0) {
    Logger.log("App.vue", "Visualization tab activated - preparing to render chart");
    // Give the DOM time to fully update before attempting to render
    nextTick(() => {
      // Double nextTick to ensure visualizations component is fully mounted
      nextTick(() => {
        if (!visualizations.value || !visualizations.value.vizChartCanvas) {
          Logger.log("App.vue", "Visualization component or canvas not ready yet, retrying in 100ms");
          // If the canvas isn't ready yet, try again in 100ms
          setTimeout(() => {
            renderCurrentVisualization();
          }, 100);
        } else {
          renderCurrentVisualization();
        }
      });
    });
  }
});

// Also watch activeVizTab to ensure charts update when switching between visualization types
watch(activeVizTab, () => {
  if (activeMainTab.value === "visualizations" && allHistory.value.length > 0) {
    renderCurrentVisualization();
  }
});

watch(
  allHistory,
  () => {
    updateDashboardStats();
    if (activeMainTab.value === "visualizations" && allHistory.value.length > 0) {
      renderCurrentVisualization();
    } else if (allHistory.value.length === 0 && chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  },
  { deep: true }
);

// Watch for changes to activeToasts to detect issues with toast lifecycle
watch(
  activeToasts,
  (newToasts, oldToasts) => {
    Logger.log("App.vue", `🍞 App.vue watcher: activeToasts changed - now has ${newToasts.length} toasts`);

    // Show details about the toasts for debugging
    if (newToasts.length > 0) {
      newToasts.forEach((toast) => {
        Logger.log(
          "App.vue",
          `🍞 App.vue watcher: Toast #${toast.id}, type: ${toast.type}, message: "${toast.message}"`
        );
      });
    }

    // Let's verify that the DOM is actually updating when toasts change
    nextTick(() => {
      const toastContainerElements = document.querySelectorAll(".toast-container .toast");
      Logger.log(
        "App.vue",
        `🍞 App.vue watcher: Toast DOM elements count: ${toastContainerElements.length} (should match ${newToasts.length})`
      );

      if (toastContainerElements.length !== newToasts.length) {
        Logger.warn(
          "App.vue",
          `🍞 App.vue watcher: MISMATCH! DOM has ${toastContainerElements.length} toasts but activeToasts has ${newToasts.length}`
        );
      }
    });
  },
  { deep: true }
);

// --- Toast Notifications ---
function showToast(message, type = "info", duration = 5000) {
  Logger.log(
    "App.vue",
    `🍞 App.vue: showToast called with message: "${message}", type: ${type}, duration: ${duration}ms`
  );
  const toastId = toastManager.showToast(message, type, duration);
  Logger.log("App.vue", `🍞 App.vue: Toast created with ID: ${toastId}`);

  // Debug check: Log the active toasts after creation
  const currentToasts = toastManager.getActiveToasts();
  Logger.log("App.vue", `🍞 App.vue: Current active toasts after adding: ${currentToasts.length}`);

  // Check if the activeToasts computed property is updating
  Logger.log(
    "App.vue",
    `🍞 App.vue: activeToasts computed property value count: ${activeToasts.value.length}`
  );

  // Force a refresh of the UI by triggering nextTick
  nextTick(() => {
    Logger.log(
      "App.vue",
      `🍞 App.vue: nextTick after toast creation - activeToasts count: ${activeToasts.value.length}`
    );
    const toastElements = document.querySelectorAll(".toast-container .toast");
    Logger.log("App.vue", `🍞 App.vue: DOM toast elements count: ${toastElements.length}`);
  });

  return toastId;
}

function removeToast(id) {
  Logger.log("App.vue", `🍞 App.vue: removeToast called with ID: ${id}`);
  toastManager.removeToast(id);

  // Debug check after removal
  Logger.log(
    "App.vue",
    `🍞 App.vue: activeToasts computed property count after removal: ${activeToasts.value.length}`
  );

  // Force a refresh of the UI by triggering nextTick
  nextTick(() => {
    Logger.log(
      "App.vue",
      `🍞 App.vue: nextTick after toast removal - activeToasts count: ${activeToasts.value.length}`
    );
    const toastElements = document.querySelectorAll(".toast-container .toast");
    Logger.log("App.vue", `🍞 App.vue: DOM toast elements count: ${toastElements.length}`);
  });
}

// --- Guided Import ---
/**
 * Checks URL parameters for import action and initializes guided import experience
 */
function checkUrlParameters() {
  if (processGuidedImportFromUrl()) {
    // Remove any existing guidance first (in case of multiple redirects)
    removeImportGuidance();

    // Give timeout to prevent guidance visual from appearing too early
    setTimeout(() => {
      createImportGuidedExperience("importHistory");
    }, 200); // small timeout for better UX
  }
}
</script>

<style scoped>
.content {
  width: 100%;
}

.settings-view-layout {
  display: flex;
  height: 100%;
  gap: 1.5rem;
}

.settings-sidebar {
  width: 200px;
  flex-shrink: 0;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.settings-nav {
  background-color: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
}

.settings-nav-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-color);
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
}

.settings-nav-item:last-child {
  border-bottom: none;
}

.settings-nav-item:hover {
  background-color: var(--hover-bg);
}

.settings-nav-item.active {
  background-color: var(--primary-color);
  color: white;
}
</style>
