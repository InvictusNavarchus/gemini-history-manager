/**
 * Gemini History Manager - Search Helpers
 * Functions for advanced search capabilities using MiniSearch
 */
import MiniSearch from 'minisearch';
import { Logger } from "../../lib/utils.js";

// Fields to be indexed for search
const SEARCH_FIELDS = [
  { name: 'title', weight: 2 }, // Title has higher weight
  { name: 'prompt', weight: 1 },
  { name: 'model', weight: 0.5 },
  { name: 'geminiPlan', weight: 0.5 },
  { name: 'gemName', weight: 0.5 }
];

// Configure MiniSearch options
const MINI_SEARCH_OPTIONS = {
  fields: SEARCH_FIELDS.map(field => field.name),
  storeFields: ['id', 'title', 'model', 'geminiPlan', 'timestamp'], // Fields to return in search results
  searchOptions: {
    boost: Object.fromEntries(SEARCH_FIELDS.map(field => [field.name, field.weight])),
    fuzzy: 0.2, // Enable fuzzy search with a small distance
    prefix: true, // Match by prefix
  },
  // Ensure we don't break on missing fields
  extractField: (document, fieldName) => {
    return document[fieldName] || '';
  }
};

/**
 * Initialize a MiniSearch instance with the history data
 * @param {Array} historyData - The history data array to index
 * @returns {MiniSearch} A configured MiniSearch instance
 */
export function createSearchIndex(historyData) {
  Logger.log("searchHelpers", `Creating search index for ${historyData.length} history entries`);
  
  // Add a unique ID to each history entry if it doesn't have one
  // This is required by MiniSearch
  const indexableData = historyData.map((item, index) => ({
    ...item,
    id: item.id || `history-${index}`
  }));
  
  // Create a new MiniSearch instance
  const miniSearch = new MiniSearch(MINI_SEARCH_OPTIONS);
  
  // Add all documents to the index
  miniSearch.addAll(indexableData);
  
  Logger.debug("searchHelpers", `Search index created with ${indexableData.length} documents`);
  return miniSearch;
}

/**
 * Search for history entries using MiniSearch
 * @param {MiniSearch} searchIndex - The MiniSearch instance
 * @param {string} query - The search query
 * @returns {Array} - Array of history entries that match the search
 * @param {Array} allHistory - Complete history array (for retrieving full entries)
 */
export function searchHistory(searchIndex, query, allHistory) {
  if (!query || query.trim() === '') {
    Logger.debug("searchHelpers", "Empty search query, returning all history");
    return allHistory;
  }
  
  Logger.log("searchHelpers", `Searching for "${query}"`);
  
  try {
    // Perform the search
    const searchResults = searchIndex.search(query);
    Logger.debug("searchHelpers", `Found ${searchResults.length} results`);
    
    // Map search results back to original history entries
    // We need to do this to maintain the complete object structure
    const resultMap = new Map(searchResults.map(result => [result.id, result]));
    const matchedEntries = allHistory.filter(entry => {
      const entryId = entry.id || '';
      return resultMap.has(entryId);
    });
    
    // If we didn't find exact matches by ID, try to find by content similarity
    // This is a fallback for entries without IDs or older entries
    if (matchedEntries.length === 0) {
      Logger.debug("searchHelpers", "No exact ID matches, falling back to content matching");
      
      // Simple fallback to the old behavior if we can't match by ID
      const searchLower = query.toLowerCase();
      return allHistory.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.prompt && item.prompt.toLowerCase().includes(searchLower))
      );
    }
    
    return matchedEntries;
  } catch (error) {
    Logger.error("searchHelpers", "Error during search:", error);
    
    // Fallback to simple search on error
    const searchLower = query.toLowerCase();
    return allHistory.filter(
      (item) =>
        (item.title && item.title.toLowerCase().includes(searchLower)) ||
        (item.prompt && item.prompt.toLowerCase().includes(searchLower))
    );
  }
}
