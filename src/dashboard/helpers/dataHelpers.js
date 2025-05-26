/**
 * Gemini History Manager - Dashboard Data Helpers
 * Functions for data management in the Dashboard
 */
import { Logger, parseTimestamp } from "../../lib/utils.js";
import dayjs from "dayjs";
import { createSearchIndex, searchHistory } from "./searchHelpers.js";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

/**
 * Storage key used for saving and loading chat history in browser storage.
 * @type {string}
 */
export const STORAGE_KEY = "geminiChatHistory";

/**
 * Saves history data to browser storage.
 * Cleans Vue reactivity, saves to local storage, and updates UI badge count.
 * Handles errors and logs all major steps.
 *
 * @param {Array<Object>} historyData - The history data array to save.
 * @returns {Promise<void>} Resolves when the data is saved.
 * @throws Will throw if storage fails.
 */
export async function saveHistoryData(historyData) {
  try {
    // Ensure we're working with clean data without Vue reactive proxies
    const dataToSave = Array.isArray(historyData) ? JSON.parse(JSON.stringify(historyData)) : [];

    await browser.storage.local.set({ [STORAGE_KEY]: dataToSave });
    Logger.log("dataHelpers", `Saved ${dataToSave.length} conversations to storage`);

    // Send message to background script to update badge
    try {
      await browser.runtime.sendMessage({
        action: "updateHistoryCount",
        count: dataToSave.length,
      });
      Logger.debug("dataHelpers", "Badge count update message sent successfully");
    } catch (msgError) {
      Logger.error("dataHelpers", "Error sending message to update badge count:", msgError);
      // Don't throw this error as it's not critical to the save operation
    }
  } catch (error) {
    Logger.error("dataHelpers", "Error saving data:", error);
    throw error; // Re-throw for caller to handle
  }
}

/**
 * Loads history data from browser storage, sorts it, and ensures unique IDs.
 * Handles errors, sorts by timestamp, and logs results.
 *
 * @returns {Promise<Array<Object>>} Resolves with the loaded and sorted history data array.
 * @throws Will throw if loading from storage fails.
 */
export async function loadHistoryData() {
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const historyData = data[STORAGE_KEY] || [];

    // Sort by timestamp descending (most recent first)
    historyData.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());

    // Add unique IDs to history items if they don't have one
    historyData.forEach((item, index) => {
      if (!item.id) {
        item.id = `history-${index}-${Date.now()}`;
      }
    });

    Logger.log("dataHelpers", `Loaded ${historyData.length} conversations from storage`);
    return historyData;
  } catch (error) {
    Logger.error("dataHelpers", "Error loading history data:", error);
    throw error;
  }
}

/**
 * Filters and sorts history data based on search query, model, date range, and sort options.
 * Applies fuzzy search, model filtering, date range, and sorting as specified in filters.
 *
 * @param {Array<Object>} history - The array of history items to filter.
 * @param {Object} filters - Filter criteria.
 * @param {string} filters.searchQuery - Search query for text filtering.
 * @param {string} filters.modelFilter - Model name to filter by.
 * @param {string} filters.dateFilter - Date range filter ('all', 'today', 'yesterday', 'thisWeek', 'thisMonth', 'custom').
 * @param {string} filters.customStartDate - Start date for custom range (YYYY-MM-DD).
 * @param {string} filters.customEndDate - End date for custom range (YYYY-MM-DD).
 * @param {string} filters.sortBy - Sort option ('date-desc', 'date-asc', 'title-asc', 'title-desc', 'model').
 * @returns {Array<Object>} Filtered and sorted history items.
 */
