(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const Utils = window.GeminiHistory_Utils;

  // Selectors for the container holding the Gem's name.
  // Using multiple selectors to adapt to different DOM structures
  const GEM_NAME_SELECTORS = [
    ".bot-info-card .bot-name-container",
    ".bot-info-container .bot-name-container",
    ".bot-name-and-description .bot-name-container"
  ];

  const GemDetector = {
    /**
     * Currently detected gem name, if any.
     */
    currentGemName: null,

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
        Logger.log("gemini-tracker", `Extracted gem name from full text content: "${fullText}"`);
        return fullText;
      }

      // Second try: Look for direct text nodes
      for (const node of element.childNodes) {
        // Node.TEXT_NODE is type 3
        if (node.nodeType === Node.TEXT_NODE) {
          const trimmedText = node.textContent.trim();
          if (trimmedText) {
            Logger.log("gemini-tracker", `Extracted gem name from direct text node: "${trimmedText}"`);
            return trimmedText;
          }
        }
      }

      // Third try: Look for any first-level elements with text content
      for (const child of element.children) {
        const childText = child.textContent.trim();
        if (childText) {
          Logger.log("gemini-tracker", `Extracted gem name from child element: "${childText}"`);
          return childText;
        }
      }

      return null; // No suitable text found
    },

    /**
     * Checks for the Gem name element, extracts the name, and logs it.
     * If a Gem name is found, it updates the currentGemName and disconnects the observer.
     * Tries multiple selectors to adapt to different DOM structures.
     *
     * @returns {boolean} True if a Gem name was found, false otherwise.
     */
    checkForGem: function () {
      let gemNameElement = null;
      
      // Try each selector until we find a matching element
      for (const selector of GEM_NAME_SELECTORS) {
        gemNameElement = document.querySelector(selector);
        if (gemNameElement) {
          Logger.log("gemini-tracker", `Found gem name element using selector: ${selector}`);
          break;
        }
      }

      if (gemNameElement) {
        const detectedName = this.getGemName(gemNameElement);

        if (detectedName) {
          Logger.log("gemini-tracker", `Detected Gem name: "${detectedName}"`);
          this.currentGemName = detectedName;

          if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            Logger.log("gemini-tracker", "Observer disconnected after detecting Gem name.");
          }
          return true; // Gem name found
        } else {
          Logger.warn(
            "gemini-tracker",
            "Gem name container found, but the name text could not be extracted as expected."
          );
          
          // Log the HTML content to help with debugging
          Logger.debug("gemini-tracker", `Gem container HTML: ${gemNameElement.innerHTML}`);
        }
      }
      return false; // Gem name not found yet
    },

    /**
     * Initializes and starts the MutationObserver to watch for DOM changes.
     * If the Gem name is found on the initial check, the observer is not started.
     */
    startObserver: function () {
      // Perform an initial check.
      if (this.checkForGem()) {
        return; // Gem name already found and processed.
      }

      // If not found immediately, set up the MutationObserver.
      this.observer = new MutationObserver(() => {
        // On any DOM change, re-check for the Gem name.
        this.checkForGem();
      });

      // Determine a suitable root for observation.
      let observationRoot = document.querySelector("chat-window-content");
      if (!observationRoot) {
        observationRoot = document.querySelector("bots-chat-window");
      }
      if (!observationRoot) {
        observationRoot = document.body; // Fallback
        Logger.warn(
          "gemini-tracker",
          "Observing document.body for Gem detection. Could not find preferred roots. This might be less efficient."
        );
      } else {
        Logger.log("gemini-tracker", `Observing ${observationRoot.tagName.toLowerCase()} for Gem detection.`);
      }

      // Start observing the chosen root for child additions/removals and subtree modifications.
      this.observer.observe(observationRoot, { childList: true, subtree: true });
      Logger.log("gemini-tracker", "Gem detection MutationObserver started.");
    },

    /**
     * Resets the gem detector state and starts monitoring again if needed.
     * Should be called when navigating to a different page/state.
     */
    reset: function () {
      this.currentGemName = null;

      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
        Logger.log("gemini-tracker", "Gem detection observer reset.");
      }

      const url = window.location.href;
      if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
        Logger.log("gemini-tracker", "On a Gem page. Starting Gem name detection.");
        this.startObserver();
      }
    },

    /**
     * Gets the current gem information.
     *
     * @returns {Object|null} Object with gemId and gemName if on a gem page, null otherwise
     */
    getCurrentGemInfo: function () {
      const url = window.location.href;
      const gemId = Utils.extractGemId(url);

      if (gemId) {
        const gemInfo = {
          gemId: gemId,
          gemName: this.currentGemName,
          gemUrl: `https://gemini.google.com/gem/${gemId}`,
        };
        
        // Trigger a debug scan if name is not detected yet
        if (!this.currentGemName) {
          Logger.log("gemini-tracker", "Gem name not detected yet, performing debug scan");
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
    debugGemDetection: function() {
      Logger.log("gemini-tracker", "Running gem detection debug scan...");
      
      // Try all selectors and log what we find
      for (const selector of GEM_NAME_SELECTORS) {
        const element = document.querySelector(selector);
        if (element) {
          Logger.log("gemini-tracker", `Found element matching selector: ${selector}`);
          Logger.log("gemini-tracker", `Element textContent: "${element.textContent.trim()}"`);
          Logger.log("gemini-tracker", `Element innerHTML: ${element.innerHTML}`);
          
          // Manually check for the name using various methods
          for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent.trim();
              if (text) {
                Logger.log("gemini-tracker", `Direct text node found: "${text}"`);
              }
            }
          }
          
          // Try to extract using our method
          const extractedName = this.getGemName(element);
          Logger.log("gemini-tracker", `Extraction result: ${extractedName || "No name extracted"}`);
        } else {
          Logger.log("gemini-tracker", `No element found for selector: ${selector}`);
        }
      }
      
      // Look for potential bot name containers with different selectors
      const potentialContainers = document.querySelectorAll("[class*='bot-name'], [class*='name-container']");
      Logger.log("gemini-tracker", `Found ${potentialContainers.length} potential name containers with alternative selectors`);
      
      for (let i = 0; i < Math.min(potentialContainers.length, 5); i++) {
        const container = potentialContainers[i];
        Logger.log("gemini-tracker", `Alternative container ${i+1} class: ${container.className}`);
        Logger.log("gemini-tracker", `Alternative container ${i+1} text: "${container.textContent.trim()}"`);
      }
    },
  };

  window.GeminiHistory_GemDetector = GemDetector;
})();
