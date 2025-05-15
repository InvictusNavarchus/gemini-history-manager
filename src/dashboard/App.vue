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
  initTheme,
  applyTheme,
  toggleTheme
} from '../lib/utils.js';

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

// --- Constants ---
const STORAGE_KEY = 'geminiChatHistory';
const CHART_COLORS = [
  'rgba(110, 65, 226, 0.8)', // Primary purple
  'rgba(71, 163, 255, 0.8)',  // Blue
  'rgba(0, 199, 176, 0.8)',   // Teal
  'rgba(255, 167, 38, 0.8)',  // Orange
  'rgba(239, 83, 80, 0.8)',   // Red
  'rgba(171, 71, 188, 0.8)'   // Pink
];

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

const modals = ref({
  conversationDetail: { show: false, data: {} },
  confirmation: { show: false, title: '', message: '', onConfirm: null }
});

const activityChartOptions = ref({
  displayMode: 'combined',
  selectedModel: 'all'
});

const activeToasts = ref([]);
let toastIdCounter = 0;

// --- Computed Properties ---
const availableModels = computed(() => {
  const models = new Set(allHistory.value.map(item => item.model || 'Unknown'));
  return Array.from(models).sort();
});

const filteredHistory = computed(() => {
  Logger.log("Re-calculating filtered history...");
  let items = [...allHistory.value];

  // Apply search filter
  if (searchFilterQuery.value) {
    const searchLower = searchFilterQuery.value.toLowerCase();
    items = items.filter(item => 
      (item.title && item.title.toLowerCase().includes(searchLower)) || 
      (item.prompt && item.prompt.toLowerCase().includes(searchLower))
    );
  }

  // Apply model filter
  if (selectedModelFilter.value) {
    items = items.filter(item => item.model === selectedModelFilter.value);
  }

  // Apply date filter
  const now = dayjs();
  if (selectedDateFilter.value !== 'all') {
    let startDate, endDate;
    
    if (selectedDateFilter.value === 'today') {
      startDate = now.startOf('day');
      endDate = now.endOf('day');
    } else if (selectedDateFilter.value === 'yesterday') {
      startDate = now.subtract(1, 'day').startOf('day');
      endDate = now.subtract(1, 'day').endOf('day');
    } else if (selectedDateFilter.value === 'thisWeek') {
      startDate = now.startOf('week');
      endDate = now;
    } else if (selectedDateFilter.value === 'thisMonth') {
      startDate = now.startOf('month');
      endDate = now;
    } else if (selectedDateFilter.value === 'custom') {
      startDate = dayjs(customStartDate.value).startOf('day');
      endDate = dayjs(customEndDate.value).endOf('day');
    }
    
    if (startDate && endDate) {
      items = items.filter(item => {
        const timestamp = parseTimestamp(item.timestamp);
        return timestamp.isValid() && timestamp.isBetween(startDate, endDate, null, '[]');
      });
    }
  }

  // Apply sorting
  switch (currentSortBy.value) {
    case 'date-desc':
      items.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
      break;
    case 'date-asc':
      items.sort((a, b) => parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf());
      break;
    case 'title-asc':
      items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'title-desc':
      items.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      break;
    case 'model':
      items.sort((a, b) => (a.model || '').localeCompare(b.model || ''));
      break;
  }
  
  Logger.log(`Filtered history now contains ${items.length} items.`);
  return items;
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  Logger.log("Dashboard App.vue: Component mounted");
  await initializeDashboard();
  checkUrlParameters(); // For guided import
});

