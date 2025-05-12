/**
 * Gemini History Manager - Full History View
 * Handles data visualization, filtering, and conversation management
 */

// Initialize Day.js plugins
initDayjsPlugins();

// DOM Elements
const elements = {
  // Stats elements
  totalConversations: document.getElementById('totalConversations'),
  mostUsedModel: document.getElementById('mostUsedModel'),
  mostUsedModelCount: document.getElementById('mostUsedModelCount'),
  avgTitleLength: document.getElementById('avgTitleLength'),
  firstConversationTime: document.getElementById('firstConversationTime'),
  lastConversationTime: document.getElementById('lastConversationTime'),
  totalFilesUploaded: document.getElementById('totalFilesUploaded'),
  
  // Filter elements
  modelFilter: document.getElementById('modelFilter'),
  dateFilter: document.getElementById('dateFilter'),
  customDateRange: document.getElementById('customDateRange'),
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  searchFilter: document.getElementById('searchFilter'),
  
  // Visualization elements
  vizTabs: document.querySelectorAll('.viz-tab'),
  vizChart: document.getElementById('vizChart'),
  
  // Conversation list elements
  conversationList: document.getElementById('conversationList'),
  conversationCount: document.getElementById('conversationCount'),
  sortBy: document.getElementById('sortBy'),
  emptyState: document.getElementById('emptyState'),
  loadingState: document.getElementById('loadingState'),
  
  // Modal elements
  conversationModal: document.getElementById('conversationModal'),
  modalTitle: document.getElementById('modalTitle'),
  detailTitle: document.getElementById('detailTitle'),
  detailDate: document.getElementById('detailDate'),
  detailModel: document.getElementById('detailModel'),
  detailAccount: document.getElementById('detailAccount'),
  detailPrompt: document.getElementById('detailPrompt'),
  detailFilesGroup: document.getElementById('detailFilesGroup'),
  detailFiles: document.getElementById('detailFiles'),
  closeModal: document.getElementById('closeModal'),
  openConversation: document.getElementById('openConversation'),
  deleteConversation: document.getElementById('deleteConversation'),
  
  // Confirmation modal elements
  confirmationModal: document.getElementById('confirmationModal'),
  confirmationTitle: document.getElementById('confirmationTitle'),
  confirmationMessage: document.getElementById('confirmationMessage'),
  closeConfirmation: document.getElementById('closeConfirmation'),
  cancelAction: document.getElementById('cancelAction'),
  confirmAction: document.getElementById('confirmAction'),
  
  // Button elements
  exportHistoryBtn: document.getElementById('exportHistory'),
  importHistoryBtn: document.getElementById('importHistory'),
  clearHistoryBtn: document.getElementById('clearHistory'),
  importFileInput: document.getElementById('importFileInput')
};

// Constants
const STORAGE_KEY = 'geminiChatHistory';
const CHART_COLORS = [
  'rgba(110, 65, 226, 0.8)', // Primary purple
  'rgba(71, 163, 255, 0.8)',  // Blue
  'rgba(0, 199, 176, 0.8)',   // Teal
  'rgba(255, 167, 38, 0.8)',  // Orange
  'rgba(239, 83, 80, 0.8)',   // Red
  'rgba(171, 71, 188, 0.8)'   // Pink
];

// State management
let allHistory = []; // All history items
let filteredHistory = []; // Filtered history items
let currentVisualization = 'modelDistribution';
let chart = null; // Chart.js instance
let confirmationCallback = null; // For handling confirmation modal actions

/**
 * Initialize the application
 */
async function init() {
  try {
    Logger.log("Initializing History Manager application...");
    // Load history data
    allHistory = await loadHistoryData();
    
    // Setup initial state
    updateFilteredHistory();
    
    // Populate UI
    populateModelFilter();
    setupDateFilters();
    
    // Update statistics
    updateStats(allHistory);
    
    // Create visualizations
    createVisualization(currentVisualization);
    
    // Update conversation list
    updateConversationList();
    
    // Hide loading state
    elements.loadingState.style.display = 'none';
    
    // Setup event listeners
    setupEventListeners();
    
    // Check URL parameters for automatic actions
    checkUrlParameters();
    
    Logger.log("History Manager initialization complete");
    
  } catch (error) {
    Logger.error("Error initializing application:", error);
    showError('Failed to load history data');
  }
}

