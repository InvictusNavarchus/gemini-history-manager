/**
 * Gemini History Manager - Full History View
 * Handles data visualization, filtering, and conversation management
 */

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
    
  } catch (error) {
    console.error('Error initializing application:', error);
    showError('Failed to load history data');
  }
}

/**
 * Load history data from storage
 */
async function loadHistoryData() {
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const history = data[STORAGE_KEY] || [];
    
    if (history.length === 0) {
      elements.emptyState.style.display = 'flex';
    }
    
    return history;
  } catch (error) {
    console.error('Error loading history data:', error);
    throw error;
  }
}

/**
 * Update filtered history based on current filters
 */
function updateFilteredHistory() {
  // Get filter values
  const modelValue = elements.modelFilter.value;
  const dateFilterValue = elements.dateFilter.value;
  const searchValue = elements.searchFilter.value.toLowerCase();
  const startDateValue = elements.startDate.value;
  const endDateValue = elements.endDate.value;
  
  // Apply filters
  filteredHistory = allHistory.filter(item => {
    // Model filter
    if (modelValue && item.model !== modelValue) {
      return false;
    }
    
    // Date filter
    if (dateFilterValue !== 'all') {
      const itemDate = new Date(item.timestamp);
      const now = new Date();
      
      if (dateFilterValue === 'today') {
        // Today only
        if (!isSameDay(itemDate, now)) {
          return false;
        }
      } else if (dateFilterValue === 'week') {
        // This week
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        if (itemDate < weekStart) {
          return false;
        }
      } else if (dateFilterValue === 'month') {
        // This month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        if (itemDate < monthStart) {
          return false;
        }
      } else if (dateFilterValue === 'custom' && (startDateValue || endDateValue)) {
        // Custom date range
        if (startDateValue) {
          const startDate = new Date(startDateValue);
          startDate.setHours(0, 0, 0, 0);
          
          if (itemDate < startDate) {
            return false;
          }
        }
        
        if (endDateValue) {
          const endDate = new Date(endDateValue);
          endDate.setHours(23, 59, 59, 999);
          
          if (itemDate > endDate) {
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
}

/**
 * Sort filtered history based on current sort option
 */
function sortFilteredHistory() {
  const sortOption = elements.sortBy.value;
  
  switch (sortOption) {
    case 'date-desc':
      filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      break;
    case 'date-asc':
      filteredHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
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
  date.textContent = formatDate(new Date(entry.timestamp));
  
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
  elements.detailDate.textContent = new Date(conversation.timestamp).toLocaleString();
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
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  const firstDate = new Date(sortedByDate[0].timestamp);
  const lastDate = new Date(sortedByDate[sortedByDate.length - 1].timestamp);
  
  elements.firstConversationTime.textContent = formatDate(firstDate, true);
  elements.lastConversationTime.textContent = formatTimeAgo(lastDate);
  
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
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  elements.startDate.value = formatDateForInput(thirtyDaysAgo);
  elements.endDate.value = formatDateForInput(today);
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
    const date = new Date(entry.timestamp);
    const dateStr = formatDateForGrouping(date);
    
    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = 0;
    }
    dateGroups[dateStr]++;
  });
  
  // Get all dates in the range
  const dates = Object.keys(dateGroups).sort();
  
  // Fill in missing dates
  if (dates.length > 1) {
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    
    // Ensure continuous dates
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = formatDateForGrouping(currentDate);
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = 0;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  // Sort dates for chart
  const sortedDates = Object.keys(dateGroups).sort();
  const counts = sortedDates.map(date => dateGroups[date]);
  
  // Format dates for display
  const displayDates = sortedDates.map(date => {
    const [year, month, day] = date.split('-');
    return `${month}/${day}`; // Short format MM/DD
  });
  
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
 * 
 * Creates a downloadable JSON file containing either:
 * - All history data if no filters are applied
 * - Only filtered history data if filters are active
 * 
 * The file will be named with the current date (YYYY-MM-DD) format
 * and automatically trigger a download in the browser.
 * 
 * @returns {void}
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
    downloadLink.download = `gemini-history-export-${formatDateForFilename(new Date())}.json`;
    
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
 * Reads a file and returns its contents as text
 * 
 * Uses the FileReader API to asynchronously read a file's contents
 * and convert it to a text string.
 * 
 * @param {File} file - The file object to read
 * @returns {Promise<string>} A promise that resolves with the file contents as text
 * @throws {Error} Will throw an error if file reading fails
 * @example
 * // Example usage:
 * const fileContent = await readFile(fileObject);
 * console.log(fileContent); // File contents as string
 */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsText(file);
  });
}

/**
 * Formats a date object for display based on relative time from now
 * 
 * Provides different formatting based on how recent the date is:
 * - For today: Shows time only (HH:MM)
 * - For this year: Shows month and day (Jan 15)
 * - For previous years: Shows month, day and year (Jan 15, 2023)
 * 
 * @param {Date} date - The date object to format
 * @param {boolean} [includeYear=false] - Whether to force include the year even for current year
 * @returns {string} Formatted date string
 * @example
 * // If today is Jan 15, 2024
 * formatDate(new Date()); // Returns "14:30" (if current time is 2:30 PM)
 * formatDate(new Date('2024-01-10')); // Returns "Jan 10"
 * formatDate(new Date('2023-12-25')); // Returns "Dec 25, 2023"
 * formatDate(new Date('2024-01-10'), true); // Returns "Jan 10, 2024" (with includeYear=true)
 */
function formatDate(date, includeYear = false) {
  // For today, show time only
  const today = new Date();
  if (isSameDay(date, today)) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // For this year, show month and day
  if (date.getFullYear() === today.getFullYear() && !includeYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  // For other years, include year
  return date.toLocaleDateString([], { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Formats a date for input fields in YYYY-MM-DD format
 * 
 * Creates a string representation of a date that can be used
 * as a value for HTML date input elements.
 * 
 * @param {Date} date - The date to format
 * @returns {string} Date formatted as YYYY-MM-DD
 * @example
 * const inputDateValue = formatDateForInput(new Date('2024-01-15'));
 * console.log(inputDateValue); // "2024-01-15"
 */
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date for grouping in charts (YYYY-MM-DD)
 * 
 * Creates a standardized string representation of a date that
 * can be used as a consistent key for grouping date entries.
 * 
 * @param {Date} date - The date to format
 * @returns {string} Date formatted as YYYY-MM-DD
 * @example
 * const groupKey = formatDateForGrouping(new Date('2024-01-15T14:30:00'));
 * console.log(groupKey); // "2024-01-15"
 */
function formatDateForGrouping(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date for use in filenames (YYYY-MM-DD)
 * 
 * Creates a filename-friendly string representation of a date
 * to be used when naming exported files.
 * 
 * @param {Date} date - The date to format
 * @returns {string} Date formatted as YYYY-MM-DD
 * @example
 * const filename = `report-${formatDateForFilename(new Date())}.json`;
 * console.log(filename); // "report-2024-01-15.json"
 */
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date as a human-readable relative time string
 * 
 * Converts a date to a string representing the relative time from now:
 * - Seconds: "Just now"
 * - Minutes: "X mins ago"
 * - Hours: "X hours ago"
 * - Days: "X days ago"
 * - Months: "X months ago"
 * - Years: "X years ago"
 * 
 * @param {Date} date - The date to calculate relative time from
 * @returns {string} Human-readable relative time string
 * @example
 * // If current time is 2:30 PM
 * formatTimeAgo(new Date(Date.now() - 5 * 60 * 1000)); // "5 mins ago"
 * formatTimeAgo(new Date(Date.now() - 2 * 60 * 60 * 1000)); // "2 hours ago"
 * formatTimeAgo(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)); // "3 days ago"
 */
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) {
    return 'Just now';
  }
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  }
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  }
  
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
}

/**
 * Checks if two dates represent the same calendar day
 * 
 * Compares year, month, and day components of two Date objects
 * to determine if they represent the same calendar day.
 * This ignores time components (hours, minutes, seconds).
 * 
 * @param {Date} date1 - First date to compare
 * @param {Date} date2 - Second date to compare
 * @returns {boolean} True if dates represent the same calendar day, false otherwise
 * @example
 * isSameDay(new Date('2024-01-15T09:00:00'), new Date('2024-01-15T15:30:00')); // true
 * isSameDay(new Date('2024-01-15'), new Date('2024-01-16')); // false
 */
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
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
      return new Date(b.timestamp) - new Date(a.timestamp);
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