(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const StatusIndicator = window.GeminiHistory_StatusIndicator;
  const STATE = window.GeminiHistory_STATE;
  const Utils = window.GeminiHistory_Utils;
  const InputExtractor = window.GeminiHistory_InputExtractor;
  const HistoryManager = window.GeminiHistory_HistoryManager;

  const DomObserver = {
    /**
     * Helper function to disconnect an observer and set its reference to null.
     *
     * @param {MutationObserver} observer - The observer to disconnect
     * @returns {null} - Always returns null to clear the reference
     */
    cleanupObserver: function (observer) {
      if (observer) {
        observer.disconnect();
        return null;
      }
      return observer;
    },

    /**
     * Watches for the sidebar element to appear in the DOM.
     * Calls the provided callback once the sidebar is found.
     *
     * @param {function} callback - Function to call once the sidebar is found
     */
    watchForSidebar: function (callback) {
      Logger.log("gemini-tracker", "Starting to watch for sidebar element...");
      // Show immediate loading status at the beginning
      StatusIndicator.show("Looking for Gemini sidebar...", "loading", 0);

      // First check if the sidebar already exists
      const sidebarSelector = 'conversations-list[data-test-id="all-conversations"]';
      const existingSidebar = document.querySelector(sidebarSelector);

      if (existingSidebar) {
        Logger.log("gemini-tracker", "Sidebar already exists in DOM");
        callback(existingSidebar);
        return;
      }

      // If not, set up an observer to watch for it
      Logger.log("gemini-tracker", "Sidebar not found. Setting up observer to watch for it...");

      const observer = new MutationObserver((mutations, obs) => {
        const sidebar = document.querySelector(sidebarSelector);
        if (sidebar) {
          Logger.log("gemini-tracker", "Sidebar element found in DOM");
          obs.disconnect(); // Stop observing once found
          callback(sidebar);
        }
      });

      // Start observing document body for the sidebar element
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Set a timeout for the case when the sidebar doesn't appear
      setTimeout(() => {
        if (observer) {
          const sidebar = document.querySelector(sidebarSelector);
          if (!sidebar) {
            Logger.warn("gemini-tracker", "Sidebar element not found after timeout");
            StatusIndicator.show("Warning: Gemini sidebar not detected", "warning", 0);
          }
          observer.disconnect();
        }
      }, 10000); // 10 second timeout
    },

    /**
     * Checks if the Gemini sidebar is currently collapsed.
     * @returns {boolean} True if sidebar is collapsed, false otherwise.
     */
    isSidebarCollapsed: function () {
      const sidebarContainer = document.querySelector(".sidenav-with-history-container");
      return !!(sidebarContainer && sidebarContainer.classList.contains("collapsed"));
    },

    /**
     * Extracts the title from a sidebar conversation item.
     *
     * If the sidebar is collapsed, applies special logic:
     *   - Waits for the initial title update.
     *   - If the title matches the user's prompt (placeholder), sets up a MutationObserver to watch for the next title change.
     *   - Uses the new title once it changes.
     *
     * @param {Element} conversationItem - The DOM element representing a conversation item
     * @returns {string|null} - The extracted title or null if not found
     */
    extractTitleFromSidebarItem: function (conversationItem) {
      Logger.log("gemini-tracker", "Attempting to extract title from sidebar item:", conversationItem);

      const titleElement = conversationItem.querySelector(".conversation-title");
      if (!titleElement) {
        Logger.warn("gemini-tracker", "Could not find title element (.conversation-title).");
        return null;
      }
      Logger.log("gemini-tracker", "Found title container element:", titleElement);

      // Special logic for collapsed sidebar - execute first
      if (this.isSidebarCollapsed()) {
        Logger.log("gemini-tracker", "Sidebar is collapsed. Setting up observer to wait for real title...");
        const placeholderPrompt = STATE.pendingPrompt;
        // Try direct text node
        let currentTitle = "";
        try {
          const first = titleElement.firstChild;
          if (first && first.nodeType === Node.TEXT_NODE) {
            currentTitle = first.textContent.trim();
          } else {
            currentTitle = titleElement.textContent.trim();
          }
        } catch (e) {
          Logger.error("gemini-tracker", "Error during title extraction (collapsed mode):", e);
          return null;
        }

        // If we have a placeholder prompt and the current title is different AND non-empty, return it
        if (currentTitle && placeholderPrompt && currentTitle !== placeholderPrompt) {
          Logger.log("gemini-tracker", `Collapsed sidebar: Extracted real title: "${currentTitle}"`);
          return currentTitle;
        }

        // Otherwise, always return null to trigger the secondary observer setup
        Logger.log(
          "gemini-tracker",
          `Collapsed sidebar: Current title "${currentTitle}" is placeholder or empty. Will wait for real title...`
        );
        return null; // Signal to set up secondary observer
      }

      // Regular extraction logic - visibility check and normal processing
      if (conversationItem.offsetParent === null) {
        Logger.log("Conversation item not visible (hidden). Skipping title extraction.");
        return null;
      }

      Logger.log("gemini-tracker", "Sidebar is not collapsed. Proceeding with normal extraction logic...");

      // Normal extraction logic (sidebar not collapsed)
      try {
        // Try direct text node
        const first = titleElement.firstChild;
        if (first && first.nodeType === Node.TEXT_NODE) {
          const t = first.textContent.trim();
          if (t) {
            Logger.log("gemini-tracker", `Extracted via text node: "${t}"`);
            return t;
          }
          Logger.warn("gemini-tracker", "Text node was empty, falling back.");
        }
        // FALLBACK: full textContent
        const full = titleElement.textContent.trim();
        if (full) {
          Logger.log("gemini-tracker", `Fallback textContent: "${full}"`);
          return full;
        }
        Logger.warn("gemini-tracker", "titleElement.textContent was empty or whitespace.");
      } catch (e) {
        Logger.error("gemini-tracker", "Error during title extraction:", e);
      }
      return null;
    },

    /**
     * Finds a conversation item in a mutation list.
     *
     * @param {MutationRecord[]} mutationsList - List of mutation records from MutationObserver
     * @returns {Element|null} - The found conversation item element or null if not found
     */
    findConversationItemInMutations: function (mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              node.classList.contains("conversation-items-container")
            ) {
              const conversationItem = node.querySelector('div[data-test-id="conversation"]');
              if (conversationItem) {
                return conversationItem;
              }
            }
          }
        }
      }
      return null;
    },

    /**
     * Captures context information for a new conversation.
     * Retrieves current state information to associate with a new chat.
     *
     * @returns {Object} - Object containing context details for the conversation
     */
    captureConversationContext: function () {
      const accountInfo = InputExtractor.getAccountInfo();

      return {
        timestamp: Utils.getCurrentTimestamp(),
        url: window.location.href,
        model: STATE.pendingModelName,
        prompt: STATE.pendingPrompt,
        attachedFiles: STATE.pendingAttachedFiles,
        accountName: accountInfo.name,
        accountEmail: accountInfo.email,
        geminiPlan: STATE.pendingGeminiPlan,
        gemId: STATE.pendingGemId,
        gemName: STATE.pendingGemName,
        gemUrl: STATE.pendingGemUrl,
      };
    },

    /**
     * Handles the processing of mutations for the sidebar observer.
     *
     * @param {MutationRecord[]} mutationsList - List of mutation records from MutationObserver
     * @returns {boolean} - True if processing was completed, false otherwise
     */
    processSidebarMutations: function (mutationsList) {
      Logger.log(
        "gemini-tracker",
        `MAIN Sidebar Observer Callback Triggered. ${mutationsList.length} mutations.`
      );
      const currentUrl = window.location.href;
      Logger.log("gemini-tracker", `Current URL inside MAIN observer: ${currentUrl}`);

      if (!Utils.isValidChatUrl(currentUrl)) {
        Logger.log(
          "gemini-tracker",
          `URL "${currentUrl}" does not match the expected chat pattern. Waiting...`
        );
        return false; // URL still not a valid chat URL
      }

      Logger.log(
        "URL check passed (matches chat pattern). Processing mutations to find NEW conversation item..."
      );

      if (!STATE.isNewChatPending) {
        Logger.log("gemini-tracker", "No new chat is pending. Ignoring mutations.");
        return false;
      }

      const conversationItem = this.findConversationItemInMutations(mutationsList);
      if (conversationItem) {
        Logger.log("gemini-tracker", "Found NEW conversation item container. Preparing to wait for title...");
        StatusIndicator.show("New chat detected, capturing details...", "loading", 0);

        // Capture context before disconnecting observer
        const context = this.captureConversationContext();

        // Stage 1 Complete: Found the Item - Disconnect the MAIN observer
        STATE.sidebarObserver = this.cleanupObserver(STATE.sidebarObserver);

        // Clear pending flags
        STATE.isNewChatPending = false;
        STATE.pendingModelName = null;
        STATE.pendingPrompt = null;
        STATE.pendingAttachedFiles = [];
        STATE.pendingAccountName = null;
        STATE.pendingAccountEmail = null;
        // We don't clear Gem-related state here since we still need it for the history entry
        Logger.log(
          "gemini-tracker",
          `Cleared pending flags. Waiting for title associated with URL: ${context.url}`
        );

        // Stage 2: Wait for the Title
        this.observeTitleForItem(
          conversationItem,
          context.url,
          context.timestamp,
          context.model,
          context.prompt,
          context.attachedFiles,
          context.accountName,
          context.accountEmail
        );
        return true;
      }

      return false;
    },

    /**
     * Sets up observation of the sidebar to detect new chats.
     */
    observeSidebarForNewChat: function () {
      const targetSelector = 'conversations-list[data-test-id="all-conversations"]';
      const conversationListElement = document.querySelector(targetSelector);

      if (!conversationListElement) {
        Logger.warn(
          "gemini-tracker",
          `Could not find conversation list element ("${targetSelector}") to observe. Aborting observation setup.`
        );
        StatusIndicator.show("Could not track chat (UI element not found)", "warning");
        STATE.isNewChatPending = false; // Reset flag
        STATE.pendingModelName = null;
        STATE.pendingPrompt = null;
        STATE.pendingAttachedFiles = [];
        STATE.pendingAccountName = null;
        STATE.pendingAccountEmail = null;
        STATE.pendingGemId = null;
        STATE.pendingGemName = null;
        STATE.pendingGemUrl = null;
        return;
      }

      Logger.log("gemini-tracker", "Found conversation list element. Setting up MAIN sidebar observer...");
      StatusIndicator.show("Tracking new chat...", "info");

      // Disconnect previous observers if they exist
      STATE.sidebarObserver = this.cleanupObserver(STATE.sidebarObserver);
      STATE.titleObserver = this.cleanupObserver(STATE.titleObserver);

      STATE.sidebarObserver = new MutationObserver((mutationsList) => {
        this.processSidebarMutations(mutationsList);
      });

      STATE.sidebarObserver.observe(conversationListElement, {
        childList: true,
        subtree: true,
      });
      Logger.log("MAIN sidebar observer is now active.");
    },

    /**
     * Helper function to process title and add history entry.
     *
     * @param {string} title - The extracted title
     * @param {string} expectedUrl - The URL associated with this conversation
     * @param {string} timestamp - ISO-formatted timestamp for the chat
     * @param {string} model - Model name used for the chat
     * @param {string} prompt - User prompt text
     * @param {Array} attachedFiles - Array of attached filenames
     * @param {string} accountName - Name of the user account
     * @param {string} accountEmail - Email of the user account
     * @returns {boolean} - True if title was found and entry was added, false otherwise
     */
    processTitleAndAddHistory: async function (
      title,
      expectedUrl,
      timestamp,
      model,
      prompt,
      attachedFiles,
      accountName,
      accountEmail
    ) {
      if (title) {
        Logger.log("gemini-tracker", `Title found for ${expectedUrl}! Attempting to add history entry.`);
        StatusIndicator.update(`Found chat title: "${title}"`, "success", 0);
        STATE.titleObserver = this.cleanupObserver(STATE.titleObserver);

        // Get the Gemini Plan from the state
        const geminiPlan = STATE.pendingGeminiPlan;
        Logger.log("gemini-tracker", `Using Gemini plan: ${geminiPlan || "Unknown"}`);

        // Get Gem information from the state
        const gemId = STATE.pendingGemId;
        let gemName = STATE.pendingGemName;
        const gemUrl = STATE.pendingGemUrl;

        // If this is a gem chat but we don't have the name yet, try to extract it from response containers
        // This helps when the user sent a prompt before the gem name was initially detected
        if (gemId && !gemName) {
          const GemDetector = window.GeminiHistory_GemDetector;
          if (GemDetector && typeof GemDetector.extractGemNameFromResponses === "function") {
            Logger.log(
              "gemini-tracker",
              "No gem name was detected earlier. Attempting to extract from response containers..."
            );
            // Try to extract the gem name from response containers which appear after responses are completed
            const extractedName = GemDetector.extractGemNameFromResponses();
            if (extractedName) {
              gemName = extractedName;
              STATE.pendingGemName = extractedName;
              Logger.log(
                "gemini-tracker",
                `Successfully extracted gem name "${gemName}" from response container`
              );
            }
          }
        }

        if (gemId) {
          Logger.log(
            "gemini-tracker",
            `Including Gem info - ID: ${gemId}, Name: ${gemName || "Not detected"}`
          );
        }

        const success = await HistoryManager.addHistoryEntry(
          timestamp,
          expectedUrl,
          title,
          model,
          prompt,
          attachedFiles,
          accountName,
          accountEmail,
          geminiPlan,
          gemId,
          gemName,
          gemUrl
        );

        if (!success) {
          StatusIndicator.update("Chat not saved (already exists or invalid)", "info");
        }

        return true;
      }
      return false;
    },

    /**
     * Process mutations for title changes.
     *
     * @param {Element} conversationItem - The conversation item DOM element
     * @param {string} expectedUrl - The URL associated with this conversation
     * @param {string} timestamp - ISO-formatted timestamp for the chat
     * @param {string} model - Model name used for the chat
     * @param {string} prompt - User prompt text
     * @param {Array} attachedFiles - Array of attached filenames
     * @param {string} accountName - Name of the user account
     * @param {string} accountEmail - Email of the user account
     * @returns {Promise<boolean>} - Promise resolving to true if processing completed (URL changed or title found), false otherwise
     */
    processTitleMutations: async function (
      conversationItem,
      expectedUrl,
      timestamp,
      model,
      prompt,
      attachedFiles,
      accountName,
      accountEmail
    ) {
      // Abort if URL changed
      if (window.location.href !== expectedUrl) {
        Logger.warn("gemini-tracker", "URL changed; disconnecting TITLE observer.");
        STATE.titleObserver = this.cleanupObserver(STATE.titleObserver);
        return true;
      }

      // Extract title and process if found
      const title = this.extractTitleFromSidebarItem(conversationItem);
      const geminiPlan = STATE.pendingGeminiPlan;
      if (
        await this.processTitleAndAddHistory(
          title,
          expectedUrl,
          timestamp,
          model,
          prompt,
          attachedFiles,
          accountName,
          accountEmail,
          geminiPlan
        )
      ) {
        return true;
      }

      Logger.log("gemini-tracker", "No title yet; continuing to observe...");
      return false;
    },

    /**
     * Sets up observation of a specific conversation item to capture its title once available.
     *
     * @param {Element} conversationItem - The conversation item DOM element
     * @param {string} expectedUrl - The URL associated with this conversation
     * @param {string} timestamp - ISO-formatted timestamp for the chat
     * @param {string} model - Model name used for the chat
     * @param {string} prompt - User prompt text
     * @param {Array} attachedFiles - Array of attached filenames
     * @param {string} accountName - Name of the user account
     * @param {string} accountEmail - Email of the user account
     */
    observeTitleForItem: function (
      conversationItem,
      expectedUrl,
      timestamp,
      model,
      prompt,
      attachedFiles,
      accountName,
      accountEmail
    ) {
      // Initial check
      this.attemptTitleCaptureAndSave(
        conversationItem,
        expectedUrl,
        timestamp,
        model,
        prompt,
        attachedFiles,
        accountName,
        accountEmail
      ).then((result) => {
        if (result) {
          return;
        }

        // Enhanced observer for collapsed sidebar placeholder logic
        STATE.titleObserver = new MutationObserver(() => {
          const titleElement = conversationItem.querySelector(".conversation-title");
          if (DomObserver.isSidebarCollapsed() && titleElement) {
            const currentTitle = titleElement.textContent.trim();
            const placeholderPrompt = STATE.pendingPrompt;

            // Set up secondary observer if we detect placeholder or empty title
            if (!currentTitle || (placeholderPrompt && currentTitle === placeholderPrompt)) {
              if (!STATE.secondaryTitleObserver) {
                Logger.log(
                  "gemini-tracker",
                  "Setting up secondary observer to wait for real title change..."
                );

                // Capture the current title state to compare against
                const titleToWaitFor = currentTitle || "";

                STATE.secondaryTitleObserver = new MutationObserver(() => {
                  const newTitle = titleElement.textContent.trim();

                  // Real title found: non-empty AND different from placeholder AND different from what we were waiting for
                  if (
                    newTitle &&
                    (!placeholderPrompt || newTitle !== placeholderPrompt) &&
                    newTitle !== titleToWaitFor
                  ) {
                    Logger.log("gemini-tracker", `Secondary observer: Real title detected: "${newTitle}"`);
                    // Clean up observers
                    STATE.secondaryTitleObserver.disconnect();
                    STATE.secondaryTitleObserver = null;
                    STATE.titleObserver.disconnect();
                    STATE.titleObserver = null;
                    // Continue with chat data extraction as usual
                    DomObserver.processTitleAndAddHistory(
                      newTitle,
                      expectedUrl,
                      timestamp,
                      model,
                      prompt,
                      attachedFiles,
                      accountName,
                      accountEmail
                    );
                  }
                });
                STATE.secondaryTitleObserver.observe(titleElement, {
                  childList: true,
                  characterData: true,
                  subtree: true,
                });
              }
              return; // Keep waiting
            } else {
              // We have a title that's different from placeholder, use it
              Logger.log("gemini-tracker", `Collapsed sidebar: Found real title: "${currentTitle}"`);
              STATE.titleObserver.disconnect();
              STATE.titleObserver = null;
              DomObserver.processTitleAndAddHistory(
                currentTitle,
                expectedUrl,
                timestamp,
                model,
                prompt,
                attachedFiles,
                accountName,
                accountEmail
              );
              return;
            }
          }

          // Normal processing for non-collapsed sidebar
          DomObserver.processTitleMutations(
            conversationItem,
            expectedUrl,
            timestamp,
            model,
            prompt,
            attachedFiles,
            accountName,
            accountEmail
          );
        });

        STATE.titleObserver.observe(conversationItem, {
          childList: true,
          attributes: true,
          characterData: true,
          subtree: true,
          attributeOldValue: true,
        });
        Logger.log("gemini-tracker", `TITLE observer active for URL: ${expectedUrl}`);
      });
    },

    /**
     * Attempts to capture the title and save the history entry if successful.
     *
     * @param {Element} item - The conversation item DOM element
     * @param {string} expectedUrl - The URL associated with this conversation
     * @param {string} timestamp - ISO-formatted timestamp for the chat
     * @param {string} model - Model name used for the chat
     * @param {string} prompt - User prompt text
     * @param {Array} attachedFiles - Array of attached filenames
     * @param {string} accountName - Name of the user account
     * @param {string} accountEmail - Email of the user account
     * @returns {Promise<boolean>} - Promise resolving to true if title was found and entry was added, false otherwise
     */
    attemptTitleCaptureAndSave: async function (
      item,
      expectedUrl,
      timestamp,
      model,
      prompt,
      attachedFiles,
      accountName,
      accountEmail
    ) {
      // Check if we are still on the page this observer was created for
      if (window.location.href !== expectedUrl) {
        Logger.warn(
          "gemini-tracker",
          `URL changed from "${expectedUrl}" to "${window.location.href}" while waiting for title. Disconnecting TITLE observer.`
        );
        STATE.titleObserver = this.cleanupObserver(STATE.titleObserver);
        return true; // Return true to indicate we should stop trying (observer is disconnected)
      }

      const title = this.extractTitleFromSidebarItem(item);
      Logger.log("gemini-tracker", `TITLE Check (URL: ${expectedUrl}): Extracted title: "${title}"`);

      // Get the Gemini Plan from the state
      const geminiPlan = STATE.pendingGeminiPlan;
      Logger.log("gemini-tracker", `Using Gemini plan: ${geminiPlan || "Unknown"}`);

      return await this.processTitleAndAddHistory(
        title,
        expectedUrl,
        timestamp,
        model,
        prompt,
        attachedFiles,
        accountName,
        accountEmail
      );
    },
  };

  window.GeminiHistory_DomObserver = DomObserver;
})();
