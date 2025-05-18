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
          { id: 'visualizations', label: 'Visualizations' }
        ]"
        v-model:activeTab="activeMainTab"
      />
      
      <div class="page-tab-content-area">
        <!-- History Tab Content -->
        <div class="page-tab-content" :class="{ active: activeMainTab === 'history' }">
          <LoadingState 
            v-if="isLoading"
            message="Loading your conversation history..."
          />
          
          <div v-else class="history-view-layout">
            <div class="sidebar">
              <Filters
                v-model:selectedModelFilter="selectedModelFilter"
                v-model:selectedDateFilter="selectedDateFilter"
                v-model:customStartDate="customStartDate"
                v-model:customEndDate="customEndDate"
                v-model:currentSortBy="currentSortBy"
                :availableModels="availableModels"
                @filter-change="handleFilterChange"
                @reset-filters="resetAllFilters"
              />
            </div>
            
            <div class="content">
              <ConversationsList
                :conversations="filteredHistory"
                :totalConversations="allHistory.length"
                :currentSortBy="currentSortBy"
                @update:currentSortBy="value => { currentSortBy = value; handleSortChange(); }"
                @show-details="showConversationDetailsModal"
                @start-chat="startGeminiChat"
                @reset-filters="resetAllFilters"
              />
            </div>
          </div>
        </div>
        
        <!-- Visualizations Tab Content -->
        <div class="page-tab-content" :class="{ active: activeMainTab === 'visualizations' }">
          <LoadingState 
            v-if="isLoading"
            message="Loading visualizations..."
          />
          
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
      </div>
    </main>
    
    <!-- Modals -->
    <ConversationDetail 
      :show="modals.conversationDetail.show"
      :conversation="modals.conversationDetail.data"
      @close="closeConversationDetailsModal"
      @open-in-gemini="url => { browser.tabs.create({ url }); }"
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
    <ToastContainer 
      :toasts="activeToasts" 
      @remove-toast="removeToast"
    />
    
    <!-- Hidden File Input for Import -->
    <input type="file" ref="importFileInputRef" accept=".json" style="display: none;" @change="handleFileSelectedForImport">
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import dayjs from 'dayjs';
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
  THEME_STORAGE_KEY
} from '../lib/utils.js';

// Import helper modules
import { 
  STORAGE_KEY,
  saveHistoryData, 
  loadHistoryData,
  filterAndSortHistory,
  generateDashboardStats,
  getAvailableModels,
  importHistoryData
} from './helpers/dataHelpers.js';
import {
  getModelDistributionChartConfig,
  getActivityOverTimeChartConfig
} from './helpers/chartHelpers.js';
import {
  createToastManager,
  exportHistoryData,
  processGuidedImportFromUrl,
  createImportGuidedExperience
} from './helpers/uiHelpers.js';
import {
  createModalManager,
  createDeleteConversationConfirmation,
  createClearHistoryConfirmation
} from './helpers/modalHelpers.js';

// Import components
import DashboardHeader from './components/DashboardHeader.vue';
import TabNavigation from './components/TabNavigation.vue';
import Filters from './components/Filters.vue';
import ConversationsList from './components/ConversationsList.vue';
import StatsOverview from './components/StatsOverview.vue';
import Visualizations from './components/Visualizations.vue';
import ConversationDetail from './components/ConversationDetail.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
import ToastContainer from './components/ToastContainer.vue';
import LoadingState from './components/LoadingState.vue';
import EmptyState from './components/EmptyState.vue';

// Initialize Day.js plugins
initDayjsPlugins();

// --- Reactive State ---
const isLoading = ref(true);
const allHistory = ref([]);
const searchFilterQuery = ref('');
const selectedModelFilter = ref('');
const selectedDateFilter = ref('all');
const customStartDate = ref(dayjs().subtract(30, 'days').format('YYYY-MM-DD'));
const customEndDate = ref(dayjs().format('YYYY-MM-DD'));
const currentSortBy = ref('date-desc');
const activeMainTab = ref('history');
const activeVizTab = ref('modelDistribution');
const currentTheme = ref('light');
const headerComponent = ref(null);
const visualizations = ref(null);
let chartInstance = null;
const importFileInputRef = ref(null);

const stats = ref({
  totalConversations: 0,
  mostUsedModel: '-',
  mostUsedModelCount: '',
  avgTitleLength: '-',
  firstConversationTime: '-',
  lastConversationTime: '-',
  totalFilesUploaded: 0,
});

