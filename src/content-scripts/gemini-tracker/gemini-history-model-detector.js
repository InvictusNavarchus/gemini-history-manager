(function () {
  "use strict";

  const MODEL_NAMES = window.GeminiHistory_MODEL_NAMES;

  const ModelDetector = {
    /**
     * Detects the current Gemini plan based on UI elements.
     * This function is based on common UI patterns and HTML structures observed on 2025-05-21.
     * It prioritizes "Gemini Pro" detection via the pillbox button, then checks for "Gemini Free"
     * based on the presence of an "Upgrade" button.
     *
     * @param {Document} doc The document object to search within (defaults to the current document).
     * @returns {string|null} "Gemini Pro", "Gemini Free", or null if the plan cannot be determined.
     */
    detectGeminiPlan: function (doc = document) {
      // --- 1. Detect "Gemini Pro" (Preferred method) ---
      // Selector for the pillbox button that usually displays the current plan (e.g., "PRO").
      const proPillButtonSelector = "div.icon-buttons-container.pillbox button.gds-pillbox-button";
      const pillButtons = doc.querySelectorAll(proPillButtonSelector);

      for (const button of pillButtons) {
        const buttonTextContent = button.textContent;
        if (buttonTextContent) {
          const normalizedText = buttonTextContent.trim().toUpperCase();
          if (normalizedText === "PRO") {
            // Active "PRO" plan button is typically disabled.
            const isDisabled =
              button.hasAttribute("disabled") || button.classList.contains("mat-mdc-button-disabled");
            if (isDisabled) {
              return "Pro";
            }
          }
          // Potentially add "ULTRA" detection here in the future if a similar pillbox exists.
        }
      }

      // --- 2. Detect "Gemini Free" (If "Pro" was not detected) ---
      // Selector for the "Upgrade" button, often present for free users.
      // Looking for the button within an 'upsell-button' component and checking its aria-label or text.
      const upgradeButtonSelector = 'upsell-button button[data-test-id="bard-upsell-menu-button"]';
      const upgradeButton = doc.querySelector(upgradeButtonSelector);

      if (upgradeButton) {
        const ariaLabel = upgradeButton.getAttribute("aria-label");
        const textContent = upgradeButton.textContent;

        const hasUpgradeText =
          ariaLabel?.toLowerCase().includes("upgrade") || textContent?.toLowerCase().includes("upgrade");

        if (hasUpgradeText) {
          // If an "Upgrade" button is present and "Gemini Pro" was not detected,
          // it's a strong indicator of the "Gemini Free" plan.
          return "Free";
        }
      }

      // --- 3. Fallback ---
      // If neither "Gemini Pro" (via pillbox) nor "Gemini Free" (via upgrade button)
      // specific indicators are found.
      return null; // Or "Unknown"
    },

    /**
     * Detects the Veo version based on tooltip text.
     *
     * @returns {string} - Returns "Veo 3" or "Veo 2" (defaults to "Veo 2" if version can't be determined)
     */
    detectVeoVersion: function () {
      // Check for tooltip to determine if it's Veo 2 or Veo 3
      const tooltipContainer = document.querySelector(".cdk-describedby-message-container");
      if (tooltipContainer) {
        const tooltips = tooltipContainer.querySelectorAll("[role='tooltip']");
        for (const tooltip of tooltips) {
          const tooltipText = tooltip.textContent.trim();
          console.log(`${window.GeminiHistory_Utils.getPrefix()} Found tooltip with text: "${tooltipText}"`);

          if (tooltipText.includes("Veo 3")) {
            console.log(`${window.GeminiHistory_Utils.getPrefix()} Veo 3 is detected via tooltip`);
            return "Veo 3";
          } else if (tooltipText.includes("Veo 2")) {
            console.log(`${window.GeminiHistory_Utils.getPrefix()} Veo 2 is detected via tooltip`);
            return "Veo 2";
          }
        }
      }

      // Fallback to Veo 2 if tooltip detection fails
      console.log(`${window.GeminiHistory_Utils.getPrefix()} Could not determine Veo version, defaulting to Veo 2`);
      return "Veo 2";
    },

    /**
     * Checks if any special tools are activated in the toolbox drawer.
     * Looks for "Deep Research" and "Video" (Veo 2/3) tools.
     *
     * @returns {string|null} - Returns the special model name if detected, or null if none detected
     */
    checkForSpecialTools: function () {
      console.log(`${window.GeminiHistory_Utils.getPrefix()} Checking for special tools (Deep Research, Veo)...`);

      // Get all activated tools in the toolbox drawer
      const activatedButtons = document.querySelectorAll(
        'button.toolbox-drawer-item-button.is-selected[aria-pressed="true"]'
      );
      console.log(`${window.GeminiHistory_Utils.getPrefix()} Found ${activatedButtons.length} activated tool buttons`);

      // Check each button to see if it's one of our special tools
      for (const button of activatedButtons) {
        const labelElement = button.querySelector(".toolbox-drawer-button-label");
        if (!labelElement) continue;

        const buttonText = labelElement.textContent.trim();
        console.log(`${window.GeminiHistory_Utils.getPrefix()} Found activated button with text: "${buttonText}"`);

        if (buttonText.includes("Deep Research")) {
          console.log(`${window.GeminiHistory_Utils.getPrefix()} Deep Research tool is activated`);
          return "Deep Research";
        }

        if (buttonText.includes("Video")) {
          console.log(`${window.GeminiHistory_Utils.getPrefix()} Video tool is activated, checking for Veo version...`);
          return this.detectVeoVersion();
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
            console.log(`${window.GeminiHistory_Utils.getPrefix()} Deep Research tool is activated (detected via icon)`);
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
            console.log(
              `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Video tool is activated (detected via icon), checking for Veo version...`
            );
            return this.detectVeoVersion();
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
      console.log(`${window.GeminiHistory_Utils.getPrefix()} Attempting to get current model name...`);

      // First, check for special tools that override the model name
      const specialTool = this.checkForSpecialTools();
      if (specialTool) {
        console.log(`${window.GeminiHistory_Utils.getPrefix()} Special tool activated: ${specialTool}`);
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
        console.log(`${window.GeminiHistory_Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
      } else {
        console.log(`${window.GeminiHistory_Utils.getPrefix()} Model not found via New Button Structure.`);
        // Try #2: data-test-id
        const modelElement = document.querySelector(
          'bard-mode-switcher [data-test-id="attribution-text"] span'
        );
        if (modelElement && modelElement.textContent) {
          rawText = modelElement.textContent.trim();
          foundVia = "Data-Test-ID";
          console.log(`${window.GeminiHistory_Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
        } else {
          console.log(`${window.GeminiHistory_Utils.getPrefix()} Model not found via Data-Test-ID.`);
          // Try #3: Fallback selector
          const fallbackElement = document.querySelector(".current-mode-title span");
          if (fallbackElement && fallbackElement.textContent) {
            rawText = fallbackElement.textContent.trim();
            foundVia = "Fallback Selector (.current-mode-title)";
            console.log(`${window.GeminiHistory_Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
          } else {
            console.log(`${window.GeminiHistory_Utils.getPrefix()} Model not found via Fallback Selector.`);
          }
        }
      }

      if (rawText) {
        const sortedKeys = Object.keys(MODEL_NAMES).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
          if (rawText.startsWith(key)) {
            const model = MODEL_NAMES[key];
            console.log(`${window.GeminiHistory_Utils.getPrefix()} Matched known model: "${model}" from raw text "${rawText}"`);
            return model;
          }
        }
        console.log(
          `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Raw text "${rawText}" didn't match known prefixes, using raw text as model name.`
        );
        return rawText; // Return raw text if no prefix matches
      }

      console.warn(`[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker] Could not determine current model name from any known selector.`);
      return "Unknown";
    },
  };

  window.GeminiHistory_ModelDetector = ModelDetector;
})();
