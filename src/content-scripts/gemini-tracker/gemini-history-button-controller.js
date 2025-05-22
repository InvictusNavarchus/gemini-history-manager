(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const STATE = window.GeminiHistory_STATE;

  const ButtonController = {
    tooltipContainer: null,
    keyEventListener: null,

    /**
     * Initialize the button controller
     * Creates the tooltip element and disables buttons initially
     */
    init: function () {
      Logger.log("gemini-tracker", "Initializing ButtonController");
      this.createTooltip();
      this.disableSendButton();

      // Listen for keyboard shortcuts (Enter and Ctrl+Enter) to show tooltip when disabled
      this.keyEventListener = (event) => {
        if (
          !STATE.isExtensionReady &&
          ((event.key === "Enter" && !event.ctrlKey && !event.shiftKey) ||
            (event.key === "Enter" && (event.ctrlKey || event.metaKey)))
        ) {
          // Prevent default action if this appears to be a submit attempt
          const activeTextArea = document.querySelector("textarea:focus");
          if (activeTextArea) {
            const textContent = activeTextArea.value.trim();

            // Only block submission if there's actual content to submit
            if (textContent) {
              event.preventDefault();
              event.stopPropagation();
              this.showTooltipNear(activeTextArea);

              // Optionally add a small visual feedback animation to the textarea
              activeTextArea.classList.add("gemini-history-blocked-submit");
              setTimeout(() => {
                activeTextArea.classList.remove("gemini-history-blocked-submit");
              }, 500);
            }
          }
        }
      };

      document.addEventListener("keydown", this.keyEventListener);

      // Set up mutation observer to handle dynamically created buttons
      this.observeButtonCreation();

      // Set up a recurring check for incorrectly disabled buttons
      this.startButtonStateCheck();
    },

    /**
     * Sets up recurring checks to detect and fix incorrectly disabled buttons
     * This handles cases where Angular doesn't properly update after our state changes
     */
    startButtonStateCheck: function () {
      // Clear any existing interval
      if (this.stateCheckInterval) {
        clearInterval(this.stateCheckInterval);
      }

      // Create a new interval that checks for stuck buttons
      this.stateCheckInterval = setInterval(() => {
        if (STATE.isExtensionReady) {
          const sendButtonSelectors = [
            'button:has(mat-icon[data-mat-icon-name="send"])',
            "button.send-button",
            'button[aria-label*="Send"]',
            'button[data-test-id="send-button"]',
          ];

          const sendButtons = document.querySelectorAll(sendButtonSelectors.join(", "));

          // Check if there are any enabled buttons with text in the textarea
          const textarea = document.querySelector("textarea");
          if (textarea && textarea.value.trim() && sendButtons.length > 0) {
            sendButtons.forEach((button) => {
              // If button should be enabled but Angular still shows it as disabled
              if (
                button.getAttribute("aria-disabled") === "true" &&
                !button.hasAttribute("data-gemini-history-processed")
              ) {
                Logger.log(
                  "gemini-tracker",
                  "Found a button still incorrectly disabled by Angular, forcing enable"
                );

                // Force it to correct state
                button.setAttribute("aria-disabled", "false");
                button.style.opacity = "";
                button.style.cursor = "";

                // Also add a subtle indicator that our extension fixed it
                button.classList.add("gemini-history-fixed-button");
              }
            });
          }
        }
      }, 500); // Check every half second
    },

    /**
     * Observes the DOM for newly created send buttons and disables them if needed
     */
    observeButtonCreation: function () {
      // Store reference for cleanup
      this.buttonObserver = new MutationObserver((mutations) => {
        if (!STATE.isExtensionReady) {
          let hasNewButtons = false;

          // Check mutations for new potential send buttons
          mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  // Check if this element or any of its children match our button selectors
                  const sendButtonSelectors = [
                    'button:has(mat-icon[data-mat-icon-name="send"])',
                    "button.send-button",
                    'button[aria-label*="Send"]',
                    'button[data-test-id="send-button"]',
                  ];

                  // Try each selector
                  for (const selector of sendButtonSelectors) {
                    try {
                      if (
                        (node.matches && node.matches(selector)) ||
                        (node.querySelector && node.querySelector(selector))
                      ) {
                        hasNewButtons = true;
                        break;
                      }
                    } catch (e) {
                      // Some complex selectors might not work with matches
                      continue;
                    }
                  }
                }
              });
            }
          });

          // If we found new potential buttons, run the disable function
          if (hasNewButtons) {
            Logger.log("gemini-tracker", "New potential send buttons detected, applying disabled state");
            this.disableSendButton();
          }
        }
      });

      // Observe the entire document for changes
      this.buttonObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    },

    /**
     * Creates the tooltip element used for showing status messages
     */
    createTooltip: function () {
      if (this.tooltipContainer) return;

      // Create tooltip container
      this.tooltipContainer = document.createElement("div");
      this.tooltipContainer.className = "gemini-history-tooltip hidden";

      // Add styles for the tooltip
      const styleEl = document.createElement("style");
      styleEl.textContent = `
        .gemini-history-tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          z-index: 10000;
          pointer-events: none;
          transition: opacity 0.2s;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          max-width: 300px;
          text-align: center;
        }
        
        .gemini-history-tooltip.hidden {
          opacity: 0;
          visibility: hidden;
        }
        
        .gemini-history-tooltip::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid rgba(0, 0, 0, 0.8);
        }
        
        /* Animation for blocked submission attempt */
        @keyframes geminiHistoryBlocked {
          0% { box-shadow: none; }
          20% { box-shadow: 0 0 0 2px rgba(255, 103, 103, 0.7); }
          100% { box-shadow: none; }
        }
        
        .gemini-history-blocked-submit {
          animation: geminiHistoryBlocked 0.5s ease;
        }
      `;

      document.head.appendChild(styleEl);
      document.body.appendChild(this.tooltipContainer);
    },

    /**
     * Shows the tooltip near a specified element
     * @param {HTMLElement} element - The element to position the tooltip near
     * @param {string} message - The message to display in the tooltip
     */
    showTooltipNear: function (
      element,
      message = "Please wait: Gemini History Manager is initializing the sidebar..."
    ) {
      if (!this.tooltipContainer || !element) return;

      const rect = element.getBoundingClientRect();
      const tooltipHeight = 40; // Approximate height

      // Position above the element
      this.tooltipContainer.style.left = rect.left + rect.width / 2 + "px";
      this.tooltipContainer.style.top = rect.top - tooltipHeight - 10 + "px";
      this.tooltipContainer.style.transform = "translateX(-50%)";
      this.tooltipContainer.textContent = message;
      this.tooltipContainer.classList.remove("hidden");

      // Auto-hide after a delay
      setTimeout(() => {
        this.tooltipContainer.classList.add("hidden");
      }, 3000);
    },

    /**
     * Disables the send button in Gemini UI and adds tooltip functionality
     */
    disableSendButton: function () {
      if (STATE.isExtensionReady) {
        Logger.log("gemini-tracker", "Extension is ready, not disabling send buttons");
        return;
      }

      Logger.log("gemini-tracker", "Disabling send button until extension is ready");

      // Find and disable send buttons
      const sendButtonSelectors = [
        'button:has(mat-icon[data-mat-icon-name="send"])',
        "button.send-button",
        'button[aria-label*="Send"]',
        'button[data-test-id="send-button"]',
      ];

      const sendButtons = document.querySelectorAll(sendButtonSelectors.join(", "));

      if (sendButtons.length === 0) {
        Logger.log("gemini-tracker", "No send buttons found to disable");
      }

      sendButtons.forEach((button) => {
        // Skip buttons we've already processed
        if (button.hasAttribute("data-gemini-history-processed")) {
          return;
        }

        // Mark as processed to avoid duplicate handlers
        button.setAttribute("data-gemini-history-processed", "true");

        // Save original state attributes
        button.setAttribute("data-original-disabled", button.getAttribute("aria-disabled") || "false");
        button.setAttribute("data-original-title", button.getAttribute("title") || "");

        // Disable the button
        button.setAttribute("aria-disabled", "true");
        button.setAttribute("title", "Waiting for Gemini History Manager to initialize");

        // Add visual indication matching Gemini's disabled style
        button.style.opacity = "0.38";
        button.style.cursor = "default";

        // Store reference to the handler functions so we can remove them later
        const mouseover = () => {
          if (!STATE.isExtensionReady) {
            this.showTooltipNear(button);
          }
        };

        const clickHandler = (event) => {
          if (!STATE.isExtensionReady) {
            event.preventDefault();
            event.stopPropagation();
            this.showTooltipNear(button);

            // Also disable any textarea submit behavior when clicking while disabled
            const textareas = document.querySelectorAll("textarea");
            textareas.forEach((textarea) => {
              textarea.blur(); // Remove focus to prevent Enter key submission
            });

            return false;
          }
        };

        // Add hover event to show tooltip
        button.addEventListener("mouseover", mouseover);

        // Add click handler to show tooltip if clicked while disabled
        button.addEventListener("click", clickHandler, true);

        // Store handlers for cleanup
        button._geminiHistoryHandlers = {
          mouseover: mouseover,
          click: clickHandler,
        };
      });
    },

    /**
     * Re-enables the send button when the extension is ready
     */
    enableSendButton: function () {
      if (!STATE.isExtensionReady) {
        Logger.warn("gemini-tracker", "Attempted to enable send button while extension is not ready");
        return;
      }

      Logger.log("gemini-tracker", "[DEBUG ENHANCE] Extension is ready, starting button enable sequence");

      // Check DOM state to understand the UI structure
      const promptElements = document.querySelectorAll('textarea, [contenteditable="true"]');
      Logger.log("gemini-tracker", `[DEBUG ENHANCE] Found ${promptElements.length} text input elements`);

      if (promptElements.length > 0) {
        // Log some details about input elements
        promptElements.forEach((el, i) => {
          const inputType = el.tagName.toLowerCase();
          const content = el.tagName.toLowerCase() === "textarea" ? el.value : el.textContent;
          Logger.log(
            "gemini-tracker",
            `[DEBUG ENHANCE] Input #${i}: ${inputType}, content length: ${(content || "").length}, visible: ${el.offsetParent !== null}`
          );
        });
      }

      const sendButtonSelectors = [
        'button:has(mat-icon[data-mat-icon-name="send"])',
        "button.send-button",
        'button[aria-label*="Send"]',
        'button[data-test-id="send-button"]',
      ];

      // Add comprehensive logging of all buttons in the UI to better understand the state
      const allButtons = document.querySelectorAll("button");
      Logger.log("gemini-tracker", `[DEBUG ENHANCE] Found ${allButtons.length} total buttons in UI`);

      // Log details of buttons that might be relevant
      let actionButtons = [];
      allButtons.forEach((btn, i) => {
        // Only log buttons that seem like they could be action buttons
        const hasIcon = btn.querySelector("mat-icon, .material-icons, svg, img");
        const ariaLabel = btn.getAttribute("aria-label") || "";
        const classes = btn.className;
        const isVisible = btn.offsetParent !== null;

        if (hasIcon || ariaLabel || classes.includes("button") || classes.includes("btn")) {
          actionButtons.push({
            index: i,
            label: ariaLabel,
            disabled: btn.getAttribute("aria-disabled"),
            classes: classes,
            visible: isVisible,
          });
        }
      });

      if (actionButtons.length > 0) {
        Logger.log(
          "gemini-tracker",
          `[DEBUG ENHANCE] Action buttons found: ${JSON.stringify(actionButtons)}`
        );
      }

      Logger.log(
        "gemini-tracker",
        "[DEBUG ENHANCE] Looking for send buttons with selectors:",
        sendButtonSelectors.join(", ")
      );
      const sendButtons = document.querySelectorAll(sendButtonSelectors.join(", "));
      Logger.log(
        "gemini-tracker",
        `[DEBUG ENHANCE] Found ${sendButtons.length} specific send button(s) to enable`
      );

      if (sendButtons.length > 0) {
        let buttonsInfo = [];
        sendButtons.forEach((btn, i) => {
          buttonsInfo.push({
            index: i,
            ariaDisabled: btn.getAttribute("aria-disabled"),
            processed: btn.hasAttribute("data-gemini-history-processed"),
            class: btn.className,
            ariaLabel: btn.getAttribute("aria-label"),
            disabled: btn.disabled,
            visible: btn.offsetParent !== null,
            computedStyle: {
              opacity: window.getComputedStyle(btn).opacity,
              display: window.getComputedStyle(btn).display,
              visibility: window.getComputedStyle(btn).visibility,
            },
          });
        });
        Logger.log("gemini-tracker", "[DEBUG ENHANCE] Detailed button states:", JSON.stringify(buttonsInfo));
      }

      if (sendButtons.length === 0) {
        Logger.warn("gemini-tracker", "No send buttons found to enable, will try alternative approach");
      }

      // First cleanup any marked buttons
      sendButtons.forEach((button, index) => {
        // Skip buttons that haven't been processed
        if (!button.hasAttribute("data-gemini-history-processed")) {
          Logger.log("gemini-tracker", `[DEBUG] Button ${index} not processed, skipping`);
          return;
        }

        Logger.log("gemini-tracker", `[DEBUG] Cleaning up button ${index} that was previously processed`);

        // Remove event listeners
        if (button._geminiHistoryHandlers) {
          Logger.log("gemini-tracker", `[DEBUG] Removing event handlers from button ${index}`);
          if (button._geminiHistoryHandlers.mouseover) {
            button.removeEventListener("mouseover", button._geminiHistoryHandlers.mouseover);
          }

          if (button._geminiHistoryHandlers.click) {
            button.removeEventListener("click", button._geminiHistoryHandlers.click, true);
          }

          // Clear stored handlers
          button._geminiHistoryHandlers = null;
        }

        // Restore original state, but ALWAYS enable the button during cleanup
        const originalTitle = button.getAttribute("data-original-title") || "";

        Logger.log("gemini-tracker", `[DEBUG] Setting button ${index} to enabled state during cleanup`);
        // Force button to enabled state regardless of original state
        button.setAttribute("aria-disabled", "false");
        button.removeAttribute("disabled");
        if (originalTitle) {
          button.setAttribute("title", originalTitle);
        } else {
          button.removeAttribute("title");
        }

        // Restore visual style for enabled button
        button.style.opacity = "1";
        button.style.cursor = "pointer";
        button.style.pointerEvents = "auto";

        // Remove our processing marker
        button.removeAttribute("data-gemini-history-processed");
        button.removeAttribute("data-original-disabled");
        button.removeAttribute("data-original-title");

        Logger.log(
          "gemini-tracker",
          `[DEBUG] Button ${index} cleanup complete, current aria-disabled=${button.getAttribute("aria-disabled")}`
        );
      });

      // Let's check what happened to our buttons after cleanup
      const buttonsAfterCleanup = document.querySelectorAll(sendButtonSelectors.join(", "));
      if (buttonsAfterCleanup.length > 0) {
        let cleanupStates = [];
        buttonsAfterCleanup.forEach((btn, i) => {
          cleanupStates.push({
            index: i,
            ariaDisabled: btn.getAttribute("aria-disabled"),
            processed: btn.hasAttribute("data-gemini-history-processed"),
            class: btn.className,
          });
        });
        Logger.log("gemini-tracker", "[DEBUG] Button states after cleanup:", JSON.stringify(cleanupStates));
      }

      // Now force Gemini's button swap mechanism to activate
      // This is more reliable than trying to patch Angular's state directly
      try {
        const textarea = document.querySelector("textarea");
        if (textarea) {
          // Store the original text
          const originalText = textarea.value;
          Logger.log(
            "gemini-tracker",
            `[DEBUG] Starting button swap process. Original text length: ${originalText.length}`
          );

          // Focus the textarea
          Logger.log("gemini-tracker", "[DEBUG] Focusing textarea");
          textarea.focus();

          // Set a flag to track our activation process
          if (!window._geminiHistoryManagerButtonRefresh) {
            window._geminiHistoryManagerButtonRefresh = true;
            Logger.log("gemini-tracker", "[DEBUG ENHANCE] Set refresh flag to true");

            // Get initial state of all Angular components
            Logger.log("gemini-tracker", "[DEBUG ENHANCE] Initial component state analysis");
            this.logComponentStructure();

            // 1. Clear the text to trigger mic button
            Logger.log("gemini-tracker", "[DEBUG ENHANCE] Step 1: Clearing textarea");
            textarea.value = "";
            textarea.dispatchEvent(new Event("input", { bubbles: true }));

            // Attempt to more strongly trigger Angular's change detection
            textarea.dispatchEvent(new Event("change", { bubbles: true }));
            textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
            textarea.dispatchEvent(new KeyboardEvent("keyup", { key: "Backspace", bubbles: true }));

            Logger.log("gemini-tracker", "[DEBUG ENHANCE] Dispatched multiple events after clearing text");

            // Check for mic button immediately
            setTimeout(() => {
              const micButton = document.querySelector('button[aria-label*="Microphone"]');
              const micButtonState = micButton
                ? {
                    ariaDisabled: micButton.getAttribute("aria-disabled"),
                    visible: micButton.offsetParent !== null,
                    ariaLabel: micButton.getAttribute("aria-label"),
                  }
                : null;
              Logger.log(
                "gemini-tracker",
                `[DEBUG ENHANCE] 5ms after clearing: Mic button state: ${JSON.stringify(micButtonState)}`
              );

              // Check DOM state transition
              this.logComponentStructure("after-clear");
            }, 5);

            // 2. Wait for mic button to appear, then restore text to get send button
            setTimeout(() => {
              // Log what's happened to our buttons after clearing text
              const micButton = document.querySelector('button[aria-label*="Microphone"]');
              const micButtonState = micButton
                ? {
                    ariaDisabled: micButton.getAttribute("aria-disabled"),
                    visible: micButton.offsetParent !== null,
                    ariaLabel: micButton.getAttribute("aria-label"),
                  }
                : null;
              Logger.log(
                "gemini-tracker",
                `[DEBUG ENHANCE] After ${50}ms timeout: Mic button state: ${JSON.stringify(micButtonState)}`
              );

              // Look for all visible buttons to understand UI state
              const allButtons = document.querySelectorAll("button");
              const visibleButtons = Array.from(allButtons).filter((btn) => btn.offsetParent !== null);
              Logger.log(
                "gemini-tracker",
                `[DEBUG ENHANCE] Total buttons: ${allButtons.length}, visible buttons: ${visibleButtons.length}`
              );

              const sendButtons = document.querySelectorAll(sendButtonSelectors.join(", "));
              Logger.log("gemini-tracker", `[DEBUG ENHANCE] Send buttons visible: ${sendButtons.length}`);

              if (sendButtons.length > 0) {
                sendButtons.forEach((btn, i) => {
                  Logger.log(
                    "gemini-tracker",
                    `[DEBUG ENHANCE] Send button #${i} state: aria-disabled=${btn.getAttribute("aria-disabled")}, visible=${btn.offsetParent !== null}`
                  );
                });
              }

              // Restore the original text to trigger send button
              Logger.log(
                "gemini-tracker",
                `[DEBUG ENHANCE] Step 2: Restoring original text (length: ${originalText.length})`
              );

              // Force text update using multiple techniques
              // 1. Direct value setting
              textarea.value = originalText;

              // 2. Using execCommand for more direct DOM manipulation
              try {
                textarea.focus();
                document.execCommand("selectAll", false, null);
                document.execCommand("insertText", false, originalText);
              } catch (e) {
                Logger.warn("gemini-tracker", "execCommand failed:", e);
              }

              // 3. Multiple event dispatching to ensure Angular picks up the change
              const eventTypes = [
                "input",
                "change",
                "keydown",
                "keyup",
                "keypress",
                "focus",
                "blur",
                "focus",
              ];
              eventTypes.forEach((eventType) => {
                textarea.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
              });

              // 4. More forceful text insertion by simulating typing
              if (originalText && originalText.length > 0) {
                // Type a space at the end to further trigger Angular changes
                const textWithSpace = originalText + " ";
                textarea.value = textWithSpace;
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
                // Then remove the space
                textarea.value = originalText;
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
              }

              Logger.log("gemini-tracker", "[DEBUG ENHANCE] Dispatched multiple events after restoring text");

              // Log mid-transition state
              setTimeout(() => {
                this.logComponentStructure("mid-transition");
              }, 10);

              // 3. Force the send button to be enabled with multiple attempts
              setTimeout(() => {
                const refreshedSendButton = document.querySelector(sendButtonSelectors.join(", "));

                if (refreshedSendButton) {
                  // Log detailed button state
                  const computedStyle = window.getComputedStyle(refreshedSendButton);
                  const buttonState = {
                    ariaDisabled: refreshedSendButton.getAttribute("aria-disabled"),
                    disabled: refreshedSendButton.disabled,
                    visible: refreshedSendButton.offsetParent !== null,
                    computedStyle: {
                      opacity: computedStyle.opacity,
                      display: computedStyle.display,
                      visibility: computedStyle.visibility,
                      pointerEvents: computedStyle.pointerEvents,
                    },
                    ariaLabel: refreshedSendButton.getAttribute("aria-label"),
                    hasIcon: !!refreshedSendButton.querySelector("mat-icon"),
                  };

                  Logger.log(
                    "gemini-tracker",
                    `[DEBUG ENHANCE] After final timeout: Send button state: ${JSON.stringify(buttonState)}`
                  );

                  if (
                    refreshedSendButton.getAttribute("aria-disabled") === "true" ||
                    buttonState.computedStyle.opacity < 1
                  ) {
                    Logger.log(
                      "gemini-tracker",
                      "[DEBUG ENHANCE] Button is still disabled, applying multiple enable techniques"
                    );

                    // 1. Direct attribute modification with !important style overrides
                    refreshedSendButton.setAttribute("aria-disabled", "false");
                    refreshedSendButton.removeAttribute("disabled");

                    // Force visual style with !important to override any conflicting styles
                    refreshedSendButton.style.setProperty("opacity", "1", "important");
                    refreshedSendButton.style.setProperty("cursor", "pointer", "important");
                    refreshedSendButton.style.setProperty("pointer-events", "auto", "important");

                    // 2. Class manipulation to trigger Angular
                    const originalClasses = refreshedSendButton.className;
                    refreshedSendButton.classList.add("gemini-history-fixed-button");
                    refreshedSendButton.classList.remove("mat-button-disabled");
                    refreshedSendButton.classList.remove("mat-disabled");
                    refreshedSendButton.classList.remove("disabled");

                    // 3. Angular component binding hack - try to directly modify component properties
                    Logger.log(
                      "gemini-tracker",
                      "[DEBUG ENHANCE] Attempting to access Angular component instance"
                    );
                    // Use the dedicated angular component hack if available
                    if (window.GeminiHistory_AngularComponentHack) {
                      window.GeminiHistory_AngularComponentHack.tryAngularComponentHack(refreshedSendButton);
                    } else {
                      Logger.warn("gemini-tracker", "[DEBUG ENHANCE] Angular component hack not available");
                    }

                    // 4. Extreme measures - simulate user interaction to trigger Angular change detection
                    Logger.log(
                      "gemini-tracker",
                      "[DEBUG ENHANCE] Attempting to force Angular change detection via events"
                    );

                    // Simulate focus events
                    refreshedSendButton.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
                    refreshedSendButton.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
                    refreshedSendButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                    refreshedSendButton.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
                    refreshedSendButton.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));

                    // Try modifying an unrelated attribute to trigger Angular's attribute change detection
                    refreshedSendButton.setAttribute("data-gemini-history-timestamp", Date.now().toString());

                    // Let's see if this worked
                    setTimeout(() => {
                      const finalButtonState = {
                        ariaDisabled: refreshedSendButton.getAttribute("aria-disabled"),
                        visible: refreshedSendButton.offsetParent !== null,
                        opacity: window.getComputedStyle(refreshedSendButton).opacity,
                        pointerEvents: window.getComputedStyle(refreshedSendButton).pointerEvents,
                      };
                      Logger.log(
                        "gemini-tracker",
                        `[DEBUG ENHANCE] Final button check - state: ${JSON.stringify(finalButtonState)}`
                      );
                    }, 10);
                  } else {
                    Logger.log("gemini-tracker", "[DEBUG ENHANCE] Send button is already enabled!");
                  }
                } else {
                  Logger.warn(
                    "gemini-tracker",
                    "[DEBUG ENHANCE] Send button disappeared after text restoration"
                  );

                  // Look for any visible buttons in the UI
                  const allButtons = document.querySelectorAll("button");
                  const visibleButtons = Array.from(allButtons)
                    .filter((btn) => btn.offsetParent !== null)
                    .map((btn, i) => ({
                      index: i,
                      ariaLabel: btn.getAttribute("aria-label"),
                      classes: btn.className,
                    }));

                  if (visibleButtons.length > 0) {
                    Logger.log(
                      "gemini-tracker",
                      `[DEBUG ENHANCE] Visible buttons: ${JSON.stringify(visibleButtons)}`
                    );
                  } else {
                    Logger.log("gemini-tracker", "[DEBUG ENHANCE] No visible buttons in the UI");
                  }
                }

                // 4. Clear our flag
                window._geminiHistoryManagerButtonRefresh = false;
                Logger.log("gemini-tracker", "[DEBUG ENHANCE] Reset refresh flag to false");

                Logger.log("gemini-tracker", "Completed enhanced button refresh cycle");

                // Final diagnostics
                setTimeout(() => {
                  this.logComponentStructure("final-state");

                  const finalButtons = document.querySelectorAll(sendButtonSelectors.join(", "));
                  let finalStatus = [];

                  finalButtons.forEach((btn, i) => {
                    const computedStyle = window.getComputedStyle(btn);
                    finalStatus.push({
                      index: i,
                      ariaDisabled: btn.getAttribute("aria-disabled"),
                      style: {
                        opacity: btn.style.opacity,
                        cursor: btn.style.cursor,
                        computed: {
                          opacity: computedStyle.opacity,
                          display: computedStyle.display,
                          visibility: computedStyle.visibility,
                          pointerEvents: computedStyle.pointerEvents,
                        },
                      },
                      class: btn.className,
                      visible: btn.offsetParent !== null,
                    });
                  });
                  Logger.log(
                    "gemini-tracker",
                    "[DEBUG ENHANCE] Final detailed button states:",
                    JSON.stringify(finalStatus)
                  );
                }, 100);
              }, 50);
            }, 50);
          } else {
            Logger.warn("gemini-tracker", "[DEBUG ENHANCE] Button refresh already in progress, skipping");
          }
        } else {
          Logger.warn("gemini-tracker", "[DEBUG] No textarea found for button swap mechanism");
        }
      } catch (e) {
        Logger.warn("gemini-tracker", "Error during button refresh cycle:", e);
      }
    },

    /**
     * Cleanup method to remove event listeners and elements
     */
    /**
     * Helper method to log the overall component structure in Angular
     * This helps understand what's happening with Angular's change detection
     */
    logComponentStructure: function (phase = "initial") {
      try {
        // Look for all Angular-related components
        Logger.log("gemini-tracker", `[DEBUG ENHANCE] Component structure analysis (${phase})`);

        // Find main UI regions
        const textarea = document.querySelector("textarea");
        const textareaState = textarea
          ? {
              value: textarea.value
                ? textarea.value.substr(0, 20) + (textarea.value.length > 20 ? "..." : "")
                : "",
              length: (textarea.value || "").length,
              visible: textarea.offsetParent !== null,
            }
          : null;

        // Find Angular components
        const angularComponents = document.querySelectorAll("[ng-version], [_nghost], [_ngcontent]");
        Logger.log("gemini-tracker", `[DEBUG ENHANCE] Found ${angularComponents.length} Angular components`);

        // Find and log action buttons state
        const sendButtonSelectors = [
          'button:has(mat-icon[data-mat-icon-name="send"])',
          "button.send-button",
          'button[aria-label*="Send"]',
          'button[data-test-id="send-button"]',
        ];

        const micButtonSelectors = [
          'button[aria-label*="Microphone"]',
          'button:has(mat-icon[data-mat-icon-name="mic"])',
        ];

        const sendButtons = document.querySelectorAll(sendButtonSelectors.join(", "));
        const micButtons = document.querySelectorAll(micButtonSelectors.join(", "));

        const buttonState = {
          textareaState,
          sendButtons: sendButtons.length,
          micButtons: micButtons.length,
          visibleSendButtons: Array.from(sendButtons).filter((btn) => btn.offsetParent !== null).length,
          visibleMicButtons: Array.from(micButtons).filter((btn) => btn.offsetParent !== null).length,
        };

        Logger.log("gemini-tracker", `[DEBUG ENHANCE] UI State (${phase}): ${JSON.stringify(buttonState)}`);

        // Log send button detailed state if present
        if (sendButtons.length > 0) {
          sendButtons.forEach((btn, i) => {
            const computedStyle = window.getComputedStyle(btn);
            const detail = {
              index: i,
              ariaDisabled: btn.getAttribute("aria-disabled"),
              disabled: btn.disabled,
              visible: btn.offsetParent !== null,
              computedStyle: {
                opacity: computedStyle.opacity,
                visibility: computedStyle.visibility,
                display: computedStyle.display,
                pointerEvents: computedStyle.pointerEvents,
              },
            };
            Logger.log(
              "gemini-tracker",
              `[DEBUG ENHANCE] Send button #${i} state (${phase}): ${JSON.stringify(detail)}`
            );
          });
        }
      } catch (e) {
        Logger.warn("gemini-tracker", `[DEBUG ENHANCE] Error in component structure logging: ${e.message}`);
      }
    },

    /**
     * Cleanup method to remove event listeners and elements
     */
    cleanup: function () {
      Logger.log("gemini-tracker", "[DEBUG ENHANCE] Beginning cleanup process");

      if (this.keyEventListener) {
        Logger.log("gemini-tracker", "[DEBUG] Removing keyboard event listener");
        document.removeEventListener("keydown", this.keyEventListener);
      }

      // Remove any mutation observers
      if (this.buttonObserver) {
        Logger.log("gemini-tracker", "[DEBUG] Disconnecting button observer");
        this.buttonObserver.disconnect();
        this.buttonObserver = null;
      }

      // Clear any intervals
      if (this.stateCheckInterval) {
        Logger.log("gemini-tracker", "[DEBUG] Clearing state check interval");
        clearInterval(this.stateCheckInterval);
        this.stateCheckInterval = null;
      }

      // Re-enable any disabled buttons
      if (!STATE.isExtensionReady) {
        Logger.log("gemini-tracker", "[DEBUG] Setting extension ready state to true");
        STATE.isExtensionReady = true;
      } else {
        Logger.log("gemini-tracker", "[DEBUG] Extension was already marked as ready");
      }

      // Clear any activation process
      const prevRefreshFlag = window._geminiHistoryManagerButtonRefresh;
      Logger.log("gemini-tracker", `[DEBUG] Clearing refresh flag (was: ${prevRefreshFlag})`);
      window._geminiHistoryManagerButtonRefresh = false;

      // Check for current buttons before we try resetting
      const sendButtonSelectors = [
        'button:has(mat-icon[data-mat-icon-name="send"])',
        "button.send-button",
        'button[aria-label*="Send"]',
        'button[data-test-id="send-button"]',
      ];

      const initialButtons = document.querySelectorAll(sendButtonSelectors.join(", "));
      Logger.log("gemini-tracker", `[DEBUG] Found ${initialButtons.length} send buttons at start of cleanup`);

      if (initialButtons.length > 0) {
        let initialStates = [];
        initialButtons.forEach((btn, i) => {
          initialStates.push({
            index: i,
            ariaDisabled: btn.getAttribute("aria-disabled"),
            visible: btn.offsetParent !== null,
            class: btn.className,
          });
        });
        Logger.log("gemini-tracker", "[DEBUG] Initial button states:", JSON.stringify(initialStates));
      }

      try {
        Logger.log("gemini-tracker", "[DEBUG] Beginning text-clear trick for button reset");

        // Directly trigger the empty-text trick to fix buttons
        const textarea = document.querySelector("textarea");
        if (textarea) {
          // Store original text
          const originalText = textarea.value || "";
          Logger.log("gemini-tracker", `[DEBUG] Found textarea with ${originalText.length} characters`);

          // Trigger the swap from send to mic and back
          Logger.log("gemini-tracker", "[DEBUG] Clearing text to trigger mic button");
          textarea.value = "";
          textarea.dispatchEvent(new Event("input", { bubbles: true }));

          // Check if mic button appears
          setTimeout(() => {
            const micButton = document.querySelector('button[aria-label*="Microphone"]');
            Logger.log("gemini-tracker", `[DEBUG] After 5ms: Mic button present: ${!!micButton}`);

            // Check send button status
            const sendButtons = document.querySelectorAll(sendButtonSelectors.join(", "));
            Logger.log(
              "gemini-tracker",
              `[DEBUG] Send buttons visible after clearing text: ${sendButtons.length}`
            );
          }, 5);

          // Wait a moment and restore the text
          setTimeout(() => {
            Logger.log(
              "gemini-tracker",
              `[DEBUG] Restoring ${originalText.length} characters to trigger send button`
            );
            textarea.value = originalText;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));

            // Check button states after restoration
            setTimeout(() => {
              // Check send button status
              const sendButtons = document.querySelectorAll(sendButtonSelectors.join(", "));
              Logger.log(
                "gemini-tracker",
                `[DEBUG] Send buttons after restoring text: ${sendButtons.length}`
              );

              if (sendButtons.length > 0) {
                let btnStates = [];
                sendButtons.forEach((btn, i) => {
                  btnStates.push({
                    index: i,
                    ariaDisabled: btn.getAttribute("aria-disabled"),
                    visible: btn.offsetParent !== null,
                  });
                });
                Logger.log(
                  "gemini-tracker",
                  "[DEBUG] Button states after text restore:",
                  JSON.stringify(btnStates)
                );
              }
            }, 20);
          }, 10);
        } else {
          Logger.warn("gemini-tracker", "[DEBUG] No textarea found for button reset");
        }
      } catch (e) {
        Logger.warn("gemini-tracker", "[DEBUG] Error during button reset:", e);
      }

      // Log component structure before button reset
      this.logComponentStructure("pre-cleanup");

      // Force-enable any remaining disabled buttons as a fallback
      Logger.log("gemini-tracker", "[DEBUG ENHANCE] Applying enhanced fallback button enabling");
      const sendButtons = document.querySelectorAll(sendButtonSelectors.join(", "));

      let enabledCount = 0;
      sendButtons.forEach((button, index) => {
        // Always apply our fixes, even if the button appears enabled
        // Sometimes the visual state doesn't match the attribute state
        const wasDisabled = button.getAttribute("aria-disabled") === "true";
        const computedStyle = window.getComputedStyle(button);
        const visuallyDisabled =
          parseFloat(computedStyle.opacity) < 1 || computedStyle.pointerEvents === "none";

        if (wasDisabled || visuallyDisabled) {
          // Log detailed state before fixing
          Logger.log(
            "gemini-tracker",
            `[DEBUG ENHANCE] Button #${index} before fix - aria-disabled=${button.getAttribute("aria-disabled")}, opacity=${computedStyle.opacity}, pointerEvents=${computedStyle.pointerEvents}`
          );

          // Apply all possible attribute fixes
          button.setAttribute("aria-disabled", "false");
          button.removeAttribute("disabled");
          button.style.opacity = "1";
          button.style.cursor = "pointer";
          button.style.pointerEvents = "auto";

          // Try to trigger Angular's change detection with events
          button.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
          button.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));

          // Add a class then remove it to trigger class change detection
          button.classList.add("gemini-history-temp-class");
          setTimeout(() => button.classList.remove("gemini-history-temp-class"), 10);

          // Touch all common Angular binding properties
          for (const key of ["ngClass", "ngStyle", "disabled", "tabIndex"]) {
            if (button.hasAttribute(`[${key}]`)) {
              const originalValue = button.getAttribute(`[${key}]`);
              button.setAttribute(`[${key}]`, originalValue || "null");
            }
          }

          enabledCount++;
          Logger.log(
            "gemini-tracker",
            `[DEBUG ENHANCE] Applied comprehensive fixes to button ${index} during cleanup`
          );
        }
      });

      Logger.log(
        "gemini-tracker",
        `[DEBUG ENHANCE] Applied fixes to ${enabledCount} of ${sendButtons.length} buttons`
      );

      // Schedule a final check to see if our changes stuck
      setTimeout(() => {
        this.logComponentStructure("post-cleanup");

        const finalButtons = document.querySelectorAll(sendButtonSelectors.join(", "));
        let finalStates = [];

        finalButtons.forEach((btn, i) => {
          const computedStyle = window.getComputedStyle(btn);
          finalStates.push({
            index: i,
            ariaDisabled: btn.getAttribute("aria-disabled"),
            disabled: btn.disabled,
            style: {
              opacity: btn.style.opacity,
              cursor: btn.style.cursor,
              computed: {
                opacity: computedStyle.opacity,
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                pointerEvents: computedStyle.pointerEvents,
              },
            },
            isClickable:
              computedStyle.pointerEvents !== "none" &&
              parseFloat(computedStyle.opacity) >= 0.9 &&
              btn.getAttribute("aria-disabled") !== "true",
          });
        });
        Logger.log(
          "gemini-tracker",
          "[DEBUG ENHANCE] Final detailed button states after cleanup:",
          JSON.stringify(finalStates)
        );
      }, 100);

      // Remove tooltip element from DOM
      if (this.tooltipContainer && this.tooltipContainer.parentNode) {
        this.tooltipContainer.parentNode.removeChild(this.tooltipContainer);
        this.tooltipContainer = null;
      }
    },
  };

  window.GeminiHistory_ButtonController = ButtonController;
})();