/**
 * Check URL parameters for automatic actions
 */
function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('action')) {
    const action = urlParams.get('action');
    
    if (action === 'import') {
      Logger.log("Import action detected in URL parameters, creating guided import experience");
      
      // Create overlay for guided experience
      createImportGuidedExperience();
    }
  }
}

/**
 * Creates a guided experience to highlight the import button
 * with a simple pulsing arrow below the button
 */
function createImportGuidedExperience() {
  // First, find the import button and get its position
  const importBtn = elements.importHistoryBtn;
  if (!importBtn) {
    Logger.error("Import button not found, cannot create guided experience");
    return;
  }

  const btnRect = importBtn.getBoundingClientRect();
  
  // Create container for the arrow to handle rotation separately from animation
  const arrowContainer = document.createElement('div');
  arrowContainer.className = 'guide-arrow-container';
  arrowContainer.style.position = 'absolute';
  arrowContainer.style.top = `${btnRect.bottom + 20}px`;
  arrowContainer.style.left = `${btnRect.left + (btnRect.width / 2) - 20}px`;
  arrowContainer.style.width = '40px';
  arrowContainer.style.height = '40px';
  arrowContainer.style.transform = 'rotate(225deg)'; // Point upward
  arrowContainer.style.zIndex = '9999';
  
  // Add the pulsing arrow inside the container
  const arrow = document.createElement('div');
  arrow.className = 'guide-arrow';
  arrow.style.width = '100%';
  arrow.style.height = '100%';
  arrow.style.borderRight = '8px solid #6e41e2';
  arrow.style.borderBottom = '8px solid #6e41e2';
  arrow.style.animation = 'pulse 1.5s infinite';
  
  // Add arrow to container
  arrowContainer.appendChild(arrow);
  
  // Add keyframes for the animation - now only animating the scale, not rotation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% {
        opacity: 0.4;
        transform: scale(0.8);
      }
      50% {
        opacity: 1;
        transform: scale(1.2);
      }
      100% {
        opacity: 0.4;
        transform: scale(0.8);
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // Add element to DOM
  document.body.appendChild(arrowContainer);
  
  // Slightly highlight the import button
  importBtn.style.backgroundColor = '#6e41e2';
  importBtn.style.color = 'white';
  importBtn.style.boxShadow = '0 0 8px 2px rgba(110, 65, 226, 0.5)';
  
  // Create a listener that removes the guided experience when import button is clicked
  const cleanupGuide = () => {
    if (arrowContainer.parentNode) arrowContainer.parentNode.removeChild(arrowContainer);
    
    // Remove the added styles from import button
    importBtn.style.backgroundColor = '';
    importBtn.style.color = '';
    importBtn.style.boxShadow = '';
    
    // Remove this event listener
    importBtn.removeEventListener('click', cleanupGuide);
  };
  
  // Add click event to clean up when import button is clicked
  importBtn.addEventListener('click', cleanupGuide);
}

/**
 * Load history data from storage
 */
async function loadHistoryData() {
  Logger.log("Loading history data from storage...");
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const history = data[STORAGE_KEY] || [];
    
    if (history.length === 0) {
      Logger.log("No history items found in storage");
      elements.emptyState.style.display = 'flex';
    } else {
      Logger.log(`Loaded ${history.length} history items from storage`);
    }
    
    return history;
  } catch (error) {
    Logger.error("Error loading history data:", error);
    throw error;
  }
}

/**
 * Update filtered history based on current filters
 */