// --- Initialization ---
async function initializeDashboard() {
  isLoading.value = true;
  try {
    // Initialize theme
    initTheme((themeValue) => {
      currentTheme.value = themeValue;
      if (headerComponent.value) {
        applyTheme(currentTheme.value, headerComponent.value.themeIconSvg);
      }
    });

    // Load history data
    const data = await browser.storage.local.get(STORAGE_KEY);
    allHistory.value = data[STORAGE_KEY] || [];
    allHistory.value.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
    
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
    await browser.storage.local.set({ [STORAGE_KEY]: allHistory.value });
    Logger.log(`Saved ${allHistory.value.length} conversations to storage`);
  } catch (error) {
    Logger.error('Error saving data:', error);
    throw error; // Re-throw for caller to handle
  }
}

// --- Modals ---
function showConversationDetailsModal(conversation) {
  modals.value.conversationDetail = { show: true, data: conversation };
}

function closeConversationDetailsModal() {
  modals.value.conversationDetail.show = false;
}

function showConfirmationModal(title, message, onConfirmCallback) {
  modals.value.confirmation = {
    show: true,
    title,
    message,
    onConfirm: onConfirmCallback
  };
}

function closeConfirmationModal() {
  modals.value.confirmation.show = false;
  modals.value.confirmation.onConfirm = null;
}

async function executeConfirmedAction() {
  if (typeof modals.value.confirmation.onConfirm === 'function') {
    await modals.value.confirmation.onConfirm();
  }
  closeConfirmationModal();
}

// --- Actions ---
function startGeminiChat() {
  browser.tabs.create({ url: 'https://gemini.google.com/app' });
}

function confirmDeleteConversation(conversation) {
  showConfirmationModal(
    'Delete Conversation',
    'Are you sure you want to delete this conversation? This action cannot be undone.',
    async () => {
      try {
        // Remove the conversation
        const index = allHistory.value.findIndex(item => item.url === conversation.url);
        if (index !== -1) {
          allHistory.value.splice(index, 1);
          await saveData();
          updateDashboardStats();
          showToast('Conversation deleted successfully.', 'success');
          closeConversationDetailsModal();
        }
      } catch (error) {
        showToast(`Error deleting conversation: ${error.message}`, 'error');
      }
    }
  );
}

function confirmClearAllHistory() {
  showConfirmationModal(
    'Clear All History',
    'Are you sure you want to clear your entire conversation history? This action cannot be undone.',
    async () => {
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
    }
  );
}

