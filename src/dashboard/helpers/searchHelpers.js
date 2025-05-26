/**
 * Gemini History Manager - Search Helpers
 * Functions for advanced search capabilities using MiniSearch
 */
import MiniSearch from "minisearch";
import { Logger } from "../../lib/utils.js";

/**
 * Fields to be indexed for search in MiniSearch.
 * Each field has a name and a weight for boosting relevance.
 * @type {Array<{name: string, weight: number}>}
 */
const SEARCH_FIELDS = [
  { name: "title", weight: 2 }, // Title has higher weight
  { name: "prompt", weight: 1 },
];

/**
 * Configuration options for MiniSearch instance.
 * - fields: Which fields to index for searching.
 * - storeFields: Which fields to return in search results.
 * - searchOptions: Search behavior (boosting, fuzzy, prefix).
 * - extractField: Handles missing fields gracefully.
 * @type {Object}
 */
const MINI_SEARCH_OPTIONS = {
  fields: SEARCH_FIELDS.map((field) => field.name),
  storeFields: ["id", "title", "timestamp"], // Fields to return in search results
  searchOptions: {
    boost: Object.fromEntries(SEARCH_FIELDS.map((field) => [field.name, field.weight])),
    fuzzy: 0.2, // Enable fuzzy search with a small distance
    prefix: true, // Match by prefix
  },
  // Ensure we don't break on missing fields
  extractField: (document, fieldName) => {
    return document[fieldName] || "";
  },
};

/**
 * Initializes and returns a MiniSearch instance with the provided history data.
 * Adds unique IDs to entries if missing (required by MiniSearch),
 * configures search fields and boosting, and indexes all documents.
 *
 * @param {Array<Object>} historyData - The history data array to index. Each object should represent a conversation or entry.
 * @returns {MiniSearch} A configured MiniSearch instance with all documents indexed.
 */
export function createSearchIndex(historyData) {
  Logger.log("searchHelpers", `Creating search index for ${historyData.length} history entries`);

  // Add a unique ID to each history entry if it doesn't have one
  // This is required by MiniSearch
  const indexableData = historyData.map((item, index) => ({
    ...item,
    id: item.id || `history-${index}`,
  }));

  // Create a new MiniSearch instance
  const miniSearch = new MiniSearch(MINI_SEARCH_OPTIONS);

  // Add all documents to the index
  miniSearch.addAll(indexableData);

  Logger.debug("searchHelpers", `Search index created with ${indexableData.length} documents`);
  return miniSearch;
}

/**
 * Searches for history entries using a MiniSearch index and a query string.
 * Returns matching history entries, using ID-based lookup for accuracy and
 * falling back to content similarity if no matches by ID are found.
 * Handles errors gracefully and logs search process.
 *
 * @param {MiniSearch} searchIndex - The MiniSearch instance to use for searching.
 * @param {string} query - The search query string.
 * @param {Array<Object>} allHistory - The complete array of history entries (for retrieving full entry data).
 * @returns {Array<Object>} Array of history entries that match the search query.
 */
export function searchHistory(searchIndex, query, allHistory, highlight = false) {
  if (!query || query.trim() === "") {
    Logger.debug("searchHelpers", "Empty search query, returning all history");
    return allHistory;
  }

  Logger.log("searchHelpers", `Searching for "${query}"`);

  try {
    // Perform the search with highlighting if requested
    const searchOptions = highlight
      ? { ...MINI_SEARCH_OPTIONS.searchOptions, highlight: true }
      : MINI_SEARCH_OPTIONS.searchOptions;
    const searchResults = searchIndex.search(query, searchOptions);
    Logger.debug(
      "searchHelpers",
      `Found ${searchResults.length} results${highlight ? " with highlighting" : ""}`
    );

    // Optimize: Use a Map for O(1) lookups from id to entry
    const idToEntry = new Map(allHistory.map((entry) => [entry.id || "", entry]));

    // Map results to entries and include the _matches field when highlight is enabled
    const matchedEntries = searchResults
      .map((result) => {
        const entry = idToEntry.get(result.id);
        if (!entry) return null;

        // Add matches information to the entry if highlighting is enabled
        if (highlight && result._matches) {
          entry._matches = result._matches;
        }

        return entry;
      })
      .filter(Boolean); // Remove any not found

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
