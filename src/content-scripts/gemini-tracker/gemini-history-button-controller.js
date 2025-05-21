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
    init: function() {
      Logger.log("gemini-tracker", "Initializing ButtonController");
      this.createTooltip();
      this.disableSendButton();
      
      // Listen for keyboard shortcuts (Enter and Ctrl+Enter) to show tooltip when disabled
      this.keyEventListener = (event) => {
        if (!STATE.isExtensionReady && 
            ((event.key === 'Enter' && !event.ctrlKey && !event.shiftKey) || 
             (event.key === 'Enter' && (event.ctrlKey || event.metaKey)))) {
          
          // Prevent default action if this appears to be a submit attempt 
          const activeTextArea = document.querySelector('textarea:focus');
          if (activeTextArea) {
            const textContent = activeTextArea.value.trim();
            
            // Only block submission if there's actual content to submit
            if (textContent) {
              event.preventDefault();
              event.stopPropagation();
              this.showTooltipNear(activeTextArea);
              
              // Optionally add a small visual feedback animation to the textarea
              activeTextArea.classList.add('gemini-history-blocked-submit');
              setTimeout(() => {
                activeTextArea.classList.remove('gemini-history-blocked-submit');
              }, 500);
            }
          }
        }
      };
      
      document.addEventListener('keydown', this.keyEventListener);
      
      // Set up mutation observer to handle dynamically created buttons
      this.observeButtonCreation();
    },
    
    /**
     * Observes the DOM for newly created send buttons and disables them if needed
     */
    observeButtonCreation: function() {
      // Store reference for cleanup
      this.buttonObserver = new MutationObserver((mutations) => {
        if (!STATE.isExtensionReady) {
          let hasNewButtons = false;
          
          // Check mutations for new potential send buttons
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  // Check if this element or any of its children match our button selectors
                  const sendButtonSelectors = [
                    'button:has(mat-icon[data-mat-icon-name="send"])', 
                    'button.send-button', 
                    'button[aria-label*="Send"]', 
                    'button[data-test-id="send-button"]'
                  ];
                  
                  // Try each selector
                  for (const selector of sendButtonSelectors) {
                    try {
                      if (node.matches && node.matches(selector) || 
                          node.querySelector && node.querySelector(selector)) {
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
        subtree: true
      });
    },

    /**
     * Creates the tooltip element used for showing status messages
     */
    createTooltip: function() {
      if (this.tooltipContainer) return;
      
      // Create tooltip container
      this.tooltipContainer = document.createElement('div');
      this.tooltipContainer.className = 'gemini-history-tooltip hidden';
      
      // Add styles for the tooltip
      const styleEl = document.createElement('style');
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
    showTooltipNear: function(element, message = "Please wait: Gemini History Manager is initializing the sidebar...") {
      if (!this.tooltipContainer || !element) return;
      
      const rect = element.getBoundingClientRect();
      const tooltipHeight = 40; // Approximate height
      
      // Position above the element
      this.tooltipContainer.style.left = rect.left + (rect.width / 2) + 'px';
      this.tooltipContainer.style.top = (rect.top - tooltipHeight - 10) + 'px';
      this.tooltipContainer.style.transform = 'translateX(-50%)';
      this.tooltipContainer.textContent = message;
      this.tooltipContainer.classList.remove('hidden');
      
      // Auto-hide after a delay
      setTimeout(() => {
        this.tooltipContainer.classList.add('hidden');
      }, 3000);
    },

    /**
     * Disables the send button in Gemini UI and adds tooltip functionality
     */
    disableSendButton: function() {
      if (STATE.isExtensionReady) {
        Logger.log("gemini-tracker", "Extension is ready, not disabling send buttons");
        return;
      }
      
      Logger.log("gemini-tracker", "Disabling send button until extension is ready");
      
      // Find and disable send buttons
      const sendButtonSelectors = [
        'button:has(mat-icon[data-mat-icon-name="send"])', 
        'button.send-button', 
        'button[aria-label*="Send"]', 
        'button[data-test-id="send-button"]'
      ];
      
      const sendButtons = document.querySelectorAll(sendButtonSelectors.join(', '));
      
      if (sendButtons.length === 0) {
        Logger.log("gemini-tracker", "No send buttons found to disable");
      }
      
      sendButtons.forEach(button => {
        // Skip buttons we've already processed
        if (button.hasAttribute('data-gemini-history-processed')) {
          return;
        }
        
        // Mark as processed to avoid duplicate handlers
        button.setAttribute('data-gemini-history-processed', 'true');
        
        // Save original state attributes
        button.setAttribute('data-original-disabled', button.getAttribute('aria-disabled') || 'false');
        button.setAttribute('data-original-title', button.getAttribute('title') || '');
        
        // Disable the button
        button.setAttribute('aria-disabled', 'true');
        button.setAttribute('title', 'Waiting for Gemini History Manager to initialize');
        
        // Add visual indication matching Gemini's disabled style
        button.style.opacity = '0.38';
        button.style.cursor = 'default';
        
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
            const textareas = document.querySelectorAll('textarea');
            textareas.forEach(textarea => {
              textarea.blur(); // Remove focus to prevent Enter key submission
            });
            
            return false;
          }
        };
        
        // Add hover event to show tooltip
        button.addEventListener('mouseover', mouseover);
        
        // Add click handler to show tooltip if clicked while disabled
        button.addEventListener('click', clickHandler, true);
        
        // Store handlers for cleanup
        button._geminiHistoryHandlers = {
          mouseover: mouseover,
          click: clickHandler
        };
      });
    },

    /**
     * Re-enables the send button when the extension is ready
     */
    enableSendButton: function() {
      if (!STATE.isExtensionReady) {
        Logger.warn("gemini-tracker", "Attempted to enable send button while extension is not ready");
        return;
      }
      
      Logger.log("gemini-tracker", "Extension is ready, enabling send button");
      
      const sendButtonSelectors = [
        'button:has(mat-icon[data-mat-icon-name="send"])', 
        'button.send-button', 
        'button[aria-label*="Send"]', 
        'button[data-test-id="send-button"]'
      ];
      
      const sendButtons = document.querySelectorAll(sendButtonSelectors.join(', '));
      
      if (sendButtons.length === 0) {
        Logger.log("gemini-tracker", "No send buttons found to enable");
      }
      
      sendButtons.forEach(button => {
        // Skip buttons that haven't been processed
        if (!button.hasAttribute('data-gemini-history-processed')) {
          return;
        }
        
        // Remove event listeners
        if (button._geminiHistoryHandlers) {
          if (button._geminiHistoryHandlers.mouseover) {
            button.removeEventListener('mouseover', button._geminiHistoryHandlers.mouseover);
          }
          
          if (button._geminiHistoryHandlers.click) {
            button.removeEventListener('click', button._geminiHistoryHandlers.click, true);
          }
          
          // Clear stored handlers
          button._geminiHistoryHandlers = null;
        }
        
        // Restore original state
        const originalDisabled = button.getAttribute('data-original-disabled') || 'false';
        const originalTitle = button.getAttribute('data-original-title') || '';
        
        button.setAttribute('aria-disabled', originalDisabled);
        if (originalTitle) {
          button.setAttribute('title', originalTitle);
        } else {
          button.removeAttribute('title');
        }
        
        // Restore visual style
        button.style.opacity = '';
        button.style.cursor = '';
        
        // Remove our processing marker
        button.removeAttribute('data-gemini-history-processed');
        button.removeAttribute('data-original-disabled');
        button.removeAttribute('data-original-title');
      });
    },

    /**
     * Cleanup method to remove event listeners and elements
     */
    cleanup: function() {
      if (this.keyEventListener) {
        document.removeEventListener('keydown', this.keyEventListener);
      }
      
      // Remove any mutation observers
      if (this.buttonObserver) {
        this.buttonObserver.disconnect();
        this.buttonObserver = null;
      }
      
      // Re-enable any disabled buttons
      if (!STATE.isExtensionReady) {
        STATE.isExtensionReady = true;
        this.enableSendButton();
      }
      
      // Remove tooltip element from DOM
      if (this.tooltipContainer && this.tooltipContainer.parentNode) {
        this.tooltipContainer.parentNode.removeChild(this.tooltipContainer);
        this.tooltipContainer = null;
      }
    }
  };

  window.GeminiHistory_ButtonController = ButtonController;
})();
