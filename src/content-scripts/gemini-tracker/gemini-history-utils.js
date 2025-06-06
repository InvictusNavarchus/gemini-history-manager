(function () {
  "use strict";

  const CONFIG = window.GeminiHistory_CONFIG;

  const Utils = {
    /**
     * Gets a formatted prefix for console logging.
     *
     * @returns {string} - Formatted prefix with time and tracker name: [HH:MM:SS] [gemini-tracker]
     */
    getPrefix: function () {
      return `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker]`;
    },

    /**
     * Gets the current timestamp in ISO 8601 UTC format.
     *
     * @returns {string} - Formatted timestamp string in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)
     */
    getCurrentTimestamp: function () {
      try {
        return new Date().toISOString(); // Returns ISO 8601 format with UTC timezone
      } catch (e) {
        console.error(`${Utils.getPrefix()} Error getting ISO UTC timestamp:`, e);
        return new Date().toISOString(); // Same fallback since it's the primary method
      }
    },

    /**
     * Determines if a URL is a valid Gemini chat URL.
     * Valid URLs follow the pattern: https://gemini.google.com/app/[hexadecimal-id]
     * or https://gemini.google.com/gem/[gem_id]/[hexadecimal-id]
     * or https://gemini.google.com/u/[n]/app/[hexadecimal-id]
     * or https://gemini.google.com/u/[n]/gem/[gem_id]/[hexadecimal-id]
     * and may optionally include query parameters.
     *
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL matches the expected pattern for a Gemini chat
     */
    isValidChatUrl: function (url) {
      const regularChatUrlPattern = /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/app\/[a-f0-9]+(\?.*)?$/;
      const gemChatUrlPattern =
        /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/gem\/[a-f0-9]+\/[a-f0-9]+(\?.*)?$/;
      return regularChatUrlPattern.test(url) || gemChatUrlPattern.test(url);
    },

    /**
     * Determines if a URL is a Gem chat URL.
     * Valid Gem chat URLs follow the pattern: https://gemini.google.com/gem/[gem_id]/[hexadecimal-id]
     * or https://gemini.google.com/u/[n]/gem/[gem_id]/[hexadecimal-id]
     *
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL matches the expected pattern for a Gem chat
     */
    isGemChatUrl: function (url) {
      const gemChatUrlPattern =
        /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/gem\/[a-f0-9]+\/[a-f0-9]+(\?.*)?$/;
      return gemChatUrlPattern.test(url);
    },

    /**
     * Determines if a URL is a Gem homepage URL.
     * Valid Gem homepage URLs follow the pattern: https://gemini.google.com/gem/[gem_id]
     * or https://gemini.google.com/u/[n]/gem/[gem_id]
     *
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL matches the expected pattern for a Gem homepage
     */
    isGemHomepageUrl: function (url) {
      const gemHomepagePattern = /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/gem\/[a-f0-9]+(\?.*)?$/;
      return gemHomepagePattern.test(url);
    },

    /**
     * Extracts the Gem ID from a Gem URL.
     *
     * @param {string} url - The URL to extract from
     * @returns {string|null} - The Gem ID or null if not a Gem URL
     */
    extractGemId: function (url) {
      if (!url) return null;

      const gemUrlRegex = /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/gem\/([a-f0-9]+)/;
      const match = url.match(gemUrlRegex);

      if (match && match[2]) {
        return match[2];
      }

      return null;
    },

    /**
     * Determines if a URL is the base Gemini app URL (with potential parameters).
     * The base URL is used for starting new chats.
     * Also supports the /u/[n]/ pattern for multiple Google accounts.
     *
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL is the base app URL (with or without parameters)
     */
    isBaseAppUrl: function (url) {
      // Check if URL is the base URL (with or without user account number)
      if (url === CONFIG.BASE_URL) return true;

      // Check if URL starts with base URL followed by a question mark (for parameters)
      if (url.startsWith(CONFIG.BASE_URL + "?")) return true;

      // Check for /u/[n]/ pattern
      const userAccountPattern = /^https:\/\/gemini\.google\.com\/u\/\d+\/app(\?.*)?$/;
      return userAccountPattern.test(url);
    },

    /**
     * Determines if a URL transition represents new chat creation that should preserve observers.
     * This helps distinguish between navigation away from chat context vs. new chat creation.
     *
     * @param {string} fromUrl - The previous URL
     * @param {string} toUrl - The current URL
     * @returns {boolean} - True if this transition should preserve observers for chat detection
     */
    isNewChatTransition: function (fromUrl, toUrl) {
      // Regular new chat: base app URL -> chat URL
      const isRegularNewChat =
        this.isBaseAppUrl(fromUrl) && this.isValidChatUrl(toUrl) && !this.isGemChatUrl(toUrl);

      // Gem new chat: gem homepage -> gem chat with same gem ID
      const isGemNewChat =
        this.isGemHomepageUrl(fromUrl) &&
        this.isGemChatUrl(toUrl) &&
        this.extractGemId(fromUrl) === this.extractGemId(toUrl);

      return isRegularNewChat || isGemNewChat;
    },

    /**
     * Normalizes whitespace in a string by collapsing all consecutive whitespace
     * characters (including line breaks, spaces, tabs) into single spaces and trims the result.
     * This is useful for consistent comparison of strings that may have different
     * whitespace formatting (e.g., prompts vs titles with different line break patterns).
     *
     * @param {string} str - The string to normalize
     * @returns {string} - The normalized string with collapsed whitespace
     */
    normalizeWhitespace: function (str) {
      if (!str) return "";
      return str.replace(/\s+/g, " ").trim();
    },

    /**
     * Checks if a text is a truncated version of another text by comparing
     * their normalized whitespace versions. This handles cases where line breaks
     * might be different between the original and truncated versions.
     *
     * @param {string} originalText - The original, potentially longer text
     * @param {string} truncatedText - The potentially truncated text to check
     * @returns {boolean} - True if truncatedText appears to be a truncated version of originalText
     */
    isTruncatedVersion: function (originalText, truncatedText) {
      console.log(`${Utils.getPrefix()} --- Standard isTruncatedVersion called ---`);
      console.log(`${Utils.getPrefix()} Standard originalText: "${originalText}"`);
      console.log(`${Utils.getPrefix()} Standard truncatedText: "${truncatedText}"`);

      if (!originalText || !truncatedText) {
        console.log(`${Utils.getPrefix()} Standard: Early return false - missing text`);
        return false;
      }

      const normalizedOriginal = this.normalizeWhitespace(originalText);
      const normalizedTruncated = this.normalizeWhitespace(truncatedText);

      console.log(`${Utils.getPrefix()} Standard normalized original: "${normalizedOriginal}"`);
      console.log(`${Utils.getPrefix()} Standard normalized truncated: "${normalizedTruncated}"`);

      const result = normalizedOriginal.startsWith(normalizedTruncated);
      console.log(`${Utils.getPrefix()} Standard startsWith result: ${result}`);
      console.log(`${Utils.getPrefix()} --- Standard comparison complete ---`);

      return result;
    },

    /**
     * Enhanced version of isTruncatedVersion that can handle cases where the original text
     * contains code blocks and the placeholder has been modified. This function will first
     * try to get the original prompt text for better comparison.
     *
     * @param {string} originalText - The original, potentially longer text (may be placeholder with [attached blockcode])
     * @param {string} truncatedText - The potentially truncated text to check
     * @param {string} [realOriginalText] - The actual original text without placeholders, if available
     * @returns {boolean} - True if truncatedText appears to be a truncated version of the original (should be ignored as placeholder)
     */
    isTruncatedVersionEnhanced: function (originalText, truncatedText, realOriginalText = null) {
      console.log(`${Utils.getPrefix()} === isTruncatedVersionEnhanced called ===`);
      console.log(`${Utils.getPrefix()} Input originalText: "${originalText}"`);
      console.log(`${Utils.getPrefix()} Input truncatedText: "${truncatedText}"`);
      console.log(`${Utils.getPrefix()} Input realOriginalText: "${realOriginalText}"`);

      if (!originalText || !truncatedText) {
        console.log(`${Utils.getPrefix()} Early return: missing originalText or truncatedText`);
        return false;
      }

      // If we have the real original text, use it for comparison instead of the placeholder
      if (realOriginalText && realOriginalText.trim()) {
        console.log(`${Utils.getPrefix()} Using realOriginalText for enhanced comparison`);

        const normalizedRealOriginal = this.normalizeWhitespace(realOriginalText);
        const normalizedTruncated = this.normalizeWhitespace(truncatedText);

        console.log(`${Utils.getPrefix()} Normalized realOriginal: "${normalizedRealOriginal}"`);
        console.log(`${Utils.getPrefix()} Normalized truncated: "${normalizedTruncated}"`);

        // If the real original text starts with the truncated text, then the title is a placeholder
        const startsWithResult = normalizedRealOriginal.startsWith(normalizedTruncated);
        console.log(`${Utils.getPrefix()} realOriginal.startsWith(truncated): ${startsWithResult}`);

        if (startsWithResult) {
          console.log(`${Utils.getPrefix()} DECISION: Title is a PLACEHOLDER (should be ignored)`);
        } else {
          console.log(`${Utils.getPrefix()} DECISION: Title is a REAL TITLE (should be kept)`);
        }

        console.log(`${Utils.getPrefix()} === Enhanced comparison complete ===`);
        return startsWithResult;
      }

      // Fallback to the standard comparison
      console.log(`${Utils.getPrefix()} No realOriginalText available, falling back to standard comparison`);
      const standardResult = this.isTruncatedVersion(originalText, truncatedText);
      console.log(`${Utils.getPrefix()} Standard comparison result: ${standardResult}`);
      console.log(`${Utils.getPrefix()} === Fallback comparison complete ===`);

      return standardResult;
    },

    /**
     * Parses text and replaces codeblocks with placeholders while preserving non-codeblock text.
     * Handles multiple codeblocks and nested backticks within codeblocks.
     * Uses regex-based parsing for improved performance and correct newline handling.
     *
     * @param {string} text - The text to process
     * @returns {Object} - Object with processedText, hasCodeblocks, and codeblockCount properties
     */
    processCodeblocks: function (text) {
      if (!text) {
        return { processedText: "", hasCodeblocks: false, codeblockCount: 0 };
      }

      // Global regex to find all codeblocks with proper opening and closing patterns
      // This handles \r\n sequences correctly and validates proper markdown structure
      const codeblockRegex = /^```[^\r\n]*(?:\r\n|\r|\n)([\s\S]*?)^```\s*$/gm;

      let hasCodeblocks = false;
      let codeblockCount = 0;
      let lastIndex = 0;
      const result = [];
      let match;

      // Use regex.exec() in a loop to process all matches while maintaining position tracking
      while ((match = codeblockRegex.exec(text)) !== null) {
        hasCodeblocks = true;
        codeblockCount++;

        // Add text before this codeblock
        result.push(text.substring(lastIndex, match.index));

        // Add placeholder for the codeblock
        result.push(`[codeblock-${codeblockCount}]`);

        // Update position tracking
        lastIndex = match.index + match[0].length;

        console.log(
          `${this.getPrefix()} Found codeblock ${codeblockCount} from position ${match.index} to ${lastIndex}`
        );
      }

      // Add any remaining text after the last codeblock
      if (lastIndex < text.length) {
        result.push(text.substring(lastIndex));
      }

      const processedText = result.join("").trim();
      console.log(
        `${this.getPrefix()} Processed ${codeblockCount} codeblock(s). Final text: "${processedText}"`
      );

      return {
        processedText,
        hasCodeblocks,
        codeblockCount,
      };
    },
  };

  window.GeminiHistory_Utils = Utils;
})();
