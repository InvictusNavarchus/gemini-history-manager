(function () {
  "use strict";
  const Utils = window.GeminiHistory_Utils;
  const MODEL_NAMES = window.GeminiHistory_MODEL_NAMES;
  const ModelDetector = {
    /**
     * Detects the current Gemini plan based on UI elements.
     * This function is based on common UI patterns and HTML structures observed on 2025-01-08.
     * It primarily detects "Gemini Pro" by looking for the Google logo SVG in the account area,
     * then falls back to pillbox buttons and upgrade buttons as secondary methods.
     *
     * @param {Document} doc The document object to search within (defaults to the current document).
     * @returns {string|null} "Gemini Pro", "Gemini Free", or null if the plan cannot be determined.
     */
    detectGeminiPlan: function (doc = document) {
      // --- 1. Detect "Gemini Pro" via Google logo SVG (Primary method) ---
      // Pro accounts have a distinctive Google logo SVG in the account area
      const googleLogoSvg = doc.querySelector('.gb_B .gb_3d svg[viewBox="0 0 40 40"]');
      if (googleLogoSvg) {
        // Verify it's the Google logo by checking for the characteristic paths with Google colors
        const paths = googleLogoSvg.querySelectorAll("path");
        const hasGoogleColors = Array.from(paths).some((path) => {
          const fill = path.getAttribute("fill");
          return (
            fill &&
            (fill.includes("#F6AD01") || // Yellow
              fill.includes("#249A41") || // Green
              fill.includes("#3174F1") || // Blue
              fill.includes("#E92D18")) // Red
          );
        });

        if (hasGoogleColors) {
          console.log(`${Utils.getPrefix()} Detected Pro plan via Google logo SVG`);
          return "Pro";
        }
      }

      // --- 2. Detect "Gemini Pro" via pillbox button (Secondary method) ---
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
              console.log(`${Utils.getPrefix()} Detected Pro plan via pillbox button`);
              return "Pro";
            }
          }
          // Potentially add "ULTRA" detection here in the future if a similar pillbox exists.
        }
      }

      // --- 3. Detect "Gemini Free" via upgrade button (If "Pro" was not detected) ---
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
          console.log(`${Utils.getPrefix()} Detected Free plan via upgrade button`);
          return "Free";
        }
      }

      // --- 4. Detect "Gemini Free" as fallback (If account area exists but no Pro indicators) ---
      // If we can find the account area but no Pro indicators, assume Free plan
      const accountArea = doc.querySelector('.gb_B[aria-label*="Google Account"]');
      if (accountArea) {
        console.log(
          `${Utils.getPrefix()} Detected Free plan as fallback (account area found but no Pro indicators)`
        );
        return "Free";
      }

      // --- 5. Final fallback ---
      // If no account area or plan indicators are found
      console.warn(`${Utils.getPrefix()} Could not determine Gemini plan from any known indicators`);
      return null;
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
          console.log(`${Utils.getPrefix()} Found tooltip with text: "${tooltipText}"`);

          if (tooltipText.includes("Veo 3")) {
            console.log(`${Utils.getPrefix()} Veo 3 is detected via tooltip`);
            return "Veo 3";
          } else if (tooltipText.includes("Veo 2")) {
            console.log(`${Utils.getPrefix()} Veo 2 is detected via tooltip`);
            return "Veo 2";
          }
        }
      }

      // Fallback to Veo 2 if tooltip detection fails
      console.log(`${Utils.getPrefix()} Could not determine Veo version, defaulting to Veo 2`);
      return "Veo 2";
    },

    /**
     * Checks if any special tools are activated in the toolbox drawer.
     * Looks for "Deep Research" and "Video" (Veo 2/3) tools.
     *
     * @returns {string|null} - Returns the special model name if detected, or null if none detected
     */
    checkForSpecialTools: function () {
      console.log(`${Utils.getPrefix()} Checking for special tools (Deep Research, Veo)...`);

      // Get all activated tools in the toolbox drawer
      const activatedButtons = document.querySelectorAll(
        'button.toolbox-drawer-item-button.is-selected[aria-pressed="true"]'
      );
      console.log(`${Utils.getPrefix()} Found ${activatedButtons.length} activated tool buttons`);

      // Check each button to see if it's one of our special tools
      for (const button of activatedButtons) {
        const labelElement = button.querySelector(".toolbox-drawer-button-label");
        if (!labelElement) continue;

        const buttonText = labelElement.textContent.trim();
        console.log(`${Utils.getPrefix()} Found activated button with text: "${buttonText}"`);

        if (buttonText.includes("Deep Research")) {
          console.log(`${Utils.getPrefix()} Deep Research tool is activated`);
          return "Deep Research";
        }

        if (buttonText.includes("Video")) {
          console.log(`${Utils.getPrefix()} Video tool is activated, checking for Veo version...`);
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
            console.log(`${Utils.getPrefix()} Deep Research tool is activated (detected via icon)`);
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
            // Log activation using standard prefix
            console.log(
              `${Utils.getPrefix()} Video tool is activated (detected via icon), checking for Veo version...`
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
      console.log(`${Utils.getPrefix()} Attempting to get current model name...`);

      // First, check for special tools that override the model name
      const specialTool = this.checkForSpecialTools();
      if (specialTool) {
        console.log(`${Utils.getPrefix()} Special tool activated: ${specialTool}`);
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
        console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
      } else {
        console.log(`${Utils.getPrefix()} Model not found via New Button Structure.`);
        // Try #2: data-test-id
        const modelElement = document.querySelector(
          'bard-mode-switcher [data-test-id="attribution-text"] span'
        );
        if (modelElement && modelElement.textContent) {
          rawText = modelElement.textContent.trim();
          foundVia = "Data-Test-ID";
          console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
        } else {
          console.log(`${Utils.getPrefix()} Model not found via Data-Test-ID.`);
          // Try #3: Fallback selector
          const fallbackElement = document.querySelector(".current-mode-title span");
          if (fallbackElement && fallbackElement.textContent) {
            rawText = fallbackElement.textContent.trim();
            foundVia = "Fallback Selector (.current-mode-title)";
            console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
          } else {
            console.log(`${Utils.getPrefix()} Model not found via Fallback Selector.`);
          }
        }
      }

      if (rawText) {
        const sortedKeys = Object.keys(MODEL_NAMES).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
          if (rawText.startsWith(key)) {
            const model = MODEL_NAMES[key];
            console.log(`${Utils.getPrefix()} Matched known model: "${model}" from raw text "${rawText}"`);
            return model;
          }
        }
        // Log fallback to raw text with standard prefix
        console.log(
          `${Utils.getPrefix()} Raw text "${rawText}" didn't match known prefixes, using raw text as model name.`
        );
        return rawText; // Return raw text if no prefix matches
      }

      // Log warning using standard prefix
      console.warn(`${Utils.getPrefix()} Could not determine current model name from any known selector.`);
      return "Unknown";
    },
  };

  window.GeminiHistory_ModelDetector = ModelDetector;
})();
