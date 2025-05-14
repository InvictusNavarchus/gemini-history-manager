<template>
  <div class="dashboard-container">
    <header>
      <div class="header-content">
        <div class="header-left">
          <h1>Gemini History Manager</h1>
          <div class="search-container">
            <div class="search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="10" cy="10" r="7"></circle>
                <line x1="21" y1="21" x2="15" y2="15"></line>
              </svg>
            </div>
            <input type="text" id="searchFilter" placeholder="Search titles and prompts..." v-model="searchFilterQuery" @input="handleFilterChange">
          </div>
        </div>
        <div class="controls">
          <button id="themeToggle" class="theme-toggle" aria-label="Toggle dark mode" @click="handleThemeToggle">
            <svg ref="themeIconSvg" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button id="exportHistory" class="button" @click="handleExportHistoryData">Export History</button>
          <button id="importHistory" class="button" @click="triggerImportFile">Import History</button>
          <button id="clearHistory" class="button danger-button" @click="confirmClearAllHistory">Clear All History</button>
        </div>
      </div>
    </header>

    <main>
      <div class="page-tabs-container">
        <button
          id="mainHistoryTab"
          class="page-tab"
          :class="{ active: activeMainTab === 'history' }"
          @click="setActiveMainTab('history')"
        >History</button>
        <button
          id="mainVisualizationTab"
          class="page-tab"
          :class="{ active: activeMainTab === 'visualizations' }"
          @click="setActiveMainTab('visualizations')"
        >Visualizations</button>
      </div>

      <div class="page-tab-content-area">
        <div id="historyContent" class="page-tab-content" :class="{ active: activeMainTab === 'history' }">
          <div v-if="isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading your conversation history...</p>
          </div>
          <div v-else class="history-view-layout">
            <div class="sidebar">
              <div class="filters-section">
                <h2>Filters</h2>
                <div class="filter-group">
                  <label for="modelFilter">Model</label>
                  <select id="modelFilter" v-model="selectedModelFilter" @change="handleFilterChange">
                    <option value="">All Models</option>
                    <option v-for="model in availableModels" :key="model" :value="model">{{ model }}</option>
                  </select>
                </div>
                <div class="filter-group">
                  <label for="dateFilter">Date Range</label>
                  <select id="dateFilter" v-model="selectedDateFilter" @change="handleDateFilterTypeChange">
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                <div id="customDateRange" class="filter-group date-range" v-show="selectedDateFilter === 'custom'">
                  <div>
                    <label for="startDate">From</label>
                    <input type="date" id="startDate" v-model="customStartDate" @change="handleFilterChange">
                  </div>
                  <div>
                    <label for="endDate">To</label>
                    <input type="date" id="endDate" v-model="customEndDate" @change="handleFilterChange">
                  </div>
                </div>
              </div>
            </div>
            <div class="content">
              <div class="conversation-header">
                <h2>Conversations <span id="conversationCount">({{ filteredHistory.length }})</span></h2>
                <div class="sorting">
                  <label for="sortBy">Sort by:</label>
                  <select id="sortBy" v-model="currentSortBy" @change="handleSortChange">
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="model">Model</option>
                  </select>
                </div>
              </div>
              <div id="conversationList" class="conversation-list">
                <div v-if="!isLoading && filteredHistory.length === 0" class="empty-state">
                    <div class="empty-icon">{{ allHistory.length === 0 ? '📋' : '🤷' }}</div>
                    <h3>{{ allHistory.length === 0 ? 'No Conversations Found' : 'No Conversations Match Filters' }}</h3>
                    <p>{{ allHistory.length === 0 ? 'Your conversation history will appear here once you chat with Gemini.' : 'Try adjusting your search or filter criteria.' }}</p>
                    <button v-if="allHistory.length === 0" @click="startGeminiChat" class="button primary-button">Start a Gemini Chat</button>
                    <button v-else @click="resetAllFilters" class="button">Clear Filters</button>
                </div>
                <div v-else>
                  <div v-for="entry in filteredHistory" :key="entry.url" class="conversation-item" @click="showConversationDetailsModal(entry)">
                    <div class="conversation-title">{{ entry.title || 'Untitled Conversation' }}</div>
                    <div class="conversation-meta">
                      <div class="meta-left">
                        <span>{{ dayjsFormatDate(entry.timestamp) }}</span>
                        <span class="conversation-model">{{ entry.model || 'Unknown' }}</span>
                      </div>
                      <div class="meta-right">
                        <span v-if="entry.accountName && entry.accountName !== 'Unknown'" class="conversation-account">
                          {{ entry.accountEmail || entry.accountName }}
                        </span>
                        <span v-if="entry.attachedFiles && entry.attachedFiles.length > 0" class="conversation-files">
                          {{ entry.attachedFiles.length }} file{{ entry.attachedFiles.length !== 1 ? 's' : '' }}
                        </span>
                      </div>
                    </div>
                    <div v-if="entry.prompt" class="conversation-prompt">{{ entry.prompt }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="visualizationContent" class="page-tab-content" :class="{ active: activeMainTab === 'visualizations' }">
           <div v-if="isLoading" class="loading-state"> <div class="spinner"></div>
            <p>Loading visualizations...</p>
          </div>
          <div v-else-if="allHistory.length === 0" class="empty-state">
             <div class="empty-icon">📊</div>
             <h3>No Data for Visualizations</h3>
             <p>Chat with Gemini to see your activity visualized here.</p>
          </div>
          <div v-else class="visualization-view-layout">
            <div class="stats-section">
              <h2>Statistics</h2>
              <div class="stats-grid">
                <div class="stat-card">
                  <h3>Total Conversations</h3>
                  <div class="stat-value">{{ stats.totalConversations }}</div>
                </div>
                <div class="stat-card">
                  <h3>Most Used Model</h3>
                  <div class="stat-value">{{ stats.mostUsedModel }}</div>
                  <div class="stat-subtext">{{ stats.mostUsedModelCount }}</div>
                </div>
                <div class="stat-card">
                  <h3>Average Title Length</h3>
                  <div class="stat-value">{{ stats.avgTitleLength }}</div>
                  <div class="stat-subtext">characters</div>
                </div>
                <div class="stat-card">
                  <h3>First Conversation</h3>
                  <div class="stat-value">{{ stats.firstConversationTime }}</div>
                </div>
                 <div class="stat-card">
                  <h3>Files Uploaded</h3>
                  <div class="stat-value">{{ stats.totalFilesUploaded }}</div>
                </div>
                <div class="stat-card">
                  <h3>Last Conversation</h3>
                  <div class="stat-value">{{ stats.lastConversationTime }}</div>
                </div>
              </div>
            </div>
            <div class="visualization-section">
              <h2>Visualizations</h2>
              <div class="viz-tabs">
                <button
                  class="viz-tab"
                  :class="{ active: activeVizTab === 'modelDistribution' }"
                  @click="setActiveVizTab('modelDistribution')"
                >Model Distribution</button>
                <button
                  class="viz-tab"
                  :class="{ active: activeVizTab === 'activityOverTime' }"
                  @click="setActiveVizTab('activityOverTime')"
                >Activity Over Time</button>
              </div>
              <div class="viz-container">
                <canvas ref="vizChartCanvas"></canvas>
              </div>
              <div id="vizOptions" v-show="activeVizTab === 'activityOverTime'" style="margin-top: 15px; min-height: 84px;">
                <div id="activityVizOptions" class="viz-options-panel">
                  <div class="viz-option-group">
                    <label>Display Mode:</label>
                    <div class="viz-radio-buttons">
                      <label class="viz-radio-label">
                        <input type="radio" name="activityDisplayMode" value="combined" v-model="activityChartOptions.displayMode" @change="updateActivityChart"> Combined
                      </label>
                      <label class="viz-radio-label">
                        <input type="radio" name="activityDisplayMode" value="separate" v-model="activityChartOptions.displayMode" @change="updateActivityChart"> By Model
                      </label>
                    </div>
                  </div>
                  <div id="activityModelSelect" class="viz-option-group" v-show="activityChartOptions.displayMode === 'separate'">
                    <label for="activityModelFilter">Model:</label>
                    <select id="activityModelFilter" v-model="activityChartOptions.selectedModel" @change="updateActivityChart">
                      <option value="all">All Models</option>
                      <option v-for="model in availableModels" :key="model" :value="model">{{ model }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div id="conversationModal" class="modal" :class="{ active: modals.conversationDetail.show }">
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modalTitle">{{ modals.conversationDetail.data.title || 'Conversation Details' }}</h2>
          <button id="closeModal" class="close-button" @click="closeConversationDetailsModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-group">
            <h3>Title</h3>
            <p id="detailTitle">{{ modals.conversationDetail.data.title || 'Untitled Conversation' }}</p>
          </div>
          <div class="detail-group">
            <h3>Date</h3>
            <p id="detailDate">{{ modals.conversationDetail.data.timestamp ? parseTimestamp(modals.conversationDetail.data.timestamp).format('llll') : '-' }}</p>
          </div>
          <div class="detail-group">
            <h3>Model</h3>
            <p id="detailModel">{{ modals.conversationDetail.data.model || 'Unknown' }}</p>
          </div>
          <div class="detail-group">
            <h3>Account</h3>
            <p id="detailAccount"> {{ modals.conversationDetail.data.accountName && modals.conversationDetail.data.accountEmail ? `${modals.conversationDetail.data.accountName} (${modals.conversationDetail.data.accountEmail})` : modals.conversationDetail.data.accountName || modals.conversationDetail.data.accountEmail || 'Unknown' }}</p>
          </div>
          <div class="detail-group">
            <h3>Prompt</h3>
            <p id="detailPrompt">{{ modals.conversationDetail.data.prompt || 'No prompt data available' }}</p>
          </div>
          <div class="detail-group" v-if="modals.conversationDetail.data.attachedFiles && modals.conversationDetail.data.attachedFiles.length > 0">
            <h3>Attached Files</h3>
            <ul id="detailFiles">
              <li v-for="file in modals.conversationDetail.data.attachedFiles" :key="file">{{ file }}</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <a :href="modals.conversationDetail.data.url" class="button primary-button" target="_blank" rel="noopener noreferrer">Open in Gemini</a>
          <button class="button danger-button" @click="confirmDeleteConversation(modals.conversationDetail.data)">Delete from History</button>
        </div>
      </div>
    </div>

    <div id="confirmationModal" class="modal" :class="{ active: modals.confirmation.show }">
      <div class="modal-content confirmation-modal">
        <div class="modal-header">
          <h2 id="confirmationTitle">{{ modals.confirmation.title }}</h2>
          <button id="closeConfirmation" class="close-button" @click="closeConfirmationModal">&times;</button>
        </div>
        <div class="modal-body">
          <p id="confirmationMessage">{{ modals.confirmation.message }}</p>
        </div>
        <div class="modal-footer">
          <button id="cancelAction" class="button" @click="closeConfirmationModal">Cancel</button>
          <button id="confirmAction" class="button danger-button" @click="executeConfirmedAction">Confirm</button>
        </div>
      </div>
    </div>

    <input type="file" ref="importFileInputRef" accept=".json" style="display: none;" @change="handleFileSelectedForImport">

    <div class="toast-container">
      <div v-for="toast in activeToasts" :key="toast.id" :class="['toast', toast.type, { hide: toast.hiding }]" >
        <div class="toast-icon" v-html="toast.iconHtml"></div>
        <div class="toast-content">{{ toast.message }}</div>
        <button class="toast-close" @click="removeToast(toast.id)">&times;</button>
        <div v-if="toast.duration > 0" class="toast-progress">
          <div class="toast-progress-bar" :style="{ animationDuration: `${toast.duration / 1000}s` }"></div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import dayjs from 'dayjs';
import {
  initDayjsPlugins,
  Logger,
  parseTimestamp,
  dayjsFormatDate, // Use this for list display
  readFile,
  initTheme,
  applyTheme,
  toggleTheme
} from '../lib/utils.js';

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
const TOAST_ICONS = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
};


// --- Reactive State ---
const isLoading = ref(true);
const allHistory = ref([]);
const searchFilterQuery = ref('');
const selectedModelFilter = ref('');
const selectedDateFilter = ref('all');
const customStartDate = ref(dayjs().subtract(30, 'days').format('YYYY-MM-DD'));
const customEndDate = ref(dayjs().format('YYYY-MM-DD'));
const currentSortBy = ref('date-desc');
const activeMainTab = ref('history'); // 'history' or 'visualizations'
const activeVizTab = ref('modelDistribution'); // 'modelDistribution' or 'activityOverTime'
const currentTheme = ref('light');
const themeIconSvg = ref(null); // Ref for the theme toggle SVG
const vizChartCanvas = ref(null); // Ref for the chart canvas
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
  displayMode: 'combined', // 'combined' or 'separate'
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
    const query = searchFilterQuery.value.toLowerCase();
    items = items.filter(item =>
      (item.title || '').toLowerCase().includes(query) ||
      (item.prompt || '').toLowerCase().includes(query)
    );
  }

  // Apply model filter
  if (selectedModelFilter.value) {
    items = items.filter(item => (item.model || 'Unknown') === selectedModelFilter.value);
  }

  // Apply date filter
  const now = dayjs();
  if (selectedDateFilter.value !== 'all') {
    items = items.filter(item => {
      const itemDate = parseTimestamp(item.timestamp);
      if (!itemDate.isValid()) return false;

      if (selectedDateFilter.value === 'today') return itemDate.isSame(now, 'day');
      if (selectedDateFilter.value === 'week') return itemDate.isSame(now, 'week');
      if (selectedDateFilter.value === 'month') return itemDate.isSame(now, 'month');
      if (selectedDateFilter.value === 'custom') {
        let pass = true;
        if (customStartDate.value) {
          const start = dayjs(customStartDate.value).startOf('day');
          if (itemDate.isBefore(start)) pass = false;
        }
        if (customEndDate.value && pass) {
          const end = dayjs(customEndDate.value).endOf('day');
          if (itemDate.isAfter(end)) pass = false;
        }
        return pass;
      }
      return true;
    });
  }

  // Apply sorting
  switch (currentSortBy.value) {
    case 'date-desc':
      items.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
      break;
    case 'date-asc':
      items.sort((a, b) => parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf());
      break;
    case 'title':
      items.sort((a, b) => (a.title || 'Untitled').localeCompare(b.title || 'Untitled'));
      break;
    case 'model':
      items.sort((a, b) => (a.model || 'Unknown').localeCompare(b.model || 'Unknown'));
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
    initTheme((themeValue) => {
      currentTheme.value = themeValue;
      applyTheme(currentTheme.value, themeIconSvg.value);
       // If charts are already rendered, re-render them if theme changes affect colors
      if (chartInstance) {
        renderCurrentVisualization();
      }
    });

    const data = await browser.storage.local.get(STORAGE_KEY);
    allHistory.value = data[STORAGE_KEY] || [];
    
    updateDashboardStats(); // Calculate and update stats
    // Initial rendering of visualization will happen when tab is switched or if it's default
    // For now, let's ensure it renders if the viz tab is active by default (it's not)
    // Or, we can call it if allHistory has data.
    if (allHistory.value.length > 0 && activeMainTab.value === 'visualizations') {
        await nextTick(); // Ensure canvas is ready
        renderCurrentVisualization();
    }


  } catch (error) {
    Logger.error("Error initializing dashboard:", error);
    showToast(`Error: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
}

// --- Theme ---
function handleThemeToggle() {
  currentTheme.value = toggleTheme(currentTheme.value, themeIconSvg.value);
  if (chartInstance) { // Re-render chart with new theme colors
    renderCurrentVisualization();
  }
}

// --- Tabs ---
function setActiveMainTab(tabName) {
  activeMainTab.value = tabName;
  if (tabName === 'visualizations' && allHistory.value.length > 0) {
    nextTick().then(() => { // Ensure canvas is in DOM and visible
        renderCurrentVisualization();
    });
  }
}

function setActiveVizTab(tabName) {
  activeVizTab.value = tabName;
   if (allHistory.value.length > 0) {
    renderCurrentVisualization();
  }
}

// --- Filters and Sorting ---
function handleFilterChange() {
  // Computed property `filteredHistory` will update automatically.
  // No explicit call needed here if all dependencies are reactive.
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
    browser.runtime.sendMessage({ action: 'updateHistoryCount', count: allHistory.value.length });
    updateDashboardStats(); // Recalculate stats after data change
    if (activeMainTab.value === 'visualizations' && allHistory.value.length > 0) {
        renderCurrentVisualization(); // Re-render chart if data changed
    }
  } catch (error) {
    Logger.error("Error saving history:", error);
    showToast('Failed to save history updates.', 'error');
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
    `Are you sure you want to delete "${conversation.title || 'Untitled Conversation'}"? This cannot be undone.`,
    async () => {
      allHistory.value = allHistory.value.filter(item => item.url !== conversation.url);
      await saveData();
      closeConversationDetailsModal(); // Close detail modal if open
      showToast('Conversation deleted successfully.', 'success');
    }
  );
}

function confirmClearAllHistory() {
  showConfirmationModal(
    'Clear All History',
    'Are you sure you want to delete all conversation history? This action cannot be undone.',
    async () => {
      allHistory.value = [];
      await saveData();
      showToast('All history has been cleared.', 'success');
    }
  );
}

// --- Import/Export ---
function handleExportHistoryData() {
  try {
    if (allHistory.value.length === 0) {
      showToast('No history data to export.', 'warning');
      return;
    }
    // Determine if filters are active
    const filtersAreActive = searchFilterQuery.value || selectedModelFilter.value || selectedDateFilter.value !== 'all';
    const dataToExport = filtersAreActive ? filteredHistory.value : allHistory.value;
    const exportTypeMessage = filtersAreActive ? 'filtered history' : 'all history';

    if (dataToExport.length === 0 && filtersAreActive) {
      showToast('Current filters result in no data to export.', 'warning');
      return;
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `gemini-history-export-${dayjs().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    showToast(`Successfully exported ${exportTypeMessage} (${dataToExport.length} items).`, 'success');
  } catch (error) {
    Logger.error('Error exporting history:', error);
    showToast('Failed to export history data.', 'error');
  }
}

function triggerImportFile() {
  // Clear URL parameters if they exist from guided import
  if (window.location.search.includes('action=import')) {
    const currentPath = window.location.pathname;
    window.history.replaceState({}, document.title, currentPath);
    const guideArrow = document.querySelector('.guide-arrow-container'); // From original JS
    if (guideArrow) guideArrow.remove();
  }
  importFileInputRef.value?.click();
}

async function handleFileSelectedForImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await readFile(file);
    const importedData = JSON.parse(text);

    if (!Array.isArray(importedData)) {
      throw new Error('Invalid data format: Expected an array.');
    }
    if (importedData.length > 0 && (!importedData[0].url || !importedData[0].timestamp)) {
      throw new Error('Invalid item format: Conversations must have url and timestamp.');
    }

    const existingUrls = new Set(allHistory.value.map(item => item.url));
    const newItems = importedData.filter(item => item.url && !existingUrls.has(item.url));

    if (newItems.length === 0) {
      showToast('No new conversations found in import file, or data format is incorrect.', 'warning');
      return;
    }

    allHistory.value = [...allHistory.value, ...newItems];
    // No need to sort here, computed `filteredHistory` will handle sorting based on `currentSortBy`
    await saveData();
    showToast(`Import complete: Added ${newItems.length} new conversation(s).`, 'success');
  } catch (error) {
    Logger.error('Import error:', error);
    showToast(`Import error: ${error.message}`, 'error');
  } finally {
    if (importFileInputRef.value) importFileInputRef.value.value = ''; // Reset file input
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

  const sortedByDate = [...historyForStats].sort((a, b) =>
    parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf()
  );
  if (sortedByDate.length > 0) {
    stats.value.firstConversationTime = dayjsFormatDate(sortedByDate[0].timestamp, true); // includeYear = true
    stats.value.lastConversationTime = parseTimestamp(sortedByDate[sortedByDate.length - 1].timestamp).fromNow();
  } else {
    stats.value.firstConversationTime = '-';
    stats.value.lastConversationTime = '-';
  }
  stats.value.totalFilesUploaded = historyForStats.reduce((acc, entry) => acc + (entry.attachedFiles ? entry.attachedFiles.length : 0), 0);
}

