(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const MODEL_NAMES = window.GeminiHistory_MODEL_NAMES;

  const ModelDetector = {
    /**
     * Checks if any special tools are activated in the toolbox drawer.
     * Looks for "Deep Research" and "Video" (Veo 2) tools.
     *
     * @returns {string|null} - Returns the special model name if detected, or null if none detected
     */
    checkForSpecialTools: function () {
      Logger.log("gemini-tracker", "Checking for special tools (Deep Research, Veo 2)...");

      // Get all activated tools in the toolbox drawer
      const activatedButtons = document.querySelectorAll(
        'button.toolbox-drawer-item-button.is-selected[aria-pressed="true"]'
      );
      Logger.log("gemini-tracker", `Found ${activatedButtons.length} activated tool buttons`);

      // Check each button to see if it's one of our special tools
      for (const button of activatedButtons) {
        const labelElement = button.querySelector(".toolbox-drawer-button-label");
        if (!labelElement) continue;

        const buttonText = labelElement.textContent.trim();
        Logger.log("gemini-tracker", `Found activated button with text: "${buttonText}"`);

        if (buttonText.includes("Deep Research")) {
          Logger.log("gemini-tracker", "Deep Research tool is activated");
          return "Deep Research";
        }

        if (buttonText.includes("Video")) {
          Logger.log("gemini-tracker", "Video tool (Veo 2) is activated");
          return "Veo 2";
        }
      }

      // Alternative detection method if the above doesn't work
      const toolboxDrawer = document.querySelector("toolbox-drawer");
      if (toolboxDrawer) {
        // Try to find Deep Research button
        const deepResearchIcon = toolboxDrawer.querySelector('mat-icon[data-mat-icon-name="travel_explore"]');
        if (deepResearchIcon) {
          const deepResearchButton = deepResearchIcon.closest(
            'button.toolbox-drawer-item-button.is-selected[aria-pressed="true"]'
          );
          if (deepResearchButton) {
            Logger.log("gemini-tracker", "Deep Research tool is activated (detected via icon)");
            return "Deep Research";
          }
        }

        // Try to find Video button
        const videoIcon = toolboxDrawer.querySelector('mat-icon[data-mat-icon-name="movie"]');
        if (videoIcon) {
          const videoButton = videoIcon.closest(
            'button.toolbox-drawer-item-button.is-selected[aria-pressed="true"]'
          );
          if (videoButton) {
            Logger.log("gemini-tracker", "Video tool (Veo 2) is activated (detected via icon)");
            return "Veo 2";
          }
        }
      }

      return null;
    },

    /**
     * Attempts to detect the currently selected Gemini model from the UI.
     * Tries multiple selector strategies to find the model name.
     * Also checks for special activated tools like Deep Research and Veo 2.
     *
     * @returns {string} - The detected model name or 'Unknown' if not found
     */
    getCurrentModelName: function () {
      Logger.log("gemini-tracker", "Attempting to get current model name...");

      // First, check for special tools that override the model name
      const specialTool = this.checkForSpecialTools();
      if (specialTool) {
        Logger.log("gemini-tracker", `Special tool activated: ${specialTool}`);
        return specialTool;
      }

      let rawText = null;
      let foundVia = null;

      // Try #1: New button structure
      const modelButton = document.querySelector(
        "button.gds-mode-switch-button.mat-mdc-button-base .logo-pill-label-container span"
      );
      if (modelButton && modelButton.textContent) {
        rawText = modelButton.textContent.trim();
        foundVia = "New Button Structure";
        Logger.log("gemini-tracker", `Model raw text found via ${foundVia}: "${rawText}"`);
      } else {
        Logger.log("gemini-tracker", "Model not found via New Button Structure.");
        // Try #2: data-test-id
        const modelElement = document.querySelector(
          'bard-mode-switcher [data-test-id="attribution-text"] span'
        );
        if (modelElement && modelElement.textContent) {
          rawText = modelElement.textContent.trim();
          foundVia = "Data-Test-ID";
          Logger.log("gemini-tracker", `Model raw text found via ${foundVia}: "${rawText}"`);
        } else {
          Logger.log("gemini-tracker", "Model not found via Data-Test-ID.");
          // Try #3: Fallback selector
          const fallbackElement = document.querySelector(".current-mode-title span");
          if (fallbackElement && fallbackElement.textContent) {
            rawText = fallbackElement.textContent.trim();
            foundVia = "Fallback Selector (.current-mode-title)";
            Logger.log("gemini-tracker", `Model raw text found via ${foundVia}: "${rawText}"`);
          } else {
            Logger.log("gemini-tracker", "Model not found via Fallback Selector.");
          }
        }
      }

      if (rawText) {
        const sortedKeys = Object.keys(MODEL_NAMES).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
          if (rawText.startsWith(key)) {
            const model = MODEL_NAMES[key];
            Logger.log("gemini-tracker", `Matched known model: "${model}" from raw text "${rawText}"`);
            return model;
          }
        }
        Logger.log(
          "gemini-tracker",
          `Raw text "${rawText}" didn't match known prefixes, using raw text as model name.`
        );
        return rawText; // Return raw text if no prefix matches
      }

      Logger.warn("gemini-tracker", "Could not determine current model name from any known selector.");
      return "Unknown";
    },
  };

  window.GeminiHistory_ModelDetector = ModelDetector;
})();
