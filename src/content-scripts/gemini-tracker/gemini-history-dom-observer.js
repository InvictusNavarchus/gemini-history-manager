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

      // Ensure we're starting in a "not ready" state
      STATE.isExtensionReady = false;
      Logger.log("gemini-tracker", "[DEBUG] Set extension ready state to false for initialization");

      // First check if the sidebar already exists
      const sidebarSelector = 'conversations-list[data-test-id="all-conversations"]';
      const existingSidebar = document.querySelector(sidebarSelector);

      if (existingSidebar) {
        Logger.log("gemini-tracker", "Sidebar already exists in DOM");          Logger.log("gemini-tracker", "[DEBUG ENHANCE] Setting extension to ready state - sidebar found immediately");
          STATE.isExtensionReady = true;
          
          // Log all Angular components before enabling buttons
          Logger.log("gemini-tracker", "[DEBUG ENHANCE] Sidebar detection: found sidebar with components:");
          
          try {
            // Analyze the sidebar structure
            const sidebarComponents = existingSidebar.querySelectorAll('*');
            Logger.log("gemini-tracker", `[DEBUG ENHANCE] Sidebar has ${sidebarComponents.length} child elements`);
            
            // Check for conversation list
            const conversationList = existingSidebar.querySelector('[data-test-id="all-conversations"]');
            if (conversationList) {
              const conversationItems = conversationList.querySelectorAll('conversation-item');
              Logger.log("gemini-tracker", `[DEBUG ENHANCE] Found ${conversationItems.length} conversation items in sidebar`);
            }
          } catch (e) {
            Logger.warn("gemini-tracker", "[DEBUG ENHANCE] Error analyzing sidebar:", e);
          }
          
          // Look at full DOM state to understand UI readiness
          const appRootElement = document.querySelector('app-root');
          if (appRootElement) {
            Logger.log("gemini-tracker", "[DEBUG ENHANCE] Angular app-root component is present");
            
            // Check other important app components
            const chatWindow = document.querySelector('chat-window');
            const promptTextarea = document.querySelector('textarea');
            const mainContentArea = document.querySelector('main-content-area');
            
            Logger.log("gemini-tracker", `[DEBUG ENHANCE] Key components present: chatWindow=${!!chatWindow}, promptTextarea=${!!promptTextarea}, mainContentArea=${!!mainContentArea}`);
          }
          
          // Enable send button now that sidebar is found
          if (window.GeminiHistory_ButtonController) {
            Logger.log("gemini-tracker", "[DEBUG ENHANCE] Calling enableSendButton from watchForSidebar (immediate)");
            
            // Check for send buttons before enabling with expanded diagnostic info
            const sendButtonSelectors = [
              'button:has(mat-icon[data-mat-icon-name="send"])', 
              'button.send-button', 
              'button[aria-label*="Send"]', 
              'button[data-test-id="send-button"]'
            ];
            const sendButtons = document.querySelectorAll(sendButtonSelectors.join(', '));
            Logger.log("gemini-tracker", `[DEBUG ENHANCE] Found ${sendButtons.length} send buttons before enabling`);
            
            // Count all buttons in the UI
            const allButtons = document.querySelectorAll('button');
            Logger.log("gemini-tracker", `[DEBUG ENHANCE] Total buttons in UI: ${allButtons.length}`);
            
            // Check for textarea content
            const textarea = document.querySelector('textarea');
            const textareaInfo = textarea ? {
              value: textarea.value ? (textarea.value.length > 20 ? textarea.value.substring(0, 20) + '...' : textarea.value) : '',
              length: (textarea.value || '').length,
              visible: textarea.offsetParent !== null
            } : null;
            Logger.log("gemini-tracker", `[DEBUG ENHANCE] Textarea state: ${JSON.stringify(textareaInfo)}`);
            
            if (sendButtons.length > 0) {
              let buttonStates = [];
              sendButtons.forEach((btn, i) => {
                const computedStyle = window.getComputedStyle(btn);
                buttonStates.push({
                  index: i,
                  ariaDisabled: btn.getAttribute('aria-disabled'),
                  disabled: btn.disabled,
                  class: btn.className,
                  computedOpacity: computedStyle.opacity,
                  computedDisplay: computedStyle.display,
                  computedVisibility: computedStyle.visibility,
                  computedPointerEvents: computedStyle.pointerEvents,
                  visible: btn.offsetParent !== null,
                  hasIcon: !!btn.querySelector('mat-icon')
                });
              });
              Logger.log("gemini-tracker", "[DEBUG ENHANCE] Detailed button states before enabling:", JSON.stringify(buttonStates));
            }
            
            window.GeminiHistory_ButtonController.enableSendButton();
          
          // Check button states after enabling
          setTimeout(() => {
            const afterButtons = document.querySelectorAll(sendButtonSelectors.join(', '));
            if (afterButtons.length > 0) {
              let afterStates = [];
              afterButtons.forEach((btn, i) => {
                afterStates.push({
                  index: i,
                  ariaDisabled: btn.getAttribute('aria-disabled'),
                  class: btn.className
                });
              });
              Logger.log("gemini-tracker", "[DEBUG] Button states after enabling:", JSON.stringify(afterStates));
            }
          }, 100);
        } else {
          Logger.warn("gemini-tracker", "[DEBUG] ButtonController not available yet");
        }
        
        callback(existingSidebar);
        return;
      }

      // If not, set up an observer to watch for it
      Logger.log("gemini-tracker", "Sidebar not found. Setting up observer to watch for it...");

      const observer = new MutationObserver((mutations, obs) => {
        Logger.log("gemini-tracker", `[DEBUG ENHANCE] Checking for sidebar in ${mutations.length} mutations`);
        
        // Log details of significant mutations
        let significantChanges = 0;
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Only log if it seems like an important element
                if (node.tagName.toLowerCase().includes('app') || 
                    node.tagName.toLowerCase().includes('chat') ||
                    node.querySelector && node.querySelector('button, mat-icon, textarea')) {
                  significantChanges++;
                  Logger.log("gemini-tracker", `[DEBUG ENHANCE] Significant node added: ${node.tagName}, id=${node.id}, class=${node.className.slice(0, 50)}`);
                  if (significantChanges >= 3) break; // Limit logging
                }
              }
            }
          }
        }
        
        const sidebar = document.querySelector(sidebarSelector);
        if (sidebar) {
          Logger.log("gemini-tracker", "[DEBUG ENHANCE] Sidebar element found in DOM via observer");
          
          // Log additional context about what else has loaded
          const appComponents = {
            conversationList: !!sidebar.querySelector('[data-test-id="all-conversations"]'),
            textarea: !!document.querySelector('textarea'),
            chatWindow: !!document.querySelector('chat-window'),
            sendButton: !!document.querySelector('button:has(mat-icon[data-mat-icon-name="send"])')
          };
          
          Logger.log("gemini-tracker", `[DEBUG ENHANCE] UI components ready status: ${JSON.stringify(appComponents)}`);
          Logger.log("gemini-tracker", "[DEBUG ENHANCE] Setting extension to ready state - sidebar found via observer");
          STATE.isExtensionReady = true;
          
          // Enable send button now that sidebar is found
          if (window.GeminiHistory_ButtonController) {
            Logger.log("gemini-tracker", "[DEBUG ENHANCE] Calling enableSendButton from watchForSidebar (observer)");
            
            // Check for send buttons before enabling
            const sendButtonSelectors = [
              'button:has(mat-icon[data-mat-icon-name="send"])', 
              'button.send-button', 
              'button[aria-label*="Send"]', 
              'button[data-test-id="send-button"]'
            ];
            const sendButtons = document.querySelectorAll(sendButtonSelectors.join(', '));
            Logger.log("gemini-tracker", `[DEBUG ENHANCE] Found ${sendButtons.length} send buttons before enabling (observer)`);
            
            if (sendButtons.length > 0) {
              let buttonStates = [];
              sendButtons.forEach((btn, i) => {
                buttonStates.push({
                  index: i,
                  ariaDisabled: btn.getAttribute('aria-disabled'),
                  class: btn.className
                });
              });
              Logger.log("gemini-tracker", "[DEBUG] Button states before enabling (observer):", JSON.stringify(buttonStates));
            }
            
            // Try enabling multiple times with increasing delays to ensure it works
            window.GeminiHistory_ButtonController.enableSendButton();
            
            // Try again after a short delay in case Angular's update cycle hasn't completed
            setTimeout(() => {
              Logger.log("gemini-tracker", "[DEBUG] Second attempt to enable buttons after short delay");
              window.GeminiHistory_ButtonController.enableSendButton();
              
              // And schedule one more attempt with a longer delay
              setTimeout(() => {
                Logger.log("gemini-tracker", "[DEBUG] Third attempt to enable buttons after longer delay");
                window.GeminiHistory_ButtonController.enableSendButton();
                
                // Final check after all attempts
                setTimeout(() => {
                  const finalButtons = document.querySelectorAll(sendButtonSelectors.join(', '));
                  if (finalButtons.length > 0) {
                    let finalStates = [];
                    finalButtons.forEach((btn, i) => {
                      finalStates.push({
                        index: i,
                        ariaDisabled: btn.getAttribute('aria-disabled'),
                        class: btn.className
                      });
                    });
                    Logger.log("gemini-tracker", "[DEBUG] Button states after all enable attempts:", JSON.stringify(finalStates));
                  }
                }, 200);
              }, 500);
            }, 100);
          } else {
            Logger.warn("gemini-tracker", "[DEBUG] ButtonController not available in observer callback");
          }
          
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
            Logger.warn("gemini-tracker", "[DEBUG ENHANCE] Sidebar element not found after timeout - fallback enabling");
            StatusIndicator.show("Warning: Gemini sidebar not detected", "warning", 0);
            
            // Log comprehensive DOM state to understand why sidebar isn't appearing
            try {
              // Look at major DOM structure
              const appRoot = document.querySelector('app-root');
              const body = document.body;
              
              Logger.log("gemini-tracker", `[DEBUG ENHANCE] DOM structure: appRoot=${!!appRoot}, bodyChildCount=${body.childElementCount}`);
              
              // Check for any Angular components
              const angularElements = document.querySelectorAll('[ng-version], [_nghost], [_ngcontent]');
              Logger.log("gemini-tracker", `[DEBUG ENHANCE] Found ${angularElements.length} Angular elements in DOM`);
              
              // Check for common Gemini UI elements
              const textArea = document.querySelector('textarea');
              const matIcons = document.querySelectorAll('mat-icon');
              const mainContent = document.querySelector('main-content-area');
              const chatElements = document.querySelectorAll('chat-window, chat-message, chat-container');
              
              Logger.log("gemini-tracker", `[DEBUG ENHANCE] UI state: textarea=${!!textArea}, matIcons=${matIcons.length}, mainContent=${!!mainContent}, chatElements=${chatElements.length}`);
              
              // Look for any buttons that might be the send button
              const allButtons = document.querySelectorAll('button');
              Logger.log("gemini-tracker", `[DEBUG ENHANCE] Found ${allButtons.length} buttons in DOM`);
              
              if (allButtons.length > 0) {
                const buttonDetails = Array.from(allButtons)
                  .filter(btn => btn.offsetParent !== null) // Only visible buttons
                  .map((btn, i) => ({
                    index: i,
                    ariaLabel: btn.getAttribute('aria-label') || '',
                    classes: btn.className,
                    disabled: btn.getAttribute('aria-disabled') === 'true',
                    hasIcon: !!btn.querySelector('mat-icon, svg, img')
                  }))
                  .slice(0, 5); // Limit to first 5 for readability
                
                Logger.log("gemini-tracker", `[DEBUG ENHANCE] Visible buttons sample: ${JSON.stringify(buttonDetails)}`);
              }
            } catch (e) {
              Logger.warn("gemini-tracker", "[DEBUG ENHANCE] Error during fallback DOM analysis:", e);
            }
            
            // We'll still mark as ready after timeout to avoid permanently disabled buttons
            STATE.isExtensionReady = true;
            
            // Enable send button even after timeout to avoid permanently disabling
            if (window.GeminiHistory_ButtonController) {
              Logger.log("gemini-tracker", "[DEBUG ENHANCE] Calling enableSendButton after timeout (fallback)");
              window.GeminiHistory_ButtonController.enableSendButton();
              
              // Schedule a second attempt with delay, as UI might still be loading
              setTimeout(() => {
                Logger.log("gemini-tracker", "[DEBUG ENHANCE] Second fallback attempt to enable buttons");
                if (window.GeminiHistory_ButtonController) {
                  window.GeminiHistory_ButtonController.enableSendButton();
                }
              }, 2000); // Try again after 2 seconds
            }
          }
          observer.disconnect();
        }
      }, 10000); // 10 second timeout
    },

    /**
     * Extracts the title from a sidebar conversation item.
     *
     * @param {Element} conversationItem - The DOM element representing a conversation item
     * @returns {string|null} - The extracted title or null if not found
     */
    extractTitleFromSidebarItem: function (conversationItem) {
      Logger.log("gemini-tracker", "Attempting to extract title from sidebar item:", conversationItem);
      // Skip if the item is still hidden (display:none) — will become visible once the title settles
      // it turned out that Gemini set the user's prompt as the placeholder value before the real title is created
      if (conversationItem.offsetParent === null) {
        Logger.log("Conversation item not visible (hidden). Skipping title extraction.");
        return null;
      }
      const titleElement = conversationItem.querySelector(".conversation-title");
      if (!titleElement) {
        Logger.warn("gemini-tracker", "Could not find title element (.conversation-title).");
        return null;
      }
      Logger.log("gemini-tracker", "Found title container element:", titleElement);
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

        const success = await HistoryManager.addHistoryEntry(
          timestamp,
          expectedUrl,
          title,
          model,
          prompt,
          attachedFiles,
          accountName,
          accountEmail
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
      if (
        await this.processTitleAndAddHistory(
          title,
          expectedUrl,
          timestamp,
          model,
          prompt,
          attachedFiles,
          accountName,
          accountEmail
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

        STATE.titleObserver = new MutationObserver(() => {
          this.processTitleMutations(
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