function updateFilteredHistory() {
  Logger.log("Applying filters to history data...");
  // Get filter values
  const modelValue = elements.modelFilter.value;
  const dateFilterValue = elements.dateFilter.value;
  const searchValue = elements.searchFilter.value.toLowerCase();
  const startDateValue = elements.startDate.value;
  const endDateValue = elements.endDate.value;
  
  // Log filter values
  Logger.log(`Filters: model="${modelValue}", date="${dateFilterValue}", search="${searchValue}"`);
  if (dateFilterValue === 'custom') {
    Logger.log(`Custom date range: ${startDateValue} to ${endDateValue}`);
  }
  
  const now = dayjs();
  
  // Apply filters
  filteredHistory = allHistory.filter(item => {
    // Model filter
    if (modelValue && item.model !== modelValue) {
      return false;
    }
    
    const itemDate = parseTimestamp(item.timestamp);
    
    // Date filter
    if (dateFilterValue !== 'all') {
      if (dateFilterValue === 'today') {
        // Today only (requires isToday plugin or check .isSame(now, 'day'))
        if (!itemDate.isSame(now, 'day')) {
          return false;
        }
      } else if (dateFilterValue === 'week') {
        // This week
        const weekStart = now.startOf('week');
        if (itemDate.isBefore(weekStart)) {
          return false;
        }
      } else if (dateFilterValue === 'month') {
        // This month
        const monthStart = now.startOf('month');
        if (itemDate.isBefore(monthStart)) {
          return false;
        }
      } else if (dateFilterValue === 'custom' && (startDateValue || endDateValue)) {
        // Custom date range
        if (startDateValue) {
          const startDate = dayjs(startDateValue).startOf('day');
          if (itemDate.isBefore(startDate)) {
            return false;
          }
        }
        
        if (endDateValue) {
          const endDate = dayjs(endDateValue).endOf('day');
          if (itemDate.isAfter(endDate)) {
            return false;
          }
        }
      }
    }
    
    // Search filter
    if (searchValue) {
      const title = (item.title || '').toLowerCase();
      const prompt = (item.prompt || '').toLowerCase();
      
      if (!title.includes(searchValue) && !prompt.includes(searchValue)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Apply sorting
  sortFilteredHistory();
  Logger.log(`Filtered history contains ${filteredHistory.length} items (from ${allHistory.length} total)`);
}

/**
 * Sort filtered history based on current sort option
 */
function sortFilteredHistory() {
  const sortOption = elements.sortBy.value;
  
  switch (sortOption) {
    case 'date-desc':
      filteredHistory.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
      break;
    case 'date-asc':
      filteredHistory.sort((a, b) => parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf());
      break;
    case 'title':
      filteredHistory.sort((a, b) => {
        const titleA = a.title || 'Untitled';
        const titleB = b.title || 'Untitled';
        return titleA.localeCompare(titleB);
      });
      break;
    case 'model':
      filteredHistory.sort((a, b) => {
        const modelA = a.model || 'Unknown';
        const modelB = b.model || 'Unknown';
        return modelA.localeCompare(modelB);
      });
      break;
  }
}

/**
 * Update conversation list display
 */
function updateConversationList() {
  // Update count display
  elements.conversationCount.textContent = `(${filteredHistory.length})`;
  
  // Clear current list
  elements.conversationList.innerHTML = '';
  
  // Show empty state if no conversations match the filter
  if (filteredHistory.length === 0) {
    const emptyFilterElement = document.createElement('div');
    emptyFilterElement.className = 'empty-state';
    emptyFilterElement.innerHTML = `
      <p>No conversations match your filters</p>
      <button id="clearFiltersBtn" class="button">Clear Filters</button>
    `;
    elements.conversationList.appendChild(emptyFilterElement);
    
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
      resetFilters();
    });
    return;
  }
  
  // Create and append conversation items
  filteredHistory.forEach(entry => {
    const conversationItem = createConversationItem(entry);
    elements.conversationList.appendChild(conversationItem);
  });
}

/**
 * Create a single conversation item element
 */
function createConversationItem(entry) {
  const item = document.createElement('div');
  item.className = 'conversation-item';
  item.dataset.id = entry.url; // Use URL as unique identifier
  
  const title = document.createElement('div');
  title.className = 'conversation-title';
  title.textContent = entry.title || 'Untitled Conversation';
  
  const meta = document.createElement('div');
  meta.className = 'conversation-meta';
  
  const metaLeft = document.createElement('div');
  metaLeft.className = 'meta-left';
  
  const date = document.createElement('span');
  date.className = 'conversation-date';
  date.textContent = dayjsFormatDate(entry.timestamp); // Use updated parser/formatter
  
  const model = document.createElement('span');
  model.className = 'conversation-model';
  model.textContent = entry.model || 'Unknown';
  
  metaLeft.appendChild(date);
  metaLeft.appendChild(model);
  
  const metaRight = document.createElement('div');
  metaRight.className = 'meta-right';
  
  // Display account info if available
  if (entry.accountName && entry.accountName !== 'Unknown') {
    const account = document.createElement('span');
    account.className = 'conversation-account';
    account.textContent = entry.accountEmail || entry.accountName;
    metaRight.appendChild(account);
  }
  
  // Display file count if available
  if (entry.attachedFiles && entry.attachedFiles.length > 0) {
    const fileCount = document.createElement('span');
    fileCount.className = 'conversation-files';
    fileCount.textContent = `${entry.attachedFiles.length} file${entry.attachedFiles.length !== 1 ? 's' : ''}`;
    metaRight.appendChild(fileCount);
  }
  
  meta.appendChild(metaLeft);
  meta.appendChild(metaRight);
  
  // Add prompt preview if available
  if (entry.prompt) {
    const prompt = document.createElement('div');
    prompt.className = 'conversation-prompt';
    prompt.textContent = entry.prompt;
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(prompt);
  } else {
    item.appendChild(title);
    item.appendChild(meta);
  }
  
  // Add click event to show details
  item.addEventListener('click', () => {
    showConversationDetails(entry);
  });
  
  return item;
}

/**
 * Show conversation details in modal
 */
function showConversationDetails(conversation) {
  // Set modal content
  elements.detailTitle.textContent = conversation.title || 'Untitled Conversation';
  // Use parseTimestamp to ensure correct timezone handling
  elements.detailDate.textContent = parseTimestamp(conversation.timestamp).format('llll'); // Requires localizedFormat plugin
  elements.detailModel.textContent = conversation.model || 'Unknown';
  
  // Account info
  if (conversation.accountName && conversation.accountEmail) {
    elements.detailAccount.textContent = `${conversation.accountName} (${conversation.accountEmail})`;
  } else {
    elements.detailAccount.textContent = conversation.accountName || conversation.accountEmail || 'Unknown';
  }
  
  // Prompt
  elements.detailPrompt.textContent = conversation.prompt || 'No prompt data available';
  
  // Files
  if (conversation.attachedFiles && conversation.attachedFiles.length > 0) {
    elements.detailFilesGroup.style.display = 'block';
    elements.detailFiles.innerHTML = '';
    
    conversation.attachedFiles.forEach(file => {
      const li = document.createElement('li');
      li.textContent = file;
      elements.detailFiles.appendChild(li);
    });
  } else {
    elements.detailFilesGroup.style.display = 'none';
  }
  
  // Set up open button
  elements.openConversation.onclick = () => {
    browser.tabs.create({ url: conversation.url });
  };
  
  // Set up delete button
  elements.deleteConversation.onclick = () => {
    showConfirmation(
      'Delete Conversation', 
      `Are you sure you want to delete "${conversation.title || 'Untitled Conversation'}"? This cannot be undone.`,
      () => deleteConversation(conversation.url)
    );
  };
  
  // Show modal
  elements.conversationModal.classList.add('active');
}

/**
 * Show confirmation modal
 */
function showConfirmation(title, message, callback) {
  elements.confirmationTitle.textContent = title;
  elements.confirmationMessage.textContent = message;
  confirmationCallback = callback;
  elements.confirmationModal.classList.add('active');
}

/**
 * Delete a conversation from history
 */
async function deleteConversation(url) {
  try {
    // Filter out the conversation with the matching URL
    allHistory = allHistory.filter(item => item.url !== url);
    
    // Save updated history
    await browser.storage.local.set({ [STORAGE_KEY]: allHistory });
    
    // Update badge
    browser.runtime.sendMessage({
      action: 'updateHistoryCount',
      count: allHistory.length
    });
    
    // Close modals
    closeModals();
    
    // Update UI
    updateFilteredHistory();
    updateStats(allHistory);
    updateConversationList();
    createVisualization(currentVisualization);
    
    // Show empty state if no history left
    if (allHistory.length === 0) {
      elements.emptyState.style.display = 'flex';
    }
    
  } catch (error) {
    console.error('Error deleting conversation:', error);
    alert('Failed to delete conversation');
  }
}

/**
 * Close all modals
 */
function closeModals() {
  elements.conversationModal.classList.remove('active');
  elements.confirmationModal.classList.remove('active');
}

/**
 * Update statistics display
 */
function updateStats(history) {
  // Update total conversations count
  elements.totalConversations.textContent = history.length;
  
  if (history.length === 0) {
    // Reset stats if no data
    elements.mostUsedModel.textContent = '-';
    elements.mostUsedModelCount.textContent = '';
    elements.avgTitleLength.textContent = '-';
    elements.firstConversationTime.textContent = '-';
    elements.lastConversationTime.textContent = '-';
    elements.totalFilesUploaded.textContent = '0';
    return;
  }
  
  // Find most used model
  const modelCounts = history.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  const mostUsed = Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])[0];
    
  elements.mostUsedModel.textContent = mostUsed ? mostUsed[0] : '-';
  elements.mostUsedModelCount.textContent = mostUsed ? `(${mostUsed[1]} chats)` : '';
  
  // Calculate average title length
  const totalTitleLength = history.reduce((acc, entry) => {
    return acc + (entry.title ? entry.title.length : 0);
  }, 0);
  
  const avgLength = totalTitleLength / history.length;
  elements.avgTitleLength.textContent = Math.round(avgLength);
  
  // Find first and last conversation timestamps
  const sortedByDate = [...history].sort((a, b) => 
    parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf()
  );
  
  const firstDate = parseTimestamp(sortedByDate[0].timestamp);
  const lastDate = parseTimestamp(sortedByDate[sortedByDate.length - 1].timestamp);
  
  elements.firstConversationTime.textContent = dayjsFormatDate(firstDate, true); // Use new dayjs formatter
  elements.lastConversationTime.textContent = lastDate.fromNow(); // Requires relativeTime plugin
  
  // Count total files uploaded
  const totalFiles = history.reduce((acc, entry) => {
    return acc + (entry.attachedFiles ? entry.attachedFiles.length : 0);
  }, 0);
  
  elements.totalFilesUploaded.textContent = totalFiles;
}