export function filterAndSortHistory(history, filters) {
  Logger.log("dataHelpers", `Applying filters to history data (${history.length} total items)`);
  Logger.debug(
    "dataHelpers",
    `Filter criteria: ${JSON.stringify({
      query: filters.searchQuery || "none",
      model: filters.modelFilter || "all",
      dateRange: filters.dateFilter,
      sortBy: filters.sortBy,
    })}`
  );

  let items = [...history];

  // Apply search filter
  if (filters.searchQuery) {
    Logger.log("dataHelpers", `Applying search filter: "${filters.searchQuery}"`);
    const originalCount = items.length;

    // Use the persistent search index if provided, otherwise create a new one
    // This is more efficient as we don't need to rebuild the index on every search
    const activeSearchIndex = filters.searchIndex || createSearchIndex(items);
    items = searchHistory(activeSearchIndex, filters.searchQuery, items);

    Logger.debug(
      "dataHelpers",
      `Search filter reduced items from ${originalCount} to ${items.length} (removed ${originalCount - items.length})`
    );
  }

  // Apply model filter
  if (filters.modelFilter) {
    Logger.log("dataHelpers", `Applying model filter: "${filters.modelFilter}"`);

    const originalCount = items.length;
    items = items.filter((item) => item.model === filters.modelFilter);

    Logger.debug(
      "dataHelpers",
      `Model filter reduced items from ${originalCount} to ${items.length} (removed ${originalCount - items.length})`
    );
  }

  // Apply plan filter
  if (filters.planFilter) {
    Logger.log("dataHelpers", `Applying plan filter: "${filters.planFilter}"`);

    const originalCount = items.length;
    items = items.filter((item) => item.geminiPlan === filters.planFilter);

    Logger.debug(
      "dataHelpers",
      `Plan filter reduced items from ${originalCount} to ${items.length} (removed ${originalCount - items.length})`
    );
  }

  // Apply gem filter
  if (filters.gemFilter) {
    Logger.log("dataHelpers", `Applying gem filter: "${filters.gemFilter}"`);

    const originalCount = items.length;

    if (filters.gemFilter === "hasGem") {
      // Show only conversations with any gem
      items = items.filter((item) => item.gemName || item.gemId);
      Logger.debug("dataHelpers", `Filtering to show only conversations with gems`);
    } else {
      // Show conversations with a specific gem
      items = items.filter((item) => item.gemName === filters.gemFilter);
      Logger.debug("dataHelpers", `Filtering to show only conversations with gem: ${filters.gemFilter}`);
    }

    Logger.debug(
      "dataHelpers",
      `Gem filter reduced items from ${originalCount} to ${items.length} (removed ${originalCount - items.length})`
    );
  }

  // Apply date filter
  const now = dayjs();
  if (filters.dateFilter !== "all") {
    Logger.log("dataHelpers", `Applying date filter: "${filters.dateFilter}"`);
    let startDate, endDate;

    if (filters.dateFilter === "today") {
      startDate = now.startOf("day");
      endDate = now.endOf("day");
      Logger.debug("dataHelpers", `Date filter "today": from ${startDate.format()} to ${endDate.format()}`);
    } else if (filters.dateFilter === "yesterday") {
      startDate = now.subtract(1, "day").startOf("day");
      endDate = now.subtract(1, "day").endOf("day");
      Logger.debug(
        "dataHelpers",
        `Date filter "yesterday": from ${startDate.format()} to ${endDate.format()}`
      );
    } else if (filters.dateFilter === "thisWeek") {
      startDate = now.startOf("week");
      endDate = now;
      Logger.debug(
        "dataHelpers",
        `Date filter "thisWeek": from ${startDate.format()} to ${endDate.format()}`
      );
    } else if (filters.dateFilter === "thisMonth") {
      startDate = now.startOf("month");
      endDate = now;
      Logger.debug(
        "dataHelpers",
        `Date filter "thisMonth": from ${startDate.format()} to ${endDate.format()}`
      );
    } else if (filters.dateFilter === "custom") {
      startDate = dayjs(filters.customStartDate).startOf("day");
      endDate = dayjs(filters.customEndDate).endOf("day");
      Logger.debug("dataHelpers", `Custom date filter: from ${startDate.format()} to ${endDate.format()}`);
    }

    if (startDate && endDate) {
      const originalCount = items.length;

      items = items.filter((item) => {
        const timestamp = parseTimestamp(item.timestamp);
        return timestamp.isValid() && timestamp.isBetween(startDate, endDate, null, "[]");
      });

      Logger.debug(
        "dataHelpers",
        `Date filter reduced items from ${originalCount} to ${items.length} (removed ${originalCount - items.length})`
      );
    }
  }

  // Apply sorting
  Logger.log("dataHelpers", `Applying sort order: ${filters.sortBy || "default"}`);

  switch (filters.sortBy) {
    case "relevance":
      // If there's an active search query, relevance sorting was already applied during search
      // If there's no search query, we'll default to date-desc sorting
      if (!filters.searchQuery) {
        Logger.debug("dataHelpers", "No search query for relevance sorting, defaulting to date-desc");
        items.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
      } else {
        Logger.debug("dataHelpers", "Using search relevance order");
      }
      break;
    case "date-desc":
      Logger.debug("dataHelpers", "Sorting by date descending (newest first)");
      items.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
      break;
    case "date-asc":
      Logger.debug("dataHelpers", "Sorting by date ascending (oldest first)");
      items.sort((a, b) => parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf());
      break;
    case "title-asc":
      Logger.debug("dataHelpers", "Sorting by title ascending (A to Z)");
      items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "title-desc":
      Logger.debug("dataHelpers", "Sorting by title descending (Z to A)");
      items.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
      break;
    case "model":
      Logger.debug("dataHelpers", "Sorting by model name");
      items.sort((a, b) => (a.model || "").localeCompare(b.model || ""));
      break;
    case "plan":
      Logger.debug("dataHelpers", "Sorting by Gemini plan");
      items.sort((a, b) => {
        // First sort by whether they have a plan (items with plans come first)
        if (a.geminiPlan && !b.geminiPlan) return -1;
        if (!a.geminiPlan && b.geminiPlan) return 1;

        // Then sort by plan name (Pro first, then Free, then others)
        const planOrder = { Pro: 1, Free: 2 };
        const aPlanValue = a.geminiPlan ? planOrder[a.geminiPlan] || 3 : 4;
        const bPlanValue = b.geminiPlan ? planOrder[b.geminiPlan] || 3 : 4;

        return aPlanValue - bPlanValue;
      });
      break;
    default:
      Logger.debug("dataHelpers", "Using default sort order (date descending)");
      items.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
  }

  Logger.log(
    "dataHelpers",
    `Filtering and sorting complete. Result contains ${items.length} items out of ${history.length} total (${Math.round((items.length / history.length) * 100)}%)`
  );
  return items;
}

