/**
 * Gemini History Manager - Dashboard Data Helpers
 * Functions for data management in the Dashboard
 */
import { Logger, parseTimestamp } from '../../lib/utils.js';
import dayjs from 'dayjs';

// Constants
export const STORAGE_KEY = 'geminiChatHistory';

/**
 * Save history data to browser storage
 * @param {Array} historyData - The history data array to save
 * @returns {Promise} A promise that resolves when the data is saved
 */
export async function saveHistoryData(historyData) {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: historyData });
    Logger.log(`Saved ${historyData.length} conversations to storage`);
  } catch (error) {
    Logger.error('Error saving data:', error);
    throw error; // Re-throw for caller to handle
  }
}

/**
 * Load history data from browser storage
 * @returns {Promise<Array>} A promise that resolves with the history data array
 */
export async function loadHistoryData() {
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const historyData = data[STORAGE_KEY] || [];
    
    // Sort by timestamp descending (most recent first)
    historyData.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
    
    Logger.log(`Loaded ${historyData.length} conversations from storage`);
    return historyData;
  } catch (error) {
    Logger.error('Error loading history data:', error);
    throw error;
  }
}

/**
 * Filter history data based on search query, model, and date range
 * @param {Array} history - The array of history items to filter
 * @param {Object} filters - Filter criteria
 * @param {string} filters.searchQuery - Search query for text filtering
 * @param {string} filters.modelFilter - Model name to filter by
 * @param {string} filters.dateFilter - Date range filter ('all', 'today', 'yesterday', 'thisWeek', 'thisMonth', 'custom')
 * @param {string} filters.customStartDate - Start date for custom range (YYYY-MM-DD)
 * @param {string} filters.customEndDate - End date for custom range (YYYY-MM-DD)
 * @param {string} filters.sortBy - Sort option ('date-desc', 'date-asc', 'title-asc', 'title-desc', 'model')
 * @returns {Array} Filtered and sorted history items
 */
export function filterAndSortHistory(history, filters) {
  Logger.log("Applying filters to history data...");
  let items = [...history];

  // Apply search filter
  if (filters.searchQuery) {
    const searchLower = filters.searchQuery.toLowerCase();
    items = items.filter(item => 
      (item.title && item.title.toLowerCase().includes(searchLower)) || 
      (item.prompt && item.prompt.toLowerCase().includes(searchLower))
    );
  }

  // Apply model filter
  if (filters.modelFilter) {
    items = items.filter(item => item.model === filters.modelFilter);
  }

  // Apply date filter
  const now = dayjs();
  if (filters.dateFilter !== 'all') {
    let startDate, endDate;
    
    if (filters.dateFilter === 'today') {
      startDate = now.startOf('day');
      endDate = now.endOf('day');
    } else if (filters.dateFilter === 'yesterday') {
      startDate = now.subtract(1, 'day').startOf('day');
      endDate = now.subtract(1, 'day').endOf('day');
    } else if (filters.dateFilter === 'thisWeek') {
      startDate = now.startOf('week');
      endDate = now;
    } else if (filters.dateFilter === 'thisMonth') {
      startDate = now.startOf('month');
      endDate = now;
    } else if (filters.dateFilter === 'custom') {
      startDate = dayjs(filters.customStartDate).startOf('day');
      endDate = dayjs(filters.customEndDate).endOf('day');
    }
    
    if (startDate && endDate) {
      items = items.filter(item => {
        const timestamp = parseTimestamp(item.timestamp);
        return timestamp.isValid() && timestamp.isBetween(startDate, endDate, null, '[]');
      });
    }
  }

  // Apply sorting
  switch (filters.sortBy) {
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
}

/**
 * Generate statistics from history data
 * @param {Array} historyData - The history data array
 * @returns {Object} Statistics object
 */
export function generateDashboardStats(historyData) {
  const stats = {
    totalConversations: historyData.length,
    mostUsedModel: '-',
    mostUsedModelCount: '',
    avgTitleLength: '-',
    firstConversationTime: '-',
    lastConversationTime: '-',
    totalFilesUploaded: 0
  };

  if (historyData.length === 0) {
    return stats;
  }

  // Calculate most used model
  const modelCounts = historyData.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  const mostUsed = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];
  stats.mostUsedModel = mostUsed ? mostUsed[0] : '-';
  stats.mostUsedModelCount = mostUsed ? `(${mostUsed[1]} chats)` : '';

  // Calculate average title length
  const totalTitleLength = historyData.reduce((acc, entry) => acc + (entry.title ? entry.title.length : 0), 0);
  stats.avgTitleLength = Math.round(historyData.length > 0 ? totalTitleLength / historyData.length : 0);

  // Get first and last conversation times
  const sortedByDate = [...historyData].sort((a, b) => {
    return parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf();
  });
  
  if (sortedByDate.length > 0) {
    stats.firstConversationTime = parseTimestamp(sortedByDate[0].timestamp).fromNow();
    stats.lastConversationTime = parseTimestamp(sortedByDate[sortedByDate.length - 1].timestamp).fromNow();
  }
  
  // Count attached files
  stats.totalFilesUploaded = historyData.reduce((acc, entry) => acc + (entry.attachedFiles ? entry.attachedFiles.length : 0), 0);

  return stats;
}

/**
 * Extract available models from history data
 * @param {Array} historyData - The history data array
 * @returns {Array} List of unique models
 */
export function getAvailableModels(historyData) {
  const models = new Set(historyData.map(item => item.model || 'Unknown'));
  return Array.from(models).sort();
}

/**
 * Import history data from JSON
 * @param {string} fileContent - JSON content to import
 * @param {Array} currentHistory - Current history data
 * @returns {Object} Results with imported items and new history
 */
export function importHistoryData(fileContent, currentHistory) {
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
  const existingUrls = new Set(currentHistory.map(item => item.url));
  const newItems = importedData.filter(item => item.url && !existingUrls.has(item.url));
  
  // Create updated history
  let updatedHistory = currentHistory;
  if (newItems.length > 0) {
    updatedHistory = [...currentHistory, ...newItems];
    // Sort the history
    updatedHistory.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
  }
  
  return {
    newItems,
    updatedHistory
  };
}