/**
 * Populate model filter dropdown with unique models from history
 */
function populateModelFilter() {
  // Get unique models
  const models = new Set();
  allHistory.forEach(item => {
    models.add(item.model || 'Unknown');
  });
  
  // Clear current options (except "All Models")
  const firstOption = elements.modelFilter.firstElementChild;
  elements.modelFilter.innerHTML = '';
  elements.modelFilter.appendChild(firstOption);
  
  // Add model options
  Array.from(models).sort().forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    elements.modelFilter.appendChild(option);
  });
}

/**
 * Set up date filter events and initialize date inputs
 */
function setupDateFilters() {
  // Set up custom date range visibility toggle
  elements.dateFilter.addEventListener('change', () => {
    elements.customDateRange.style.display = 
      elements.dateFilter.value === 'custom' ? 'grid' : 'none';
  });
  
  // Set default dates (last 30 days for start, today for end)
  const today = dayjs();
  const thirtyDaysAgo = today.subtract(30, 'days');
  
  elements.startDate.value = thirtyDaysAgo.format('YYYY-MM-DD');
  elements.endDate.value = today.format('YYYY-MM-DD');
}

/**
 * Reset all filters to default values
 */
function resetFilters() {
  elements.modelFilter.value = '';
  elements.dateFilter.value = 'all';
  elements.searchFilter.value = '';
  elements.customDateRange.style.display = 'none';
  elements.sortBy.value = 'date-desc';
  
  // Update UI
  updateFilteredHistory();
  updateConversationList();
}

