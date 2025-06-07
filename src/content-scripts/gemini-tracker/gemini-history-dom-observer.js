(function () {
  "use strict";

  const StatusIndicator = window.GeminiHistory_StatusIndicator;
  const STATE = window.GeminiHistory_STATE;
  const Utils = window.GeminiHistory_Utils;
  const InputExtractor = window.GeminiHistory_InputExtractor;
  const HistoryManager = window.GeminiHistory_HistoryManager;

  const DomObserver = {
    /**
     * Helper function to disconnect an observer and set its reference to null.
     * Prevents memory leaks and ensures clean state management.
     *
     * @param {MutationObserver|null} observer - The observer to disconnect
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
     * Centralized helper function to clear pending prompt context variables.
     * Handles the common subset of pending state variables that need clearing.
     *
     * @private
     */
    resetPendingPromptContext: function () {
      STATE.pendingModelName = null;
      STATE.pendingPrompt = null;
      STATE.pendingOriginalPrompt = null;
      STATE.pendingAttachedFiles = [];
      STATE.pendingAccountName = null;
      STATE.pendingAccountEmail = null;
    },

    /**
     * Centralized helper function to clear all pending state variables.
     * Used when completely aborting the new chat tracking process.
     *
     * @private
     */
    resetAllPendingState: function () {
      this.resetPendingPromptContext();
      STATE.isNewChatPending = false;
      STATE.pendingGemId = null;
      STATE.pendingGemName = null;
      STATE.pendingGemUrl = null;
      STATE.pendingGeminiPlan = null;
    },

    /**
     * Unified cleanup function that handles both observer cleanup and state reset.
     * This is the primary cleanup method that should be used in most scenarios.
     *
     * @returns {void}
     */
    completeCleanup: function () {
      console.log(`${Utils.getPrefix()} Performing complete cleanup of observers and state...`);
      this.cleanupAllObservers();
      this.resetAllPendingState();
      console.log(`${Utils.getPrefix()} Complete cleanup finished`);
    },

    /**
     * Helper function to cleanup title observers and clear the new chat pending flag.
     * Only clears the flag when both title observers are cleaned up.
     *
     * @returns {void}
     */
    cleanupTitleObservers: function () {
      const hadTitleObservers = STATE.titleObserver || STATE.secondaryTitleObserver;

      STATE.titleObserver = this.cleanupObserver(STATE.titleObserver);
      STATE.secondaryTitleObserver = this.cleanupObserver(STATE.secondaryTitleObserver);
      STATE.stopButtonObserver = this.cleanupObserver(STATE.stopButtonObserver);

      // Clear the new chat pending flag only if we had title observers
      if (hadTitleObservers && STATE.isNewChatPending) {
        STATE.isNewChatPending = false;
        console.log(`${Utils.getPrefix()} Title observers cleaned up, cleared isNewChatPending flag`);
      }
    },

    /**
     * Cleans up all active observers to prevent memory leaks.
     * Disconnects sidebar, title, and secondary title observers.
     *
     * @returns {void}
     */
    cleanupAllObservers: function () {
      console.log(`${Utils.getPrefix()} Cleaning up all DOM observers...`);

      STATE.sidebarObserver = this.cleanupObserver(STATE.sidebarObserver);
      this.cleanupTitleObservers();

      console.log(`${Utils.getPrefix()} All DOM observers cleaned up`);
    },

    /**
     * Common guard clause helper for title observer callbacks.
     * Checks for URL changes and DOM element removal conditions that should stop title observation.
     * This function combines URL validation and DOM element checks to determine if observation should continue.
     *
     * @param {string} expectedUrl - The URL this observer was created for
     * @param {Element} conversationItem - The conversation item element
     * @param {Element} [titleElement] - Optional title element for secondary observer
     * @returns {boolean} - True if observation should be bailed, false to continue
     * @private
     */
    shouldBailTitleObservation: function (expectedUrl, conversationItem, titleElement = null) {
      // Check if URL changed during observation
      if (window.location.href !== expectedUrl) {
        console.warn(
          `${Utils.getPrefix()} URL changed from "${expectedUrl}" to "${window.location.href}" during title observation`
        );
        return true;
      }

      // Check if the conversation item was removed from DOM (conversation deleted)
      if (!document.contains(conversationItem)) {
        console.warn(`${Utils.getPrefix()} Conversation item removed from DOM`);
        return true;
      }

      // Check if title element was removed (for secondary observer)
      if (titleElement !== null && !document.contains(titleElement)) {
        console.warn(`${Utils.getPrefix()} Title element removed from DOM`);
        return true;
      }

      return false;
    },

    /**
     * Watches for the sidebar element to appear in the DOM.
     * Calls the provided callback once the sidebar is found.
     *
     * @param {function} callback - Function to call once the sidebar is found
     * @returns {void}
     */
    watchForSidebar: function (callback) {
      console.log(`${Utils.getPrefix()} Starting to watch for sidebar element...`);
      // Show immediate loading status at the beginning
      StatusIndicator.show("Looking for Gemini sidebar...", "loading", 0);

      // First check if the sidebar already exists
      const sidebarSelector = 'conversations-list[data-test-id="all-conversations"]';
      const existingSidebar = document.querySelector(sidebarSelector);

      if (existingSidebar) {
        console.log(`${Utils.getPrefix()} Sidebar already exists in DOM`);
        callback(existingSidebar);
        return;
      }

      // If not, set up an observer to watch for it
      console.log(`${Utils.getPrefix()} Sidebar not found. Setting up observer to watch for it...`);

      const observer = new MutationObserver((mutations, obs) => {
        const sidebar = document.querySelector(sidebarSelector);
        if (sidebar) {
          console.log(`${Utils.getPrefix()} Sidebar element found in DOM`);
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
            console.warn(`${Utils.getPrefix()} Sidebar element not found after timeout`);
            StatusIndicator.show("Warning: Gemini sidebar not detected", "warning", 0);
          }
          observer.disconnect();
        }
      }, 10000); // 10 second timeout
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
     * Checks if the stop button is currently visible in the UI.
     * The stop button appears when Gemini is generating a response.
     *
     * @returns {boolean} - True if the stop button is visible, false otherwise
     */
    isStopButtonVisible: function () {
      // Look for the stop button with the specific class combination
      const stopButton = document.querySelector("button.send-button.stop");
      if (stopButton) {
        const stopIcon = stopButton.querySelector(".stop-icon");
        return stopIcon && stopButton.getAttribute("aria-label") === "Stop response";
      }
      return false;
    },

    /**
     * Sets up observation of the stop button to detect when chat generation finishes.
     * This helps determine when to accept a placeholder title as the final title.
     * Uses a priority system where title observers get 1 second to respond before stop button observer triggers.
     *
     * @param {string} expectedUrl - The URL associated with this conversation
     * @param {Function} onChatFinished - Callback to execute when chat generation finishes
     * @param {Object} priorityContext - Context object to coordinate with title observers
     * @returns {void}
     */
    observeStopButton: function (expectedUrl, onChatFinished, priorityContext) {
      console.log(`${Utils.getPrefix()} Setting up stop button observer for URL: ${expectedUrl}`);

      const self = this;
      const buttonContainer = document.querySelector(".trailing-actions-wrapper");

      if (!buttonContainer) {
        console.warn(`${Utils.getPrefix()} Could not find button container for stop button observation`);
        return;
      }

      STATE.stopButtonObserver = new MutationObserver(() => {
        // Check if URL changed during observation
        if (window.location.href !== expectedUrl) {
          console.log(`${Utils.getPrefix()} URL changed during stop button observation, cleaning up`);
          STATE.stopButtonObserver = self.cleanupObserver(STATE.stopButtonObserver);
          return;
        }

        // Check if stop button is no longer visible (chat finished)
        if (!self.isStopButtonVisible()) {
          console.log(`${Utils.getPrefix()} Stop button disappeared - chat generation likely finished`);

          // Set chat finished flag immediately for title observers
          priorityContext.chatFinished = true;

          // Give title observers priority - wait 1 second for them to respond
          setTimeout(() => {
            // Only trigger if title observers haven't already processed the title
            if (STATE.stopButtonObserver && !priorityContext.titleProcessed) {
              console.log(
                `${Utils.getPrefix()} Title observers didn't respond within 1 second, stop button observer taking over`
              );
              onChatFinished();
            } else if (priorityContext.titleProcessed) {
              console.log(
                `${Utils.getPrefix()} Title observers already processed the title, stop button observer backing off`
              );
            }
          }, 1000);
        }
      });

      STATE.stopButtonObserver.observe(buttonContainer, {
        childList: true,
        attributes: true,
        subtree: true,
      });

      console.log(`${Utils.getPrefix()} Stop button observer active for URL: ${expectedUrl}`);
    },

    /**
     * Captures context information for a new conversation.
     * Uses pre-captured data from STATE to avoid redundant data extraction.
     *
     * @returns {Object} - Object containing context details for the conversation
     */
    captureConversationContext: function () {
      return {
        timestamp: Utils.getCurrentTimestamp(),
        url: window.location.href,
        model: STATE.pendingModelName,
        prompt: STATE.pendingPrompt,
        originalPrompt: STATE.pendingOriginalPrompt,
        attachedFiles: STATE.pendingAttachedFiles,
        accountName: STATE.pendingAccountName,
        accountEmail: STATE.pendingAccountEmail,
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
      console.log(
        `${Utils.getPrefix()} MAIN Sidebar Observer Callback Triggered. ${mutationsList.length} mutations.`
      );
      const currentUrl = window.location.href;
      console.log(`${Utils.getPrefix()} Current URL inside MAIN observer: ${currentUrl}`);

      if (!Utils.isValidChatUrl(currentUrl)) {
        console.log(
          `${Utils.getPrefix()} URL "${currentUrl}" does not match the expected chat pattern. Waiting...`
        );
        return false; // URL still not a valid chat URL
      }

      console.log(
        `${Utils.getPrefix()} URL check passed (matches chat pattern). Processing mutations to find NEW conversation item...`
      );

      if (!STATE.isNewChatPending) {
        console.log(`${Utils.getPrefix()} No new chat is pending. Ignoring mutations.`);
        return false;
      }

      const conversationItem = this.findConversationItemInMutations(mutationsList);
      if (conversationItem) {
        console.log(
          `${Utils.getPrefix()} Found NEW conversation item container. Preparing to wait for title...`
        );
        StatusIndicator.show("Waiting for the title to appear. Stand by...", "loading", 0);

        // Capture context before disconnecting observer
        const context = this.captureConversationContext();

        // Stage 1 Complete: Found the Item - Disconnect the MAIN observer
        STATE.sidebarObserver = this.cleanupObserver(STATE.sidebarObserver);

        // Clear prompt context, but keep isNewChatPending and Gem-related state until title is captured
        this.resetPendingPromptContext();
        console.log(
          `${Utils.getPrefix()} Cleared pending prompt context. Waiting for title associated with URL: ${context.url}`
        );

        // Stage 2: Wait for the Title
        this.observeTitleForItem(
          conversationItem,
          context.url,
          context.timestamp,
          context.model,
          context.prompt,
          context.originalPrompt,
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
     *
     * @returns {void}
     */
    observeSidebarForNewChat: function () {
      const targetSelector = 'conversations-list[data-test-id="all-conversations"]';
      const conversationListElement = document.querySelector(targetSelector);

      if (!conversationListElement) {
        console.warn(
          `${Utils.getPrefix()} Could not find conversation list element ("${targetSelector}") to observe. Aborting observation setup.`
        );
        StatusIndicator.show("Could not track chat (UI element not found)", "warning");
        // Full abort - reset all pending state
        this.resetAllPendingState();
        return;
      }

      console.log(
        `${Utils.getPrefix()} Found conversation list element. Setting up MAIN sidebar observer...`
      );

      // Disconnect previous observers if they exist
      STATE.sidebarObserver = this.cleanupObserver(STATE.sidebarObserver);
      this.cleanupTitleObservers();

      STATE.sidebarObserver = new MutationObserver((mutationsList) => {
        this.processSidebarMutations(mutationsList);
      });

      STATE.sidebarObserver.observe(conversationListElement, {
        childList: true,
        subtree: true,
      });
      console.log(`${Utils.getPrefix()} MAIN sidebar observer is now active.`);
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
     * @returns {Promise<boolean>} - Promise resolving to true if title was found and entry was added, false otherwise
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
        console.log(`${Utils.getPrefix()} Title found for ${expectedUrl}! Attempting to add history entry.`);
        this.cleanupTitleObservers();

        // Get the Gemini Plan from the state
        const geminiPlan = STATE.pendingGeminiPlan;
        console.log(`${Utils.getPrefix()} Using Gemini plan: ${geminiPlan || "Unknown"}`);

        // Get Gem information from the state
        const gemId = STATE.pendingGemId;
        let gemName = STATE.pendingGemName;
        const gemUrl = STATE.pendingGemUrl;

        // If this is a gem chat but we don't have the name yet, try to extract it from response containers
        // This helps when the user sent a prompt before the gem name was initially detected
        if (gemId && !gemName) {
          const GemDetector = window.GeminiHistory_GemDetector;
          if (GemDetector && typeof GemDetector.extractGemNameFromResponses === "function") {
            console.log(
              `${Utils.getPrefix()} No gem name was detected earlier. Attempting to extract from response containers...`
            );
            // Try to extract the gem name from response containers which appear after responses are completed
            const extractedName = GemDetector.extractGemNameFromResponses();
            if (extractedName) {
              gemName = extractedName;
              STATE.pendingGemName = extractedName;
              console.log(
                `${Utils.getPrefix()} Successfully extracted gem name "${gemName}" from response container`
              );
            }
          }
        }

        if (gemId) {
          console.log(
            `${Utils.getPrefix()} Including Gem info - ID: ${gemId}, Name: ${gemName || "Not detected"}`
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

        // Clear all state after successful completion
        console.log(`${Utils.getPrefix()} Chat Completed - clearing all state...`);
        this.completeCleanup();

        return true;
      }
      return false;
    },

    /**
     * Sets up observation of a specific conversation item to capture its title once available.
     * Handles complex title detection including placeholders, truncated titles, and dynamic updates.
     * Uses a priority system to coordinate between title observers and stop button observer.
     *
     * @param {Element} conversationItem - The conversation item DOM element
     * @param {string} expectedUrl - The URL associated with this conversation
     * @param {string} timestamp - ISO-formatted timestamp for the chat
     * @param {string} model - Model name used for the chat
     * @param {string} prompt - User prompt text
     * @param {string} originalPrompt - Original prompt text without modifications
     * @param {Array} attachedFiles - Array of attached filenames
     * @param {string} accountName - Name of the user account
     * @param {string} accountEmail - Email of the user account
     * @returns {void}
     */
    observeTitleForItem: function (
      conversationItem,
      expectedUrl,
      timestamp,
      model,
      prompt,
      originalPrompt,
      attachedFiles,
      accountName,
      accountEmail
    ) {
      // Initial URL validation - bail if URL has changed
      if (this.shouldBailTitleObservation(expectedUrl, conversationItem)) {
        this.cleanupTitleObservers();
        return;
      }

      console.log(
        `${Utils.getPrefix()} TITLE Check (URL: ${expectedUrl}): Setting up observers to wait for title to appear`
      );

      // Enhanced observer with universal placeholder detection logic
      const self = this; // Store reference to DomObserver for use in callbacks

      // Priority context shared between title observers and stop button observer
      const priorityContext = {
        chatFinished: false,
        titleProcessed: false,
      };

      /**
       * Helper function to process title with priority coordination
       * @param {string} title - The title to process
       * @param {string} source - Source of the title (for logging)
       */
      const processTitle = (title, source) => {
        if (priorityContext.titleProcessed) {
          console.log(`${Utils.getPrefix()} Title already processed, ignoring ${source} trigger`);
          return;
        }

        priorityContext.titleProcessed = true;
        console.log(`${Utils.getPrefix()} Processing title from ${source}: "${title}"`);

        self.cleanupTitleObservers();
        self.processTitleAndAddHistory(
          title,
          expectedUrl,
          timestamp,
          model,
          prompt,
          attachedFiles,
          accountName,
          accountEmail
        );
      };

      // Set up stop button observer to detect when chat generation finishes
      this.observeStopButton(
        expectedUrl,
        () => {
          console.log(
            `${Utils.getPrefix()} Stop button observer triggered - accepting current title even if placeholder`
          );
          // Just accept whatever title is available at this point
          const titleElement = conversationItem.querySelector(".conversation-title");
          if (titleElement) {
            const currentTitle = titleElement.textContent.trim();
            if (currentTitle) {
              processTitle(currentTitle, "stop button observer (final acceptance)");
            }
          }
        },
        priorityContext
      );

      // Primary title observer - watches for changes to the conversation item
      STATE.titleObserver = new MutationObserver(() => {
        // Common guard clauses
        if (self.shouldBailTitleObservation(expectedUrl, conversationItem)) {
          self.cleanupTitleObservers();
          return;
        }

        const titleElement = conversationItem.querySelector(".conversation-title");
        if (titleElement) {
          const currentTitle = titleElement.textContent.trim();
          const placeholderPrompt = prompt;

          // Set up secondary observer if we detect placeholder or empty title
          // OR if the current title appears to be a truncated version of the placeholder
          // BUT only if chat generation hasn't finished yet
          if (
            !priorityContext.chatFinished &&
            (!currentTitle ||
              (placeholderPrompt && currentTitle === placeholderPrompt) ||
              (placeholderPrompt &&
                Utils.isTruncatedVersionEnhanced(placeholderPrompt, currentTitle, originalPrompt)))
          ) {
            if (!STATE.secondaryTitleObserver) {
              console.log(
                `${Utils.getPrefix()} Setting up secondary observer to wait for real title change (avoiding truncated titles)...`
              );

              // Capture the current title state to compare against
              const titleToWaitFor = currentTitle || "";

              // Secondary title observer - watches for fine-grained text changes in title element
              STATE.secondaryTitleObserver = new MutationObserver(() => {
                // Common guard clauses
                if (self.shouldBailTitleObservation(expectedUrl, conversationItem, titleElement)) {
                  self.cleanupTitleObservers();
                  return;
                }

                const newTitle = titleElement.textContent.trim();

                // If chat has finished, accept any title we have
                if (priorityContext.chatFinished && newTitle) {
                  processTitle(newTitle, "secondary observer (chat finished)");
                  return;
                }

                // Real title found: non-empty AND different from placeholder AND different from what we were waiting for
                // AND not a truncated version of the placeholder (using enhanced comparison to detect truncation)
                const isNotPlaceholder = !placeholderPrompt || newTitle !== placeholderPrompt;
                const isNotTruncated =
                  !placeholderPrompt ||
                  !Utils.isTruncatedVersionEnhanced(placeholderPrompt, newTitle, originalPrompt);
                const isDifferentFromWaiting = newTitle !== titleToWaitFor;

                if (newTitle && isNotPlaceholder && isNotTruncated && isDifferentFromWaiting) {
                  processTitle(newTitle, "secondary observer (real title)");
                } else if (
                  placeholderPrompt &&
                  Utils.isTruncatedVersionEnhanced(placeholderPrompt, newTitle, originalPrompt)
                ) {
                  console.log(
                    `${Utils.getPrefix()} Secondary observer: Detected truncated title "${newTitle}", continuing to wait for full title...`
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
          } else if (priorityContext.chatFinished && currentTitle) {
            // Chat has finished and we have some title - accept it
            processTitle(currentTitle, "primary observer (chat finished)");
            return;
          } else if (!priorityContext.chatFinished) {
            // We have a title that's different from placeholder AND not a truncated version, use it
            processTitle(currentTitle, "primary observer (real title)");
            return;
          }
        }
      });

      STATE.titleObserver.observe(conversationItem, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true,
        attributeOldValue: true,
      });
      console.log(`${Utils.getPrefix()} TITLE observer active for URL: ${expectedUrl}`);
    },
  };

  window.GeminiHistory_DomObserver = DomObserver;
})();