/**
 * Generates statistics for the dashboard based on history data.
 * Calculates counts, model usage, plan distribution, and other insights.
 *
 * @param {Array<Object>} historyData - The history data array.
 * @returns {Object} Statistics object with counts and insights.
 */
export function generateDashboardStats(historyData) {
  Logger.log("dataHelpers", `Generating dashboard statistics from ${historyData.length} history items`);

  const stats = {
    totalConversations: 0,
    mostUsedModel: "",
    mostUsedModelCount: 0,
    mostUsedPlan: "",
    mostUsedPlanCount: 0,
    avgTitleLength: 0,
    firstConversationTime: "",
    lastConversationTime: "",
    totalFilesUploaded: 0,
  };

  if (!historyData || historyData.length === 0) {
    Logger.log("dataHelpers", "No history data available for statistics");
    return stats;
  }

  Logger.debug("dataHelpers", `Starting statistics calculation for ${historyData.length} conversations`);

  // Calculate most used model
  Logger.debug("dataHelpers", "Calculating model usage statistics");
  const modelCounts = historyData.reduce((acc, entry) => {
    const model = entry.model || "Unknown";
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});

  Logger.debug("dataHelpers", `Model distribution: ${JSON.stringify(modelCounts)}`);

  const mostUsed = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];
  stats.mostUsedModel = mostUsed ? mostUsed[0] : "-";
  stats.mostUsedModelCount = mostUsed ? `(${mostUsed[1]} chats)` : "";

  // Calculate most used plan
  Logger.debug("dataHelpers", "Calculating plan usage statistics");
  const planCounts = historyData.reduce((acc, entry) => {
    const plan = entry.geminiPlan || "Unknown";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  Logger.debug("dataHelpers", `Plan distribution: ${JSON.stringify(planCounts)}`);

  const mostUsedPlan = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0];
  stats.mostUsedPlan = mostUsedPlan ? mostUsedPlan[0] : "-";
  stats.mostUsedPlanCount = mostUsedPlan ? `(${mostUsedPlan[1]} chats)` : "";

  Logger.debug("dataHelpers", `Most used model: ${stats.mostUsedModel} ${stats.mostUsedModelCount}`);

  // Calculate average title length
  Logger.debug("dataHelpers", "Calculating average title length");
  const totalTitleLength = historyData.reduce(
    (acc, entry) => acc + (entry.title ? entry.title.length : 0),
    0
  );
  stats.avgTitleLength = Math.round(historyData.length > 0 ? totalTitleLength / historyData.length : 0);
  Logger.debug(
    "dataHelpers",
    `Average title length: ${stats.avgTitleLength} characters from ${totalTitleLength} total characters`
  );

  // Get first and last conversation times
  Logger.debug("dataHelpers", "Calculating first and last conversation times");
  const sortedByDate = [...historyData].sort((a, b) => {
    return parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf();
  });

  if (sortedByDate.length > 0) {
    const firstTimestamp = parseTimestamp(sortedByDate[0].timestamp);
    const lastTimestamp = parseTimestamp(sortedByDate[sortedByDate.length - 1].timestamp);

    stats.firstConversationTime = firstTimestamp.fromNow();
    stats.lastConversationTime = lastTimestamp.fromNow();

    Logger.debug(
      "dataHelpers",
      `First conversation: ${firstTimestamp.format()} (${stats.firstConversationTime})`
    );
    Logger.debug(
      "dataHelpers",
      `Last conversation: ${lastTimestamp.format()} (${stats.lastConversationTime})`
    );
  } else {
    Logger.warn("dataHelpers", "Failed to determine conversation time range");
  }

  // Count attached files
  Logger.debug("dataHelpers", "Calculating total files uploaded");
  stats.totalFilesUploaded = historyData.reduce(
    (acc, entry) => acc + (entry.attachedFiles ? entry.attachedFiles.length : 0),
    0
  );
  Logger.debug("dataHelpers", `Total files uploaded: ${stats.totalFilesUploaded}`);

  // Set the total number of conversations
  stats.totalConversations = historyData.length;

  Logger.log(
    "dataHelpers",
    `Statistics generation complete: ${stats.totalConversations} conversations, ${Object.keys(modelCounts).length} unique models`
  );
  return stats;
}