// Initialize modal manager
const modalManager = createModalManager();
const modals = computed(() => modalManager.getModalState());

const activityChartOptions = ref({
  displayMode: 'combined',
  selectedModel: 'all'
});

// Initialize toast manager
const toastManager = createToastManager();
const activeToasts = computed(() => toastManager.getActiveToasts());

// --- Computed Properties ---
const availableModels = computed(() => getAvailableModels(allHistory.value));

const filteredHistory = computed(() => {
  Logger.log("Re-calculating filtered history...");
  return filterAndSortHistory(allHistory.value, {
    searchQuery: searchFilterQuery.value,
    modelFilter: selectedModelFilter.value,
    dateFilter: selectedDateFilter.value,
    customStartDate: customStartDate.value,
    customEndDate: customEndDate.value,
    sortBy: currentSortBy.value
  });
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  Logger.log("Dashboard App.vue: Component mounted");
  
  await initializeDashboard();
  
  // Clean up the temporary theme storage after it's been used
  localStorage.removeItem('dashboard_initialized_theme');
  
  checkUrlParameters(); // For guided import
});

// --- Initialization ---
async function initializeDashboard() {
  isLoading.value = true;
  try {
    // Get the theme that was pre-initialized in main.js
    // Check our special key first, then fallback to data-theme attribute
    currentTheme.value = localStorage.getItem('dashboard_initialized_theme') || 
                          document.documentElement.getAttribute('data-theme') || 
                          'light';
    
    // Only update the icon state - don't re-apply the theme which causes a redundant DOM update
    if (headerComponent.value) {
      updateThemeToggleIcon(currentTheme.value, headerComponent.value.themeIconSvg);
    }

    // Load history data using the helper function
    allHistory.value = await loadHistoryData();
    
    // Update stats and visualizations
    updateDashboardStats();
    
    if (activeMainTab.value === 'visualizations' && allHistory.value.length > 0) {
      // Wait for the DOM to update and then render charts
      await nextTick();
      renderCurrentVisualization();
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
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
  if (tabName === 'visualizations' && allHistory.value.length > 0) {
    // Wait for the DOM to update and then render the chart
    nextTick(() => {
      renderCurrentVisualization();
    });
  }
}

// --- Filters and Sorting ---
function handleFilterChange() {
  // Computed property `filteredHistory` will update automatically.
  Logger.log("Filter changed, computed property will update list.");
}

function handleDateFilterTypeChange() {
  if (selectedDateFilter.value !== 'custom') {
    handleFilterChange();
  }
  // If 'custom', user needs to select dates, then handleFilterChange will be triggered by date inputs
}

function handleSortChange() {
  // Computed property `filteredHistory` will re-sort.
  Logger.log("Sort option changed, computed property will update list.");
}

function resetAllFilters() {
  searchFilterQuery.value = '';
  selectedModelFilter.value = '';
  selectedDateFilter.value = 'all';
  customStartDate.value = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
  customEndDate.value = dayjs().format('YYYY-MM-DD');
  currentSortBy.value = 'date-desc'; // Reset sort
  showToast('Filters have been reset.', 'info');
  // `filteredHistory` will update automatically
}

// --- Data Management ---
async function saveData() {
  try {
    // Create a clean copy of the data without Vue reactive proxies to avoid DataCloneError
    const cleanHistoryData = JSON.parse(JSON.stringify(allHistory.value));
    await saveHistoryData(cleanHistoryData);
  } catch (error) {
    showToast(`Error saving data: ${error.message}`, 'error');
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
  browser.tabs.create({ url: 'https://gemini.google.com/app' });
}

// Create the delete conversation handler
const confirmDeleteConversation = createDeleteConversationConfirmation(modalManager, async (conversation) => {
  try {
    // Remove the conversation
    const conversationUrl = conversation.url;
    if (!conversationUrl) {
      showToast('Error: Unable to identify conversation to delete.', 'error');
      return;
    }
    
    const index = allHistory.value.findIndex(item => item.url === conversationUrl);
    if (index !== -1) {
      allHistory.value.splice(index, 1);
      await saveData();
      updateDashboardStats();
      showToast('Conversation deleted successfully.', 'success');
      closeConversationDetailsModal();
    } else {
      showToast('Conversation not found in history.', 'warning');
    }
  } catch (error) {
    showToast(`Error deleting conversation: ${error.message}`, 'error');
  }
});

// Create the clear all history handler
const confirmClearAllHistory = createClearHistoryConfirmation(modalManager, async () => {
  try {
    allHistory.value = [];
    await saveData();
    updateDashboardStats();
    showToast('All conversation history has been cleared.', 'success');
    if (activeMainTab.value === 'visualizations') {
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
    }
  } catch (error) {
    showToast(`Error clearing history: ${error.message}`, 'error');
  }
});

// --- Import/Export ---
function handleExportHistoryData() {
  try {
    const dataToExport = filteredHistory.value.length !== allHistory.value.length ? filteredHistory.value : allHistory.value;
    const isFiltered = filteredHistory.value.length !== allHistory.value.length;
    
    const result = exportHistoryData(dataToExport, isFiltered);
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'warning');
    }
  } catch (error) {
    showToast(`Export error: ${error.message}`, 'error');
  }
}

function triggerImportFile() {
  // Clear URL parameters if they exist from guided import
  if (window.location.search.includes('action=import')) {
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
    
    // Use the helper function to import data
    const { newItems, updatedHistory } = importHistoryData(fileContent, allHistory.value);
    
    if (newItems.length > 0) {
      // Update history with imported data
      allHistory.value = updatedHistory;
      
      // Save merged data
      await saveData();
      updateDashboardStats();
      
      if (activeMainTab.value === 'visualizations') {
        renderCurrentVisualization();
      }
      
      showToast(`Import complete: Added ${newItems.length} new conversation(s).`, 'success');
    } else {
      showToast('No new conversations were found in the imported file.', 'info');
    }
  } catch (error) {
    showToast(`Import error: ${error.message}`, 'error');
  } finally {
    // Clean up any guide elements that might have been created
    document.querySelectorAll('.guide-arrow-container').forEach(el => el.remove());
  }
}

// --- Statistics ---
function updateDashboardStats() {
  // Use the helper function to generate statistics
  stats.value = generateDashboardStats(allHistory.value);
}

// --- Visualizations (Chart.js) ---
function renderCurrentVisualization() {
  Logger.log(`Attempting to render visualization: tab=${activeMainTab.value}, vizTab=${activeVizTab.value}`);
  
  if (!visualizations.value) {
    Logger.log('Visualizations component reference is not available');
    return;
  }
  
  if (!visualizations.value.vizChartCanvas) {
    Logger.log('Canvas element is not available in the visualizations component');
    return;
  }
  
  if (allHistory.value.length === 0) {
    Logger.log('No history data available to render visualization');
    return;
  }

  if (chartInstance) {
    Logger.log('Destroying previous chart instance');
    chartInstance.destroy();
    chartInstance = null;
  }

  const chartCtx = visualizations.value.vizChartCanvas.getContext('2d');
  let chartConfig;

  // Use the chart helper functions
  if (activeVizTab.value === 'modelDistribution') {
    Logger.log('Generating model distribution chart config');
    chartConfig = getModelDistributionChartConfig(allHistory.value, currentTheme.value);
  } else if (activeVizTab.value === 'activityOverTime') {
    Logger.log('Generating activity over time chart config');
    chartConfig = getActivityOverTimeChartConfig(
      allHistory.value, 
      availableModels.value, 
      activityChartOptions.value,
      currentTheme.value
    );
  }

  if (chartConfig) {
    Logger.log(`Creating new chart instance for ${activeVizTab.value}`);
    chartInstance = new Chart(chartCtx, chartConfig);
  }
}

function updateActivityChart() {
  if (activeVizTab.value === 'activityOverTime') {
    renderCurrentVisualization();
  }
}

// Watchers for re-rendering chart
watch(currentTheme, () => {
  if (activeMainTab.value === 'visualizations' && allHistory.value.length > 0) renderCurrentVisualization();
});

// Watch for main tab changes to immediately render visualizations when that tab is selected
watch(activeMainTab, (newTab) => {
  if (newTab === 'visualizations' && allHistory.value.length > 0) {
    Logger.log('Visualization tab activated - preparing to render chart');
    // Give the DOM time to fully update before attempting to render
    nextTick(() => {
      // Double nextTick to ensure visualizations component is fully mounted
      nextTick(() => {
        if (visualizations.value && visualizations.value.vizChartCanvas) {
          renderCurrentVisualization();
        } else {
          Logger.log('Visualization component or canvas not ready yet, retrying in 100ms');
          // Last resort: try again after a short delay if the canvas isn't ready yet
          setTimeout(() => renderCurrentVisualization(), 100);
        }
      });
    });
  }
});

// Also watch activeVizTab to ensure charts update when switching between visualization types
watch(activeVizTab, () => {
  if (activeMainTab.value === 'visualizations' && allHistory.value.length > 0) {
    renderCurrentVisualization();
  }
});

watch(allHistory, () => {
  updateDashboardStats();
  if (activeMainTab.value === 'visualizations' && allHistory.value.length > 0) {
    renderCurrentVisualization();
  } else if (allHistory.value.length === 0 && chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}, { deep: true });

// Watch for changes to activeToasts to detect issues with toast lifecycle
watch(activeToasts, (newToasts, oldToasts) => {
  Logger.log(`🍞 App.vue watcher: activeToasts changed - now has ${newToasts.length} toasts`);
  
  // Show details about the toasts for debugging
  if (newToasts.length > 0) {
    newToasts.forEach(toast => {
      Logger.log(`🍞 App.vue watcher: Toast #${toast.id}, type: ${toast.type}, message: "${toast.message}"`);
    });
  }
  
  // Let's verify that the DOM is actually updating when toasts change
  nextTick(() => {
    const toastContainerElements = document.querySelectorAll('.toast-container .toast');
    Logger.log(`🍞 App.vue watcher: Toast DOM elements count: ${toastContainerElements.length} (should match ${newToasts.length})`);
    
    if (toastContainerElements.length !== newToasts.length) {
      Logger.warn(`🍞 App.vue watcher: MISMATCH! DOM has ${toastContainerElements.length} toasts but activeToasts has ${newToasts.length}`);
    }
  });
}, { deep: true });

// --- Toast Notifications ---
function showToast(message, type = 'info', duration = 5000) {
  Logger.log(`🍞 App.vue: showToast called with message: "${message}", type: ${type}, duration: ${duration}ms`);
  const toastId = toastManager.showToast(message, type, duration);
  Logger.log(`🍞 App.vue: Toast created with ID: ${toastId}`);
  
  // Debug check: Log the active toasts after creation
  const currentToasts = toastManager.getActiveToasts();
  Logger.log(`🍞 App.vue: Current active toasts after adding: ${currentToasts.length}`);
  
  // Check if the activeToasts computed property is updating
  Logger.log(`🍞 App.vue: activeToasts computed property value count: ${activeToasts.value.length}`);
  
  // Force a refresh of the UI by triggering nextTick
  nextTick(() => {
    Logger.log(`🍞 App.vue: nextTick after toast creation - activeToasts count: ${activeToasts.value.length}`);
    const toastElements = document.querySelectorAll('.toast-container .toast');
    Logger.log(`🍞 App.vue: DOM toast elements count: ${toastElements.length}`);
  });
  
  return toastId;
}

function removeToast(id) {
  Logger.log(`🍞 App.vue: removeToast called with ID: ${id}`);
  toastManager.removeToast(id);
  
  // Debug check after removal
  Logger.log(`🍞 App.vue: activeToasts computed property count after removal: ${activeToasts.value.length}`);
  
  // Force a refresh of the UI by triggering nextTick
  nextTick(() => {
    Logger.log(`🍞 App.vue: nextTick after toast removal - activeToasts count: ${activeToasts.value.length}`);
    const toastElements = document.querySelectorAll('.toast-container .toast');
    Logger.log(`🍞 App.vue: DOM toast elements count: ${toastElements.length}`);
  });
}

// --- Guided Import ---
function checkUrlParameters() {
  if (processGuidedImportFromUrl()) {
    // Give time for the UI to render, then guide the user to import
    setTimeout(() => {
      createImportGuidedExperience('importHistory');
    }, 500);
  }
}
</script>

<style scoped>
.dashboard-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

main {
  flex: 1;
  overflow: hidden;
  padding: 0 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
}

.page-tab-content-area {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.page-tab-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease;
  overflow-y: auto;
}

.page-tab-content.active {
  opacity: 1;
  visibility: visible;
}

.history-view-layout {
  display: flex;
  height: 100%;
  gap: 1.5rem;
}

.sidebar {
  width: 250px;
  flex-shrink: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.visualization-view-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
}

/* Animation for the import guidance */
@keyframes pulse-arrow {
  0%, 100% { opacity: 0.6; transform: translateX(0); }
  50% { opacity: 1; transform: translateX(-5px); }
}

.highlight-pulse {
  animation: button-pulse 1.5s infinite;
  position: relative;
  z-index: 5;
}

@keyframes button-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(110, 65, 226, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(110, 65, 226, 0.2); }
}
</style>
