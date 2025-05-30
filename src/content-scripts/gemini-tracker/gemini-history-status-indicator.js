(function () {
  "use strict";
  const Utils = window.GeminiHistory_Utils;
  const StatusIndicator = {
    element: null,
    timeout: null,
    DEFAULT_AUTO_HIDE: 3000, // Auto-hide after 3 seconds by default

    /**
     * Initializes the status indicator element in the DOM.
     * Creates the HTML structure and applies styles for the indicator.
     */
    init: function () {
      // Add CSS styles
      const styleEl = document.createElement("style");
      styleEl.textContent = `
              .gemini-history-status {
                  position: fixed;
                  bottom: 20px;
                  right: 20px;
                  display: flex;
                  align-items: center;
                  background: #1a1c25;
                  color: white;
                  padding: 10px 15px;
                  border-radius: 4px;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1);
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  font-size: 14px;
                  z-index: 10000;
                  transition: opacity 0.3s, transform 0.3s;
                  opacity: 1;
                  transform: translateY(0);
              }

              .gemini-history-status.hidden {
                  opacity: 0;
                  transform: translateY(10px);
                  pointer-events: none;
              }

              .status-icon {
                  width: 20px;
                  height: 20px;
                  margin-right: 10px;
                  position: relative;
              }

              .status-icon::before,
              .status-icon::after {
                  content: '';
                  position: absolute;
              }

              /* Info icon */
              .info .status-icon::before {
                  width: 20px;
                  height: 20px;
                  background: #3498db;
                  border-radius: 50%;
              }

              .info .status-icon::after {
                  content: 'i';
                  color: white;
                  font-style: italic;
                  font-weight: bold;
                  font-family: serif;
                  font-size: 14px;
                  left: 8px;
                  top: 0px;
              }

              /* Success icon */
              .success .status-icon::before {
                  width: 20px;
                  height: 20px;
                  background: #2ecc71;
                  border-radius: 50%;
              }

              .success .status-icon::after {
                  width: 6px;
                  height: 12px;
                  border-right: 2px solid white;
                  border-bottom: 2px solid white;
                  transform: rotate(45deg);
                  left: 7px;
                  top: 2px;
              }

              /* Warning icon */
              .warning .status-icon::before {
                  width: 0;
                  height: 0;
                  border-left: 10px solid transparent;
                  border-right: 10px solid transparent;
                  border-bottom: 18px solid #f39c12;
                  top: 1px;
              }

              .warning .status-icon::after {
                  content: '!';
                  color: white;
                  font-weight: bold;
                  font-size: 14px;
                  left: 8px;
                  top: 4px;
              }

              /* Error icon */
              .error .status-icon::before {
                  width: 20px;
                  height: 20px;
                  background: #e74c3c;
                  border-radius: 50%;
              }

              .error .status-icon::after {
                  content: '✕';
                  color: white;
                  font-size: 14px;
                  left: 5px;
                  top: 0px;
              }

              /* Loading icon */
              .loading .status-icon::before {
                  width: 16px;
                  height: 16px;
                  border: 2px solid #ccc;
                  border-top-color: #6e41e2;
                  border-radius: 50%;
                  left: 1px;
                  top: 1px;
                  animation: gemini-history-spin 0.8s linear infinite;
              }

              @keyframes gemini-history-spin {
                  to { transform: rotate(360deg); }
              }
            `;
      document.head.appendChild(styleEl);

      // Create the indicator element
      const indicator = document.createElement("div");
      indicator.id = "gemini-history-status";
      indicator.className = "gemini-history-status hidden";

      // Create inner elements for icon and message
      const iconContainer = document.createElement("div");
      iconContainer.className = "status-icon";

      const messageContainer = document.createElement("div");
      messageContainer.className = "status-message";

      // Append elements
      indicator.appendChild(iconContainer);
      indicator.appendChild(messageContainer);
      document.body.appendChild(indicator);

      this.element = indicator;
      console.log(`${Utils.getPrefix()} Status indicator initialized`);
    },

    /**
     * Shows the status indicator with a message.
     *
     * @param {string} message - The message to display in the indicator
     * @param {string} type - Type of status: 'info', 'success', 'warning', 'error', or 'loading'
     * @param {number} autoHide - Time in ms after which to hide the indicator, or 0 to stay visible
     * @returns {Object} - Returns the StatusIndicator instance for chaining
     */
    show: function (message, type = "info", autoHide = this.DEFAULT_AUTO_HIDE) {
      if (!this.element) {
        this.init();
      }

      // Clear any existing timeout
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }

      // Remove hidden class and set message
      this.element.classList.remove("hidden", "info", "success", "warning", "error", "loading");
      this.element.classList.add(type);

      const messageEl = this.element.querySelector(".status-message");
      if (messageEl) {
        messageEl.textContent = message;
      }

      // Auto-hide after specified delay if greater than 0
      if (autoHide > 0) {
        this.timeout = setTimeout(() => {
          this.hide();
        }, autoHide);
      }

      return this;
    },

    /**
     * Updates the message and type of an existing indicator.
     * Resets auto-hide timeout if specified.
     *
     * @param {string} message - The new message to display
     * @param {string|null} type - New type of status, or null to keep current type
     * @param {number} autoHide - Time in ms after which to hide the indicator, or 0 to stay visible
     * @returns {Object} - Returns the StatusIndicator instance for chaining
     */
    update: function (message, type = null, autoHide = this.DEFAULT_AUTO_HIDE) {
      if (!this.element) return this;

      // Update message
      const messageEl = this.element.querySelector(".status-message");
      if (messageEl) {
        messageEl.textContent = message;
      }

      // Update type if specified
      if (type) {
        this.element.classList.remove("info", "success", "warning", "error", "loading");
        this.element.classList.add(type);
      }

      // Reset auto-hide timeout
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }

      if (autoHide > 0) {
        this.timeout = setTimeout(() => {
          this.hide();
        }, autoHide);
      }

      return this;
    },

    /**
     * Hides the status indicator by adding the 'hidden' class.
     * Clears any existing timeout.
     */
    hide: function () {
      if (!this.element) return;

      this.element.classList.add("hidden");

      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
    },
  };

  window.GeminiHistory_StatusIndicator = StatusIndicator;
})();
