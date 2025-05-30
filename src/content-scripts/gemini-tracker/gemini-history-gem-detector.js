(function () {
  "use strict";

  const Utils = window.GeminiHistory_Utils;

  // Selectors for the container holding the Gem's name.
  // Using multiple selectors to adapt to different DOM structures
  const GEM_NAME_SELECTORS = [
    ".bot-info-card .bot-name-container",
    ".bot-info-container .bot-name-container",
    ".bot-name-and-description .bot-name-container",
  ];

  // Backup selectors for finding gem names in response containers
  const RESPONSE_GEM_NAME_SELECTORS = [
    ".response-container-content .bot-name .bot-name-text",
    ".response-container .bot-name-text",
    ".response-container-content .bot-name",
    // Additional fallback selectors based on the HTML structure provided
    ".bot-name-text",
    ".bot-name",
  ];

  const GemDetector = {
    /**
     * MutationObserver instance for watching DOM changes
     */
    observer: null,

    /**
     * Extracts the Gem's name from the given DOM element.
     * It tries multiple approaches to extract the name because the DOM structure might vary.
     *
     * @param {Element} element - The DOM element containing the Gem's name.
     * @returns {string|null} The trimmed Gem name, or null if not found.
     */
    getGemName: function (element) {
      if (!element) {
        return null;
      }

      // First try: Get the entire text content of the element
      const fullText = element.textContent.trim();
      if (fullText) {
        console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Extracted gem name from full text content: "${fullText}"`);
        return fullText;
      }

      // Second try: Look for direct text nodes
      for (const node of element.childNodes) {
        // Node.TEXT_NODE is type 3
        if (node.nodeType === Node.TEXT_NODE) {
          const trimmedText = node.textContent.trim();
          if (trimmedText) {
            console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Extracted gem name from direct text node: "${trimmedText}"`);
            return trimmedText;
          }
        }
      }

      // Third try: Look for any first-level elements with text content
      for (const child of element.children) {
        const childText = child.textContent.trim();
        if (childText) {
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Extracted gem name from child element: "${childText}"`);
          return childText;
        }
      }

      return null; // No suitable text found
    },

    /**
     * Extracts the Gem name directly from the DOM at the moment of calling.
     * Tries multiple selectors to adapt to different DOM structures.
     *
     * @returns {string|null} The detected gem name or null if not found
     */
    extractCurrentGemName: function () {
      // First try the primary selectors (gem info section)
      let gemNameElement = null;

      // Try each selector until we find a matching element
      for (const selector of GEM_NAME_SELECTORS) {
        gemNameElement = document.querySelector(selector);
        if (gemNameElement) {
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Found gem name element using primary selector: ${selector}`);
          break;
        }
      }

      if (gemNameElement) {
        const detectedName = this.getGemName(gemNameElement);

        if (detectedName) {
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Extracted Gem name from primary source: "${detectedName}"`);
          return detectedName;
        } else {
          console.warn(
            `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Primary gem name container found, but the name text could not be extracted as expected.`
          );

          // Log the HTML content to help with debugging
          console.debug(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Primary gem container HTML: ${gemNameElement.innerHTML}`);
        }
      }

      // If primary detection failed, try extracting from response containers
      return this.extractGemNameFromResponses();
    },

    /**
     * Backup method to extract gem name from response containers.
     * This is useful when users send prompts quickly before the gem info section loads,
     * but responses do contain the gem name.
     *
     * @returns {string|null} The detected gem name or null if not found
     */
    extractGemNameFromResponses: function () {
      let responseGemElement = null;

      // Try each response selector
      for (const selector of RESPONSE_GEM_NAME_SELECTORS) {
        // Look for all matching elements since there could be multiple responses
        const elements = document.querySelectorAll(selector);

        if (elements && elements.length > 0) {
          // Use the most recent (last) response
          responseGemElement = elements[elements.length - 1];
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Found gem name in response using selector: ${selector}`);
          break;
        }
      }

      if (responseGemElement) {
        const detectedName = this.getGemName(responseGemElement);

        if (detectedName) {
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Extracted Gem name from response: "${detectedName}"`);
          return detectedName;
        } else {
          console.warn(
            `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Response gem name container found, but the name text could not be extracted as expected.`
          );

          // Log the HTML content to help with debugging
          console.debug(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Response gem container HTML: ${responseGemElement.innerHTML}`);
        }
      }

      return null; // Gem name not found in responses either
    },

    /**
     * Note: We no longer need to observe for gem name changes since we'll extract the name when needed.
     * This method is kept for compatibility but doesn't start any observer.
     */
    startObserver: function () {
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Gem detection observer not needed with on-demand extraction approach.`);
      // No longer using an observer - we'll extract the gem name when needed
    },

    /**
     * Resets the gem detector state.
     * Should be called when navigating to a different page/state.
     */
    reset: function () {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
        console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Gem detection observer reset.`);
      }
    },

    /**
     * Gets the current gem information by extracting it at the moment this function is called.
     * This ensures we always have the most up-to-date gem information.
     *
     * @returns {Object|null} Object with gemId and gemName if on a gem page, null otherwise
     */
    getCurrentGemInfo: function () {
      const url = window.location.href;
      const gemId = Utils.extractGemId(url);

      if (gemId) {
        // Extract the gem name at the moment it's needed, not relying on stored state
        const gemName = this.extractCurrentGemName();

        const gemInfo = {
          gemId: gemId,
          gemName: gemName,
          gemUrl: `https://gemini.google.com/gem/${gemId}`,
        };

        // If name couldn't be extracted, try the debug scan
        if (!gemName) {
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Gem name could not be extracted, performing debug scan`);
          this.debugGemDetection();
        }

        return gemInfo;
      }

      return null;
    },

    /**
     * Debug function to help diagnose gem detection issues.
     * Logs detailed information about potential gem name elements.
     */
    debugGemDetection: function () {
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Running gem detection debug scan...`);

      // Try all selectors and log what we find
      for (const selector of GEM_NAME_SELECTORS) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Found element matching selector: ${selector}`);
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Element textContent: "${element.textContent.trim()}"`);
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Element innerHTML: ${element.innerHTML}`);

          // Manually check for the name using various methods
          for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent.trim();
              if (text) {
                console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Direct text node found: "${text}"`);
              }
            }
          }

          // Try to extract using our method
          const extractedName = this.getGemName(element);
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Extraction result: ${extractedName || "No name extracted"}`);
        } else {
          console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] No element found for selector: ${selector}`);
        }
      }

      // Look for potential bot name containers with different selectors
      const potentialContainers = document.querySelectorAll("[class*='bot-name'], [class*='name-container']");
      console.log(
        `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Found ${potentialContainers.length} potential name containers with alternative selectors`
      );

      for (let i = 0; i < Math.min(potentialContainers.length, 5); i++) {
        const container = potentialContainers[i];
        console.log(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Alternative container ${i + 1} class: ${container.className}`);
        console.log(
          `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Alternative container ${i + 1} text: "${container.textContent.trim()}"`
        );
      }
    },
  };

  window.GeminiHistory_GemDetector = GemDetector;
})();
