(function () {
  "use strict";

  const StatusIndicator = window.GeminiHistory_StatusIndicator;
  const DomObserver = window.GeminiHistory_DomObserver;
  const Utils = window.GeminiHistory_Utils;

  const CrashDetector = {
    /**
     * Initializes the crash detector system.
     * Sets up observers to watch for Gemini error messages and handle crashes gracefully.
     *
     * @returns {void}
     */
    init: function () {
      console.log(`${Utils.getPrefix()} Setting up Gemini crash detector...`);

      // Find or wait for the overlay container
      const overlayContainer = document.querySelector(".cdk-overlay-container");

      if (!overlayContainer) {
        console.log(
          `${Utils.getPrefix()} Overlay container not found yet, will set up observer when it appears`
        );
        this.waitForOverlayContainer();
        return;
      }

      this.setupCrashObserver(overlayContainer);
    },

    /**
     * Waits for the overlay container to appear in the DOM.
     * Sets up a temporary observer that watches for the overlay container creation.
     *
     * @returns {void}
     */
    waitForOverlayContainer: function () {
      const self = this;

      // Watch for the overlay container to appear
      const containerObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains("cdk-overlay-container")) {
              console.log(`${Utils.getPrefix()} Overlay container appeared, setting up crash detector`);
              containerObserver.disconnect();
              self.setupCrashObserver(node);
              return;
            }
          }
        }
      });

      containerObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    },

    /**
     * Sets up the actual crash observer on the overlay container.
     * Watches for simple-snack-bar elements and checks for error messages.
     *
     * @param {Element} overlayContainer - The overlay container element to observe
     * @returns {void}
     */
    setupCrashObserver: function (overlayContainer) {
      console.log(`${Utils.getPrefix()} Setting up crash observer on overlay container`);

      const self = this;
      const crashObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName?.toLowerCase() === "simple-snack-bar") {
              self.handleSnackBarDetected(node);
            }
          }
        }
      });

      crashObserver.observe(overlayContainer, {
        childList: true,
        subtree: true,
      });

      console.log(`${Utils.getPrefix()} Crash detector is now active`);
    },

    /**
     * Handles the detection of a snack bar element.
     * Checks for error messages and triggers crash handling if needed.
     *
     * @param {Element} snackBarElement - The detected snack bar element
     * @returns {void}
     */
    handleSnackBarDetected: function (snackBarElement) {
      console.log(`${Utils.getPrefix()} Detected simple-snack-bar, checking for error messages`);

      // Check if the snack bar contains error text
      const snackBarText = snackBarElement.textContent?.toLowerCase() || "";

      if (this.isErrorMessage(snackBarText)) {
        this.handleCrashDetected(snackBarElement.textContent);
      }
    },

    /**
     * Determines if the given text indicates a Gemini error/crash.
     * Checks for known error patterns in snack bar messages.
     *
     * @param {string} text - The text content to check (should be lowercase)
     * @returns {boolean} - True if the text indicates an error, false otherwise
     */
    isErrorMessage: function (text) {
      return text.includes("went wrong") || text.includes("try again");
    },

    /**
     * Handles the detected Gemini crash.
     * Performs cleanup and shows error status to the user.
     *
     * @param {string} errorMessage - The original error message from the snack bar
     * @returns {void}
     */
    handleCrashDetected: function (errorMessage) {
      console.warn(`${Utils.getPrefix()} Gemini crash detected! Snack bar text: "${errorMessage}"`);

      // Perform cleanup and show error status
      DomObserver.completeCleanup();
      StatusIndicator.show("Gemini crashed. Tracking canceled.", "error");

      // Log the crash for debugging
      console.error(
        `${Utils.getPrefix()} Gemini crash detected and handled. Error message: "${errorMessage}"`
      );
    },
  };

  window.GeminiHistory_CrashDetector = CrashDetector;
})();