/**
 * Extracts all available models from history data.
 *
 * @param {Array<Object>} historyData - The history data array.
 * @returns {Array<string>} Array of unique model names.
 */
export function getAvailableModels(historyData) {
  Logger.log("dataHelpers", `Extracting available models from ${historyData.length} history items`);

  // Get unique set of model names, filter out undefined/null models
  const modelSet = new Set(historyData.map((item) => item.model || "Unknown"));
  const sortedModels = Array.from(modelSet).sort();

  Logger.debug("dataHelpers", `Found ${sortedModels.length} unique models: ${sortedModels.join(", ")}`);
  return sortedModels;
}

/**
 * Extracts all available Gemini plans from history data.
 *
 * @param {Array<Object>} historyData - The history data array.
 * @returns {Array<string>} Array of unique plan names.
 */
export function getAvailablePlans(historyData) {
  Logger.log("dataHelpers", `Extracting available Gemini plans from ${historyData.length} history items`);

  // Get unique set of plan names, filter out undefined/null plans
  const plansSet = new Set();
  historyData.forEach((item) => {
    if (item.geminiPlan) {
      plansSet.add(item.geminiPlan);
    }
  });

  // Sort plans with Pro first, then Free, then others alphabetically
  const sortedPlans = Array.from(plansSet).sort((a, b) => {
    if (a === "Pro" && b !== "Pro") return -1;
    if (a !== "Pro" && b === "Pro") return 1;
    if (a === "Free" && b !== "Free") return -1;
    if (a !== "Free" && b === "Free") return 1;
    return a.localeCompare(b);
  });

  Logger.debug("dataHelpers", `Found ${sortedPlans.length} unique plans: ${sortedPlans.join(", ")}`);
  return sortedPlans;
}