/**
 * Create visualization based on the selected type
 */
function createVisualization(type) {
  // Destroy existing chart
  if (chart) {
    chart.destroy();
  }
  
  // If no data, don't create chart
  if (allHistory.length === 0) {
    return;
  }
  
  // Create new visualization
  switch (type) {
    case 'modelDistribution':
      createModelDistribution();
      break;
    case 'activityOverTime':
      createActivityOverTime();
      break;
  }
}

/**
 * Create model distribution chart
 */
function createModelDistribution() {
  // Count occurrences of each model
  const modelCounts = allHistory.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  // Convert to arrays for Chart.js
  const labels = Object.keys(modelCounts);
  const data = Object.values(modelCounts);
  
  // Create chart
  const ctx = elements.vizChart.getContext('2d');
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: CHART_COLORS,
        borderColor: 'white',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            font: {
              size: 11
            }
          }
        },
        title: {
          display: false
        }
      }
    }
  });
}

/**
 * Create activity over time chart
 */
function createActivityOverTime() {
  // Group conversations by date
  const dateGroups = {};
  
  allHistory.forEach(entry => {
    const dateStr = parseTimestamp(entry.timestamp).format('YYYY-MM-DD');
    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = 0;
    }
    dateGroups[dateStr]++;
  });
  
  // Get all dates in the range
  const dates = Object.keys(dateGroups).sort((a,b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  
  // Fill in missing dates
  if (dates.length > 1) {
    const firstChartDate = dayjs(dates[0]);
    const lastChartDate = dayjs(dates[dates.length - 1]);
    
    let currentDate = firstChartDate;
    while (currentDate.isSame(lastChartDate, 'day') || currentDate.isBefore(lastChartDate, 'day')) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = 0;
      }
      currentDate = currentDate.add(1, 'day');
    }
  }
  
  // Sort dates for chart
  const sortedDates = Object.keys(dateGroups).sort((a,b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  const counts = sortedDates.map(date => dateGroups[date]);
  
  // Format dates for display
  const displayDates = sortedDates.map(date => dayjs(date).format('MM/DD')); // Short format MM/DD
  
  // Create chart
  const ctx = elements.vizChart.getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: displayDates,
      datasets: [{
        label: 'Conversations',
        data: counts,
        backgroundColor: 'rgba(110, 65, 226, 0.2)',
        borderColor: 'rgba(110, 65, 226, 1)',
        borderWidth: 2,
        tension: 0.1,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: 'white',
        pointBorderColor: 'rgba(110, 65, 226, 1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

/**
 * Exports history data to a JSON file
 * * Creates a downloadable JSON file containing either:
 * - All history data if no filters are applied
 * - Only filtered history data if filters are active
 * * The file will be named with the current date (YYYY-MM-DD) format
 * and automatically trigger a download in the browser.
 * * @returns {void}
 * @throws {Error} Will throw an error if file creation fails
 */
function exportHistoryData() {
  try {
    if (allHistory.length === 0) {
      alert('No history data to export');
      return;
    }
    
    // Create exportable data
    const dataToExport = filteredHistory.length < allHistory.length && filteredHistory.length > 0 
      ? filteredHistory  // Export only filtered data if filters are active
      : allHistory;      // Export all data if no filters
    
    // Create file
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    // Use dayjs for filename date formatting
    downloadLink.download = `gemini-history-export-${dayjs().format('YYYY-MM-DD')}.json`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting history:', error);
    alert('Failed to export history data');
  }
}

/**
 * Handle import file
 */
async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await readFile(file);
    const importedData = JSON.parse(text);
    
    if (!Array.isArray(importedData)) {
      throw new Error('Invalid data format');
    }
    
    // Get current data and merge, avoiding duplicates
    const existingUrls = new Set(allHistory.map(item => item.url));
    const newItems = importedData.filter(item => !existingUrls.has(item.url));
    
    if (newItems.length === 0) {
      alert('No new conversations found in import file');
      return;
    }
    
    // Merge and sort by timestamp (newest first)
    const mergedData = [...allHistory, ...newItems].sort((a, b) => {
      return parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf();
    });
    
    // Save merged data
    await browser.storage.local.set({ [STORAGE_KEY]: mergedData });
    
    // Update badge
    browser.runtime.sendMessage({
      action: 'updateHistoryCount',
      count: mergedData.length
    });
    
    // Update local data
    allHistory = mergedData;
    
    // Update UI
    elements.emptyState.style.display = 'none';
    updateFilteredHistory();
    updateStats(allHistory);
    populateModelFilter();
    updateConversationList();
    createVisualization(currentVisualization);
    
    alert(`Import complete: Added ${newItems.length} new conversations`);
  } catch (error) {
    console.error('Import error:', error);
    alert(`Import error: ${error.message}`);
  }
  
  // Reset the input
  event.target.value = '';
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Close modal buttons
  elements.closeModal.addEventListener('click', closeModals);
  elements.closeConfirmation.addEventListener('click', closeModals);
  elements.cancelAction.addEventListener('click', closeModals);
  
  // Confirmation action button
  elements.confirmAction.addEventListener('click', () => {
    if (typeof confirmationCallback === 'function') {
      confirmationCallback();
    }
    confirmationCallback = null;
  });
  
  // Filter change events
  elements.modelFilter.addEventListener('change', () => {
    updateFilteredHistory();
    updateConversationList();
  });
  
  elements.dateFilter.addEventListener('change', () => {
    updateFilteredHistory();
    updateConversationList();
  });
  
  elements.startDate.addEventListener('change', () => {
    if (elements.dateFilter.value === 'custom') {
      updateFilteredHistory();
      updateConversationList();
    }
  });
  
  elements.endDate.addEventListener('change', () => {
    if (elements.dateFilter.value === 'custom') {
      updateFilteredHistory();
      updateConversationList();
    }
  });
  
  // Add focus and blur effects for search input
  elements.searchFilter.addEventListener('focus', () => {
    elements.searchFilter.parentElement.classList.add('focused');
  });
  
  elements.searchFilter.addEventListener('blur', () => {
    elements.searchFilter.parentElement.classList.remove('focused');
  });
  
  elements.searchFilter.addEventListener('input', () => {
    updateFilteredHistory();
    updateConversationList();
  });
  
  // Sort change event
  elements.sortBy.addEventListener('change', () => {
    sortFilteredHistory();
    updateConversationList();
  });
  
  // Visualization tab events
  elements.vizTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      elements.vizTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update visualization
      currentVisualization = tab.dataset.viz;
      createVisualization(currentVisualization);
    });
  });
  
  // Export button
  elements.exportHistoryBtn.addEventListener('click', exportHistoryData);
  
  // Import button and file input
  elements.importHistoryBtn.addEventListener('click', () => {
    // Clear URL parameters if they exist
    if (window.location.search) {
      const currentPath = window.location.pathname;
      window.history.replaceState({}, document.title, currentPath);
    }
    
    elements.importFileInput.click();
  });
  
  elements.importFileInput.addEventListener('change', handleImportFile);
  
  // Clear history button
  elements.clearHistoryBtn.addEventListener('click', () => {
    showConfirmation(
      'Clear All History',
      'Are you sure you want to delete all conversation history? This action cannot be undone.',
      clearAllHistory
    );
  });
  
  // Start chat button (in empty state)
  const startChatBtn = document.getElementById('startChatBtn');
  if (startChatBtn) {
    startChatBtn.addEventListener('click', () => {
      browser.tabs.create({ url: 'https://gemini.google.com/app' });
    });
  }
}