// --- Visualizations (Chart.js) ---
function renderCurrentVisualization() {
  if (!vizChartCanvas.value || allHistory.value.length === 0) {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    // Optionally clear canvas or show a message if canvas exists but no data
    if (vizChartCanvas.value) {
        const ctx = vizChartCanvas.value.getContext('2d');
        ctx.clearRect(0, 0, vizChartCanvas.value.width, vizChartCanvas.value.height);
        // You could draw "No data" here if needed
    }
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  const chartCtx = vizChartCanvas.value.getContext('2d');
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
  const { textColor } = getChartJsThemeOptions();

  return {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Model Usage',
        data: data,
        backgroundColor: CHART_COLORS,
        borderColor: CHART_COLORS.map(color => color.replace('0.8', '1')),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: getChartJsThemeOptions().gridColor } },
        y: { ticks: { color: textColor }, grid: { display: false } }
      },
      plugins: { legend: { display: false, labels: { color: textColor } } }
    }
  };
}

function getActivityOverTimeChartConfig() {
  const { textColor } = getChartJsThemeOptions();
  const displayMode = activityChartOptions.value.displayMode;
  const selectedModelForChart = activityChartOptions.value.selectedModel;

  const dateGroups = {};
  const modelDateGroups = {};
  availableModels.value.forEach(model => modelDateGroups[model] = {});

  allHistory.value.forEach(entry => {
    const dateStr = parseTimestamp(entry.timestamp).format('YYYY-MM-DD');
    const model = entry.model || 'Unknown';
    dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
    if (modelDateGroups[model]) { // Ensure model key exists
        modelDateGroups[model][dateStr] = (modelDateGroups[model][dateStr] || 0) + 1;
    }
  });

  const sortedDates = Object.keys(dateGroups).sort((a,b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  const filledDateGroups = {};
  if (sortedDates.length > 0) {
    let currentDate = dayjs(sortedDates[0]);
    const lastDate = dayjs(sortedDates[sortedDates.length - 1]);
    while(currentDate.isBefore(lastDate) || currentDate.isSame(lastDate, 'day')) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      filledDateGroups[dateStr] = dateGroups[dateStr] || 0;
      availableModels.value.forEach(model => {
        if (modelDateGroups[model]) { // Ensure model key exists
            modelDateGroups[model][dateStr] = modelDateGroups[model][dateStr] || 0;
        }
      });
      currentDate = currentDate.add(1, 'day');
    }
  }
  const finalSortedDates = Object.keys(filledDateGroups).sort((a,b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  const displayDates = finalSortedDates.map(date => dayjs(date).format('MMM D, YY'));
  let datasets = [];

  if (displayMode === 'combined' || !finalSortedDates.length) {
    datasets = [{
      label: 'All Conversations',
      data: finalSortedDates.map(date => filledDateGroups[date]),
      backgroundColor: CHART_COLORS[0].replace('0.8', '0.2'),
      borderColor: CHART_COLORS[0],
      borderWidth: 2, tension: 0.2, fill: true, pointRadius: 3,
      pointBackgroundColor: currentTheme.value === 'dark' ? CHART_COLORS[0] : 'white',
      pointBorderColor: CHART_COLORS[0]
    }];
  } else { // 'separate'
    const modelsToDisplay = selectedModelForChart === 'all' ? availableModels.value : [selectedModelForChart];
    modelsToDisplay.forEach((model, index) => {
      if (!modelDateGroups[model]) return; // Skip if model has no data
      const colorIndex = availableModels.value.indexOf(model) % CHART_COLORS.length;
      const color = CHART_COLORS[colorIndex] || CHART_COLORS[0];
      datasets.push({
        label: model,
        data: finalSortedDates.map(date => modelDateGroups[model][date] || 0),
        backgroundColor: color.replace('0.8', '0.2'),
        borderColor: color,
        borderWidth: 2, tension: 0.2, fill: true, pointRadius: 3,
        pointBackgroundColor: currentTheme.value === 'dark' ? color : 'white',
        pointBorderColor: color
      });
    });
  }

  return {
    type: 'line',
    data: { labels: displayDates, datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, stacked: displayMode === 'combined', ticks: { precision: 0, color: textColor }, grid: { color: getChartJsThemeOptions().gridColor } },
        x: { ticks: { color: textColor, maxRotation: 45, minRotation: 0 }, grid: { display: false } }
      },
      plugins: { legend: { display: displayMode === 'separate', position: 'top', labels: { color: textColor, font: { size: 11 } } } }
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
watch(allHistory, () => { // If allHistory changes (e.g. import/delete)
    updateDashboardStats();
    if (activeMainTab.value === 'visualizations' && allHistory.value.length > 0) {
        renderCurrentVisualization();
    } else if (allHistory.value.length === 0 && chartInstance) {
        chartInstance.destroy(); // Clear chart if no data
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
    duration,
    iconHtml: TOAST_ICONS[type] || TOAST_ICONS.info,
    hiding: false,
  };
  activeToasts.value.push(newToast);

  if (duration > 0) {
    setTimeout(() => {
      const toast = activeToasts.value.find(t => t.id === id);
      if (toast) {
        toast.hiding = true; // Start fade-out animation
        setTimeout(() => removeToast(id), 300); // Remove after animation
      }
    }, duration);
  }
}

function removeToast(id) {
  activeToasts.value = activeToasts.value.filter(toast => toast.id !== id);
}

// --- Guided Import (from original dashboard.js) ---
function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('action') && urlParams.get('action') === 'import') {
    Logger.log("Import action detected in URL parameters, creating guided import experience");
    createImportGuidedExperience();
  }
}

function createImportGuidedExperience() {
  const importBtn = document.getElementById('importHistory'); // Assuming this ID is still on the button
  if (!importBtn) {
    Logger.error("Import button not found for guided experience.");
    return;
  }
  // This part involves direct DOM manipulation for the arrow, which is less ideal in Vue.
  // A Vue-idiomatic way would be to have a reactive flag that shows/hides a Vue-managed arrow component.
  // For direct migration, keeping the original logic:
  const btnRect = importBtn.getBoundingClientRect();
  const arrowContainer = document.createElement('div');
  arrowContainer.className = 'guide-arrow-container'; // Style this class if needed
  Object.assign(arrowContainer.style, {
    position: 'absolute',
    top: `${btnRect.bottom + 10}px`, // Adjusted spacing
    left: `${btnRect.left + (btnRect.width / 2) - 15}px`, // Centered arrow
    width: '30px', height: '30px',
    transform: 'rotate(225deg)', // Pointing upwards towards the button
    zIndex: '9999',
    pointerEvents: 'none' // Prevent interaction
  });
  const arrow = document.createElement('div');
  Object.assign(arrow.style, {
    width: '100%', height: '100%',
    borderRight: `6px solid ${currentTheme.value === 'dark' ? '#8b68f0' : '#6e41e2'}`, // Theme-aware color
    borderBottom: `6px solid ${currentTheme.value === 'dark' ? '#8b68f0' : '#6e41e2'}`,
    animation: 'pulse-arrow 1.5s infinite'
  });
  arrowContainer.appendChild(arrow);

  // Ensure keyframes are injected (or defined in global CSS)
  if (!document.getElementById('pulse-arrow-keyframes')) {
    const style = document.createElement('style');
    style.id = 'pulse-arrow-keyframes';
    style.textContent = `
      @keyframes pulse-arrow {
        0%, 100% { opacity: 0.5; transform: scale(0.9) translateY(5px); }
        50% { opacity: 1; transform: scale(1.1) translateY(0px); }
      }`;
    document.head.appendChild(style);
  }
  document.body.appendChild(arrowContainer);

  // Highlight button (can be done with a class toggle in Vue for better cleanup)
  importBtn.style.boxShadow = `0 0 12px 3px ${currentTheme.value === 'dark' ? 'rgba(139, 104, 240, 0.7)' : 'rgba(110, 65, 226, 0.5)'}`;

  const cleanupGuide = () => {
    arrowContainer.remove();
    importBtn.style.boxShadow = '';
    importBtn.removeEventListener('click', cleanupGuide);
    // Clear URL param
    const currentPath = window.location.pathname;
    window.history.replaceState({}, document.title, currentPath);
  };
  importBtn.addEventListener('click', cleanupGuide, { once: true }); // Auto-remove listener
}

</script>

<style scoped>
/* Styles from dashboard.css are global. Add component-specific overrides here if needed. */
.dashboard-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Ensure canvas container has a defined height for Chart.js */
.viz-container {
  position: relative; /* Needed for maintainAspectRatio: false */
  min-height: 300px; /* Or whatever initial height you prefer */
  flex-grow: 1;
  margin-top: 15px;
}

/* Ensure canvas itself resizes correctly within its container */
.viz-container canvas {
  display: block;
  width: 100% !important; /* Override Chart.js inline style if necessary */
  height: 100% !important; /* Override Chart.js inline style if necessary */
}

/* Loading and Empty States (already in dashboard.css but good to have scoped versions if needed) */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-light);
  flex-grow: 1; /* Make it fill available space in its container */
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 20px;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--primary-bg); /* Lighter border for spinner track */
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Toast container styles (from original dashboard.css, adapted for Vue) */
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
}