// --- Import/Export ---
function handleExportHistoryData() {
  try {
    const dataToExport = filteredHistory.value.length !== allHistory.value.length ? filteredHistory.value : allHistory.value;
    const exportTypeMessage = filteredHistory.value.length !== allHistory.value.length ? 'filtered conversations' : 'all conversations';
    
    if (dataToExport.length === 0) {
      showToast('No conversations to export.', 'warning');
      return;
    }
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const objectURL = URL.createObjectURL(blob);
    const filename = `gemini-history-export-${dayjs().format('YYYY-MM-DD')}.json`;
    
    const downloadLink = document.createElement('a');
    downloadLink.href = objectURL;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(objectURL);
    
    showToast(`Successfully exported ${exportTypeMessage} (${dataToExport.length} items).`, 'success');
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
    let importedData;
    
    try {
      importedData = JSON.parse(fileContent);
    } catch (e) {
      throw new Error('Invalid JSON format in the imported file');
    }
    
    if (!Array.isArray(importedData)) {
      throw new Error('Imported data is not in the correct format (expected an array)');
    }
    
    // Filter out entries that already exist in history (by URL)
    const existingUrls = new Set(allHistory.value.map(item => item.url));
    const newItems = importedData.filter(item => item.url && !existingUrls.has(item.url));
    
    // Merge new items with existing history
    if (newItems.length > 0) {
      allHistory.value = [...allHistory.value, ...newItems];
      
      // Sort the history
      allHistory.value.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
      
      // Save merged data
      await saveData();
      updateDashboardStats();
      
      if (activeMainTab.value === 'visualizations') {
        renderCurrentVisualization();
      }
    }
    
    if (newItems.length === 0) {
      showToast('No new conversations were found in the imported file.', 'info');
    } else {
      showToast(`Import complete: Added ${newItems.length} new conversation(s).`, 'success');
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
  const historyForStats = allHistory.value;
  stats.value.totalConversations = historyForStats.length;

  if (historyForStats.length === 0) {
    stats.value.mostUsedModel = '-';
    stats.value.mostUsedModelCount = '';
    stats.value.avgTitleLength = '-';
    stats.value.firstConversationTime = '-';
    stats.value.lastConversationTime = '-';
    stats.value.totalFilesUploaded = 0;
    return;
  }

  const modelCounts = historyForStats.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  const mostUsed = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];
  stats.value.mostUsedModel = mostUsed ? mostUsed[0] : '-';
  stats.value.mostUsedModelCount = mostUsed ? `(${mostUsed[1]} chats)` : '';

  const totalTitleLength = historyForStats.reduce((acc, entry) => acc + (entry.title ? entry.title.length : 0), 0);
  stats.value.avgTitleLength = Math.round(historyForStats.length > 0 ? totalTitleLength / historyForStats.length : 0);

  const sortedByDate = [...historyForStats].sort((a, b) => {
    return parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf();
  });
  
  if (sortedByDate.length > 0) {
    stats.value.firstConversationTime = parseTimestamp(sortedByDate[0].timestamp).fromNow();
    stats.value.lastConversationTime = parseTimestamp(sortedByDate[sortedByDate.length - 1].timestamp).fromNow();
  } else {
    stats.value.firstConversationTime = '-';
    stats.value.lastConversationTime = '-';
  }
  
  stats.value.totalFilesUploaded = historyForStats.reduce((acc, entry) => acc + (entry.attachedFiles ? entry.attachedFiles.length : 0), 0);
}

// --- Visualizations (Chart.js) ---
function renderCurrentVisualization() {
  if (!visualizations.value || !visualizations.value.vizChartCanvas || allHistory.value.length === 0) {
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const chartCtx = visualizations.value.vizChartCanvas.getContext('2d');
  let chartConfig;

  if (activeVizTab.value === 'modelDistribution') {
    chartConfig = getModelDistributionChartConfig();
  } else if (activeVizTab.value === 'activityOverTime') {
    chartConfig = getActivityOverTimeChartConfig();
  }

  if (chartConfig) {
    chartInstance = new Chart(chartCtx, chartConfig);
  }
}

function getChartJsThemeOptions() {
    const isDark = currentTheme.value === 'dark';
    const textColor = isDark ? '#e0e0e0' : '#333';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    return { textColor, gridColor };
}

function getModelDistributionChartConfig() {
  const modelCounts = allHistory.value.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  const labels = Object.keys(modelCounts);
  const data = Object.values(modelCounts);
  const { textColor, gridColor } = getChartJsThemeOptions();

  return {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS.slice(0, data.length),
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1,
        hoverOffset: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value * 100) / total);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  };
}