/**
 * Clear all history data
 */
async function clearAllHistory() {
  try {
    // Clear the storage
    await browser.storage.local.set({ [STORAGE_KEY]: [] });
    
    // Update badge
    browser.runtime.sendMessage({
      action: 'updateHistoryCount',
      count: 0
    });
    
    // Reset local data
    allHistory = [];
    filteredHistory = [];
    
    // Update UI
    closeModals();
    updateStats(allHistory);
    updateConversationList();
    createVisualization(currentVisualization);
    elements.emptyState.style.display = 'flex';
    
  } catch (error) {
    console.error('Error clearing history:', error);
    alert('Failed to clear history');
  }
}

/**
 * Show error message
 */
function showError(message) {
  // Clear existing content
  while (elements.loadingState.firstChild) {
    elements.loadingState.removeChild(elements.loadingState.firstChild);
  }
  
  // Create and append error icon
  const errorIcon = document.createElement('div');
  errorIcon.className = 'error-icon';
  errorIcon.textContent = '⚠️';
  elements.loadingState.appendChild(errorIcon);
  
  // Create and append error message
  const errorMsg = document.createElement('p');
  errorMsg.textContent = `Error: ${message}`;
  elements.loadingState.appendChild(errorMsg);
  
  // Create and append reload button
  const reloadBtn = document.createElement('button');
  reloadBtn.id = 'reloadBtn';
  reloadBtn.className = 'button primary-button';
  reloadBtn.textContent = 'Reload';
  elements.loadingState.appendChild(reloadBtn);
  
  // Add event listener to reload button
  reloadBtn.addEventListener('click', () => {
    window.location.reload();
  });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);