.toast {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--card-bg); /* Use CSS var for theme adaptability */
  border-radius: 6px;
  box-shadow: var(--toast-shadow); /* Use CSS var */
  color: white; /* Default, specific types will override background */
  font-size: 14px;
  line-height: 1.4;
  min-width: 250px;
  max-width: 350px;
  animation: slide-in 0.3s ease-out forwards;
  overflow: hidden;
  position: relative;
}

.toast.hide {
  animation: slide-out 0.3s ease-in forwards;
}

.toast-content {
  flex-grow: 1;
  margin: 0 10px;
}

.toast-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  transition: color 0.2s;
}
.toast-close:hover {
  color: white;
}

.toast-icon {
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}
.toast-icon svg { /* Ensure SVG within icon scales correctly */
    width: 20px;
    height: 20px;
    stroke: white; /* Default stroke, can be overridden by type */
}


.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.3);
}

.toast-progress-bar {
  height: 100%;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  transform-origin: left;
  animation: progress-animation linear forwards; /* animation-duration set inline */
}

.toast.success { background-color: var(--toast-success-bg); }
.toast.info { background-color: var(--toast-info-bg); }
.toast.warning { background-color: var(--toast-warning-bg); }
.toast.error { background-color: var(--toast-error-bg); }

@keyframes slide-in {
  from { transform: translateX(110%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slide-out {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(110%); opacity: 0; }
}
@keyframes progress-animation {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

</style>