/**
 * Extracts all available Gems from history data.
 *
 * @param {Array<Object>} historyData - The history data array.
 * @returns {Array<string>} Array of unique gem names.
 */
export function getAvailableGems(historyData) {
  Logger.log("dataHelpers", `Extracting available Gems from ${historyData.length} history items`);

  // Get unique set of gem names, filter out undefined/null gems
  const gemsSet = new Set();
  historyData.forEach((item) => {
    if (item.gemName) {
      gemsSet.add(item.gemName);
    }
  });

  // Sort gems alphabetically
  const sortedGems = Array.from(gemsSet).sort((a, b) => a.localeCompare(b));

  Logger.debug("dataHelpers", `Found ${sortedGems.length} unique gems: ${sortedGems.join(", ")}`);
  return sortedGems;
}

/**
 * Imports history data from a JSON string, merges with current history, and returns results.
 * Handles deduplication and error reporting.
 *
 * @param {string} fileContent - JSON content to import.
 * @param {Array<Object>} currentHistory - Current history data.
 * @returns {Promise<Object>} Results with imported items and new history.
 */
export async function importHistoryData(fileContent, currentHistory) {
  Logger.log("dataHelpers", "Starting import of history data from JSON");
  Logger.debug("dataHelpers", `Current history contains ${currentHistory.length} items`);
  Logger.debug("dataHelpers", `Import file content length: ${fileContent.length} characters`);

  let importedData;

  try {
    Logger.debug("dataHelpers", "Attempting to parse JSON import content");
    importedData = JSON.parse(fileContent);
    Logger.log("dataHelpers", "JSON import data successfully parsed");
  } catch (e) {
    Logger.error("dataHelpers", "Failed to parse import JSON data:", e);
    throw new Error("Invalid JSON format in the imported file");
  }

  if (!Array.isArray(importedData)) {
    Logger.error("dataHelpers", `Import data is not an array but a ${typeof importedData}`);
    throw new Error("Imported data is not in the correct format (expected an array)");
  }

  Logger.log("dataHelpers", `Import file contains ${importedData.length} conversation entries`);

  // Filter out entries that already exist in history (by URL)
  // Use a clean copy of currentHistory to avoid reactive proxy issues
  const plainCurrentHistory = JSON.parse(JSON.stringify(currentHistory));
  const existingUrls = new Set(plainCurrentHistory.map((item) => item.url));
  Logger.debug("dataHelpers", `Found ${existingUrls.size} existing URLs to check for duplicates`);

  const newItems = importedData.filter((item) => item.url && !existingUrls.has(item.url));
  Logger.log(
    "dataHelpers",
    `Found ${newItems.length} new items to import (${importedData.length - newItems.length} duplicates skipped)`
  );

  // Create updated history
  let updatedHistory = currentHistory;
  if (newItems.length > 0) {
    Logger.debug("dataHelpers", "Merging new items with existing history");

    // Convert currentHistory to plain objects to remove any reactive proxies
    updatedHistory = [...plainCurrentHistory, ...newItems];

    // Sort the history
    Logger.debug("dataHelpers", "Sorting merged history by timestamp");
    updatedHistory.sort(
      (a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf()
    );

    // Save to storage and update badge count
    try {
      await saveHistoryData(updatedHistory);
      Logger.log("dataHelpers", `Import complete. History saved with ${updatedHistory.length} items`);
    } catch (error) {
      Logger.error("dataHelpers", "Error saving imported data to storage:", error);
      throw new Error("Failed to save imported data to storage");
    }
  } else {
    Logger.log("dataHelpers", "No new items to import - history remains unchanged");
  }

  return {
    newItems,
    updatedHistory,
  };
}
