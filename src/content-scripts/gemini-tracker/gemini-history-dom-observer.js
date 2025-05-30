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
     * Helper function to cleanup title observers and clear the new chat pending flag.
     * Only clears the flag when both title observers are cleaned up.
     *
     * @returns {void}
     */
    cleanupTitleObservers: function () {
      const hadTitleObservers = STATE.titleObserver || STATE.secondaryTitleObserver;

      STATE.titleObserver = this.cleanupObserver(STATE.titleObserver);
      STATE.secondaryTitleObserver = this.cleanupObserver(STATE.secondaryTitleObserver);

      // Clear the new chat pending flag only if we had title observers
      if (hadTitleObservers && STATE.isNewChatPending) {
        STATE.isNewChatPending = false;
        console.log(`${Utils.getPrefix()} Title observers cleaned up, cleared isNewChatPending flag`);
      }
    },

    /**
     * Cleans up all active observers to prevent memory leaks.
     * Disconnects sidebar, title, and secondary title observers.
     */
    cleanupAllObservers: function () {
      console.log(`${Utils.getPrefix()} Cleaning up all DOM observers...`);

      STATE.sidebarObserver = this.cleanupObserver(STATE.sidebarObserver);
      this.cleanupTitleObservers();

      console.log(`${Utils.getPrefix()} All DOM observers cleaned up`);
    },

    /**
     * Watches for the sidebar element to appear in the DOM.
     * Calls the provided callback once the sidebar is found.
     *
     * @param {function} callback - Function to call once the sidebar is found
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
     * @param {string} [prompt] - The user prompt to compare against for placeholder detection (may be truncated with [attached blockcode])
     * @param {string} [originalPrompt] - The original user prompt without modifications (for better comparison)
     * @returns {string|null} - The extracted title or null if not found
     */
    extractTitleFromSidebarItem: function (conversationItem, prompt = null, originalPrompt = null) {
      console.log(`${Utils.getPrefix()} Attempting to extract title from sidebar item:`, conversationItem);

      const titleElement = conversationItem.querySelector(".conversation-title");
      if (!titleElement) {
        console.warn(`${Utils.getPrefix()} Could not find title element (.conversation-title).`);
        return null;
      }
      console.log(`${Utils.getPrefix()} Found title container element:`, titleElement);

      // Special logic for collapsed sidebar - execute first
      if (this.isSidebarCollapsed()) {
        console.log(`${Utils.getPrefix()} Sidebar is collapsed. Setting up observer to wait for real title...`);
        const placeholderPrompt = prompt; // Use the passed prompt parameter instead of STATE.pendingPrompt
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
          console.error(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Error during title extraction (collapsed mode):`, e);
          return null;
        }

        // If we have a placeholder prompt and the current title is different AND non-empty, return it
        // But only if it's not a truncated version of the placeholder
        if (currentTitle && placeholderPrompt && currentTitle !== placeholderPrompt) {
          // Use the passed original prompt text for better comparison when there are code blocks
          const originalPromptText = originalPrompt;

          // Check if the title is NOT a truncated version of the prompt using enhanced comparison
          if (!Utils.isTruncatedVersionEnhanced(placeholderPrompt, currentTitle, originalPromptText)) {
            console.log(`${Utils.getPrefix()} Collapsed sidebar: Extracted real title: "${currentTitle}"`);
            return currentTitle;
          }
        }

        // Otherwise, always return null to trigger the secondary observer setup
        console.log(
          `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Collapsed sidebar: Current title "${currentTitle}" is placeholder, empty, or truncated. Will wait for real title...`
        );
        return null; // Signal to set up secondary observer
      }

      // Regular extraction logic - visibility check and normal processing
      if (conversationItem.offsetParent === null) {
        console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [Conversation item not visible (hidden). Skipping title extraction.`);
        return null;
      }

      console.log(`${Utils.getPrefix()} Sidebar is not collapsed. Proceeding with normal extraction logic...`);

      // Normal extraction logic (sidebar not collapsed)
      try {
        // Try direct text node
        const first = titleElement.firstChild;
        if (first && first.nodeType === Node.TEXT_NODE) {
          const t = first.textContent.trim();
          if (t) {
            console.log(`${Utils.getPrefix()} Extracted via text node: "${t}"`);
            return t;
          }
          console.warn(`${Utils.getPrefix()} Text node was empty, falling back.`);
        }
        // FALLBACK: full textContent
        const full = titleElement.textContent.trim();
        if (full) {
          console.log(`${Utils.getPrefix()} Fallback textContent: "${full}"`);
          return full;
        }
        console.warn(`${Utils.getPrefix()} titleElement.textContent was empty or whitespace.`);
      } catch (e) {
        console.error(`${Utils.getPrefix()} Error during title extraction:`, e);
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
        originalPrompt: STATE.pendingOriginalPrompt,
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
      console.log(
        `${Utils.getPrefix()} MAIN Sidebar Observer Callback Triggered. ${mutationsList.length} mutations.`
      );
      const currentUrl = window.location.href;
      console.log(`${Utils.getPrefix()} Current URL inside MAIN observer: ${currentUrl}`);

      if (!Utils.isValidChatUrl(currentUrl)) {
        console.log(
          `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] URL "${currentUrl}" does not match the expected chat pattern. Waiting...`
        );
        return false; // URL still not a valid chat URL
      }

      console.log(
        `[${new Date().toTimeString().slice(0, 8)}] [GHM] [URL check passed (matches chat pattern). Processing mutations to find NEW conversation item...`
      );

      if (!STATE.isNewChatPending) {
        console.log(`${Utils.getPrefix()} No new chat is pending. Ignoring mutations.`);
        return false;
      }

      const conversationItem = this.findConversationItemInMutations(mutationsList);
      if (conversationItem) {
        console.log(`${Utils.getPrefix()} Found NEW conversation item container. Preparing to wait for title...`);
        StatusIndicator.show("New chat detected, capturing details...", "loading", 0);

        // Capture context before disconnecting observer
        const context = this.captureConversationContext();

        // Stage 1 Complete: Found the Item - Disconnect the MAIN observer
        STATE.sidebarObserver = this.cleanupObserver(STATE.sidebarObserver);

        // Clear most pending flags, but keep isNewChatPending until title is captured
        // This ensures page visibility changes don't cleanup observers while title capture is in progress
        STATE.pendingModelName = null;
        STATE.pendingPrompt = null;
        STATE.pendingOriginalPrompt = null;
        STATE.pendingAttachedFiles = [];
        STATE.pendingAccountName = null;
        STATE.pendingAccountEmail = null;
        // We don't clear Gem-related state here since we still need it for the history entry
        console.log(
          `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Cleared pending flags. Waiting for title associated with URL: ${context.url}`
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
     */
    observeSidebarForNewChat: function () {
      const targetSelector = 'conversations-list[data-test-id="all-conversations"]';
      const conversationListElement = document.querySelector(targetSelector);

      if (!conversationListElement) {
        console.warn(
          `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Could not find conversation list element ("${targetSelector}") to observe. Aborting observation setup.`
        );
        StatusIndicator.show("Could not track chat (UI element not found)", "warning");
        STATE.isNewChatPending = false; // Reset flag
        STATE.pendingModelName = null;
        STATE.pendingPrompt = null;
        STATE.pendingOriginalPrompt = null;
        STATE.pendingAttachedFiles = [];
        STATE.pendingAccountName = null;
        STATE.pendingAccountEmail = null;
        STATE.pendingGemId = null;
        STATE.pendingGemName = null;
        STATE.pendingGemUrl = null;
        return;
      }

      console.log(`${Utils.getPrefix()} Found conversation list element. Setting up MAIN sidebar observer...`);
      StatusIndicator.show("Tracking new chat...", "info");

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
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [MAIN sidebar observer is now active.`);
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
        console.log(`${Utils.getPrefix()} Title found for ${expectedUrl}! Attempting to add history entry.`);
        StatusIndicator.update(`Found chat title: "${title}"`, "success", 0);
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
              `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] No gem name was detected earlier. Attempting to extract from response containers...`
            );
            // Try to extract the gem name from response containers which appear after responses are completed
            const extractedName = GemDetector.extractGemNameFromResponses();
            if (extractedName) {
              gemName = extractedName;
              STATE.pendingGemName = extractedName;
              console.log(
                `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Successfully extracted gem name "${gemName}" from response container`
              );
            }
          }
        }

        if (gemId) {
          console.log(
            `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Including Gem info - ID: ${gemId}, Name: ${gemName || "Not detected"}`
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

        // Note: We don't clear isNewChatPending here because this function is called
        // immediately when title is found, but observers may still be active.
        // The flag will be cleared when observers are actually cleaned up.

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
     * @param {string} prompt - User prompt text (may be truncated with [attached blockcode])
     * @param {string} originalPrompt - Original prompt text without modifications
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
      originalPrompt,
      attachedFiles,
      accountName,
      accountEmail
    ) {
      // Abort if URL changed
      if (window.location.href !== expectedUrl) {
        console.warn(`${Utils.getPrefix()} URL changed; disconnecting all title observers.`);
        this.cleanupTitleObservers();
        return true;
      }

      // Extract title and process if found
      const title = this.extractTitleFromSidebarItem(conversationItem, prompt, originalPrompt);
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

      console.log(`${Utils.getPrefix()} No title yet; continuing to observe...`);
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
      originalPrompt,
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
        originalPrompt,
        attachedFiles,
        accountName,
        accountEmail
      ).then((result) => {
        if (result) {
          return;
        }

        // Enhanced observer for collapsed sidebar placeholder logic
        const self = this; // Store reference to DomObserver for use in callbacks
        STATE.titleObserver = new MutationObserver(() => {
          // Check if URL changed during observation
          if (window.location.href !== expectedUrl) {
            console.warn(
              `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] URL changed from "${expectedUrl}" to "${window.location.href}" while waiting for title. Cleaning up all title observers.`
            );
            self.cleanupTitleObservers();
            return;
          }

          // Check if the conversation item was removed from DOM (conversation deleted)
          if (!document.contains(conversationItem)) {
            console.warn(
              `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Conversation item removed from DOM. Cleaning up all title observers.`
            );
            self.cleanupTitleObservers();
            return;
          }

          const titleElement = conversationItem.querySelector(".conversation-title");
          if (self.isSidebarCollapsed() && titleElement) {
            const currentTitle = titleElement.textContent.trim();
            const placeholderPrompt = prompt; // Use the passed prompt parameter instead of STATE.pendingPrompt

            // Set up secondary observer if we detect placeholder or empty title
            // OR if the current title appears to be a truncated version of the placeholder
            if (
              !currentTitle ||
              (placeholderPrompt && currentTitle === placeholderPrompt) ||
              (placeholderPrompt &&
                Utils.isTruncatedVersionEnhanced(placeholderPrompt, currentTitle, originalPrompt))
            ) {
              if (!STATE.secondaryTitleObserver) {
                console.log(
                  `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Setting up secondary observer to wait for real title change (avoiding truncated titles)...`
                );

                // Capture the current title state to compare against
                const titleToWaitFor = currentTitle || "";

                STATE.secondaryTitleObserver = new MutationObserver(() => {
                  // Check if URL changed during secondary observation
                  if (window.location.href !== expectedUrl) {
                    console.warn(
                      `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] URL changed during secondary observer. Cleaning up all title observers.`
                    );
                    self.cleanupTitleObservers();
                    return;
                  }

                  // Check if the conversation item was removed from DOM (conversation deleted)
                  if (!document.contains(conversationItem) || !document.contains(titleElement)) {
                    console.warn(
                      `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Conversation item or title element removed from DOM. Cleaning up all title observers.`
                    );
                    self.cleanupTitleObservers();
                    return;
                  }

                  // Check if sidebar expanded (secondary observer no longer needed)
                  if (!self.isSidebarCollapsed()) {
                    console.log(
                      `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Sidebar expanded while secondary observer active. Cleaning up secondary observer.`
                    );
                    STATE.secondaryTitleObserver = self.cleanupObserver(STATE.secondaryTitleObserver);
                    return;
                  }

                  const newTitle = titleElement.textContent.trim();

                  // Real title found: non-empty AND different from placeholder AND different from what we were waiting for
                  // AND not a truncated version of the placeholder (using enhanced comparison to detect truncation)
                  const isNotPlaceholder = !placeholderPrompt || newTitle !== placeholderPrompt;
                  const isNotTruncated =
                    !placeholderPrompt ||
                    !Utils.isTruncatedVersionEnhanced(placeholderPrompt, newTitle, originalPrompt);
                  const isDifferentFromWaiting = newTitle !== titleToWaitFor;

                  if (newTitle && isNotPlaceholder && isNotTruncated && isDifferentFromWaiting) {
                    console.log(`${Utils.getPrefix()} Secondary observer: Real title detected: "${newTitle}"`);
                    // Clean up observers
                    self.cleanupTitleObservers();
                    // Continue with chat data extraction as usual
                    self.processTitleAndAddHistory(
                      newTitle,
                      expectedUrl,
                      timestamp,
                      model,
                      prompt,
                      attachedFiles,
                      accountName,
                      accountEmail
                    );
                  } else if (
                    placeholderPrompt &&
                    Utils.isTruncatedVersionEnhanced(placeholderPrompt, newTitle, originalPrompt)
                  ) {
                    console.log(
                      `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Secondary observer: Detected truncated title "${newTitle}", continuing to wait for full title...`
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
              // We have a title that's different from placeholder AND not a truncated version, use it
              console.log(`${Utils.getPrefix()} Collapsed sidebar: Found real title: "${currentTitle}"`);
              self.cleanupTitleObservers();
              self.processTitleAndAddHistory(
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
          } else if (STATE.secondaryTitleObserver) {
            // Sidebar is not collapsed but secondary observer exists - clean it up
            console.log(
              `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Sidebar not collapsed but secondary observer exists. Cleaning up secondary observer.`
            );
            STATE.secondaryTitleObserver = self.cleanupObserver(STATE.secondaryTitleObserver);
          }

          // Normal processing for non-collapsed sidebar
          self.processTitleMutations(
            conversationItem,
            expectedUrl,
            timestamp,
            model,
            prompt,
            originalPrompt,
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
        console.log(`${Utils.getPrefix()} TITLE observer active for URL: ${expectedUrl}`);
      });
    },

    /**
     * Attempts to capture the title and save the history entry if successful.
     *
     * @param {Element} item - The conversation item DOM element
     * @param {string} expectedUrl - The URL associated with this conversation
     * @param {string} timestamp - ISO-formatted timestamp for the chat
     * @param {string} model - Model name used for the chat
     * @param {string} prompt - User prompt text (may be truncated with [attached blockcode])
     * @param {string} originalPrompt - Original prompt text without modifications
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
      originalPrompt,
      attachedFiles,
      accountName,
      accountEmail
    ) {
      // Check if we are still on the page this observer was created for
      if (window.location.href !== expectedUrl) {
        console.warn(
          `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] URL changed from "${expectedUrl}" to "${window.location.href}" while waiting for title. Disconnecting all title observers.`
        );
        STATE.titleObserver = this.cleanupObserver(STATE.titleObserver);
        STATE.secondaryTitleObserver = this.cleanupObserver(STATE.secondaryTitleObserver);
        return true; // Return true to indicate we should stop trying (observer is disconnected)
      }

      const title = this.extractTitleFromSidebarItem(item, prompt, originalPrompt);
      console.log(`${Utils.getPrefix()} TITLE Check (URL: ${expectedUrl}): Extracted title: "${title}"`);

      // Get the Gemini Plan from the state
      const geminiPlan = STATE.pendingGeminiPlan;
      console.log(`${Utils.getPrefix()} Using Gemini plan: ${geminiPlan || "Unknown"}`);

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