function getActivityOverTimeChartConfig() {
  const { textColor, gridColor } = getChartJsThemeOptions();
  const displayMode = activityChartOptions.value.displayMode;
  const selectedModelForChart = activityChartOptions.value.selectedModel;

  // Calculate date ranges
  const dateGroups = {};
  const modelDateGroups = {};
  availableModels.value.forEach(model => modelDateGroups[model] = {});

  allHistory.value.forEach(entry => {
    const timestamp = parseTimestamp(entry.timestamp);
    if (!timestamp.isValid()) return;
    
    const dateKey = timestamp.format('YYYY-MM-DD');
    const model = entry.model || 'Unknown';
    
    // For combined chart
    dateGroups[dateKey] = (dateGroups[dateKey] || 0) + 1;
    
    // For separate by model chart
    if (!modelDateGroups[model]) modelDateGroups[model] = {};
    modelDateGroups[model][dateKey] = (modelDateGroups[model][dateKey] || 0) + 1;
  });

  // Sort dates and fill in missing dates
  const sortedDates = Object.keys(dateGroups).sort((a,b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  const filledDateGroups = {};
  
  if (sortedDates.length > 0) {
    // Fill in any missing dates in the range
    const startDate = dayjs(sortedDates[0]);
    const endDate = dayjs(sortedDates[sortedDates.length - 1]);
    
    let currentDate = startDate;
    while (currentDate.isSameOrBefore(endDate)) {
      const dateKey = currentDate.format('YYYY-MM-DD');
      
      // For combined chart
      filledDateGroups[dateKey] = dateGroups[dateKey] || 0;
      
      // For separate by model chart
      availableModels.value.forEach(model => {
        if (!modelDateGroups[model]) modelDateGroups[model] = {};
        modelDateGroups[model][dateKey] = modelDateGroups[model][dateKey] || 0;
      });
      
      currentDate = currentDate.add(1, 'day');
    }
  }
  
  const finalSortedDates = Object.keys(filledDateGroups).sort((a,b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  const displayDates = finalSortedDates.map(date => dayjs(date).format('MMM D, YY'));
  
  let datasets = [];

  if (displayMode === 'combined' || !finalSortedDates.length) {
    // Combined mode shows all models together
    datasets = [{
      label: 'All Conversations',
      data: finalSortedDates.map(date => filledDateGroups[date]),
      borderColor: CHART_COLORS[0],
      backgroundColor: CHART_COLORS[0].replace('0.8', '0.2'),
      fill: true,
      tension: 0.2,
      pointRadius: 3
    }];
  } else { // 'separate'
    // Filter by selected model if needed
    if (selectedModelForChart === 'all') {
      // Show all models separately
      datasets = availableModels.value.map((model, index) => ({
        label: model,
        data: finalSortedDates.map(date => modelDateGroups[model][date] || 0),
        borderColor: CHART_COLORS[index % CHART_COLORS.length],
        backgroundColor: CHART_COLORS[index % CHART_COLORS.length].replace('0.8', '0.2'),
        fill: false, // multiple datasets look better without fill
        tension: 0.2,
        pointRadius: 3
      }));
    } else {
      // Show only selected model
      datasets = [{
        label: selectedModelForChart,
        data: finalSortedDates.map(date => (modelDateGroups[selectedModelForChart] && modelDateGroups[selectedModelForChart][date]) || 0),
        borderColor: CHART_COLORS[0],
        backgroundColor: CHART_COLORS[0].replace('0.8', '0.2'),
        fill: true,
        tension: 0.2,
        pointRadius: 3
      }];
    }
  }

  // Chart configuration
  return {
    type: 'line',
    data: {
      labels: displayDates,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            precision: 0
          },
          title: {
            display: true,
            text: 'Conversations',
            color: textColor
          }
        },
        x: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      }
    }
  };
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

watch(allHistory, () => {
  updateDashboardStats();
  if (activeMainTab.value === 'visualizations' && allHistory.value.length > 0) {
    renderCurrentVisualization();
  } else if (allHistory.value.length === 0 && chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}, { deep: true });

// --- Toast Notifications ---
function showToast(message, type = 'info', duration = 5000) {
  const id = toastIdCounter++;
  const newToast = {
    id,
    message,
    type,
    duration
  };
  activeToasts.value.push(newToast);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration + 300); // Add extra time for animation
  }
}

function removeToast(id) {
  activeToasts.value = activeToasts.value.filter(toast => toast.id !== id);
}

// --- Guided Import (from original dashboard.js) ---
function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('action') && urlParams.get('action') === 'import') {
    // Give time for the UI to render, then guide the user to import
    setTimeout(() => {
      createImportGuidedExperience();
    }, 500);
  }
}

function createImportGuidedExperience() {
  const importBtn = document.getElementById('importHistory');
  if (!importBtn) return;
  
  importBtn.classList.add('highlight-pulse');
  importBtn.focus();
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
