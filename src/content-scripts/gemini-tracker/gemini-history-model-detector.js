(function () {
  "use strict";
  const Utils = window.GeminiHistory_Utils;
  const MODEL_NAMES = window.GeminiHistory_MODEL_NAMES;
  const TOOL_NAMES = window.GeminiHistory_TOOL_NAMES;
  const ModelDetector = {
    /**
     * Helper function to normalize color values for comparison
     * Handles hex, rgb, rgba, hsl, hsla formats
     */
    normalizeColor: function (colorStr) {
      if (!colorStr) return null;

      // Remove whitespace and convert to lowercase
      const normalized = colorStr.replace(/\s/g, "").toLowerCase();

      // Convert common Google brand colors to a standard format for comparison
      const googleColors = {
        // Yellow variations
        "#f6ad01": "google-yellow",
        "#f9ab00": "google-yellow",
        "rgb(246,173,1)": "google-yellow",
        "rgb(249,171,0)": "google-yellow",

        // Green variations
        "#249a41": "google-green",
        "#34a853": "google-green",
        "rgb(36,154,65)": "google-green",
        "rgb(52,168,83)": "google-green",

        // Blue variations
        "#3174f1": "google-blue",
        "#4285f4": "google-blue",
        "rgb(49,116,241)": "google-blue",
        "rgb(66,133,244)": "google-blue",

        // Red variations
        "#e92d18": "google-red",
        "#ea4335": "google-red",
        "rgb(233,45,24)": "google-red",
        "rgb(234,67,53)": "google-red",
      };

      return googleColors[normalized] || null;
    },

    /**
     * More resilient Google logo SVG detection
     * Uses multiple strategies to identify the Google logo
     */
    detectGoogleLogoSvg: function (doc) {
      // Strategy 1: Look for SVGs in account area with Google-like dimensions
      const accountSelectors = [
        '[aria-label*="Google Account"]', // Most reliable - semantic meaning
        ".gb_B", // Current Google class, but may change
        '[class*="gb_"]', // Any Google bar class as fallback
      ];

      for (const selector of accountSelectors) {
        const accountElements = doc.querySelectorAll(selector);

        for (const accountEl of accountElements) {
          // Look for SVGs with Google logo characteristics
          const svgs = accountEl.querySelectorAll("svg");

          for (const svg of svgs) {
            if (this.isGoogleLogoSvg(svg)) {
              return svg;
            }
          }
        }
      }

      // Strategy 2: Global search for Google logo SVGs
      const allSvgs = doc.querySelectorAll("svg");
      for (const svg of allSvgs) {
        if (this.isGoogleLogoSvg(svg)) {
          return svg;
        }
      }

      return null;
    },

    /**
     * Determines if an SVG element is likely the Google logo
     * Uses multiple heuristics for resilience
     */
    isGoogleLogoSvg: function (svg) {
      if (!svg) return false;

      // Check 1: Reasonable dimensions (Google logo is typically square-ish)
      const viewBox = svg.getAttribute("viewBox");
      const width = svg.getAttribute("width");
      const height = svg.getAttribute("height");

      // Look for square or near-square dimensions
      const hasSquareDimensions =
        (viewBox && /^0\s+0\s+\d+\s+\d+$/.test(viewBox.trim())) ||
        (width && height && Math.abs(parseInt(width) - parseInt(height)) <= 10);

      if (!hasSquareDimensions) return false;

      // Check 2: Has multiple colored paths (Google logo has 4 colors)
      const paths = svg.querySelectorAll('path[fill], path[style*="fill"]');
      if (paths.length < 3) return false; // At least 3 colored paths

      // Check 3: Contains Google brand colors
      let googleColorCount = 0;
      const seenColors = new Set();

      for (const path of paths) {
        const fill =
          path.getAttribute("fill") ||
          (path.getAttribute("style") && path.getAttribute("style").match(/fill:\s*([^;]+)/)?.[1]);

        const normalizedColor = this.normalizeColor(fill?.trim());
        if (normalizedColor && !seenColors.has(normalizedColor)) {
          seenColors.add(normalizedColor);
          googleColorCount++;
        }
      }

      // Google logo should have at least 3 of the 4 brand colors
      return googleColorCount >= 3;
    },

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
      const googleLogoSvg = this.detectGoogleLogoSvg(doc);
      if (googleLogoSvg) {
        console.log(`${Utils.getPrefix()} Detected Pro plan via Google logo SVG`);
        return "Pro";
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
      // Look for upgrade buttons using multiple strategies
      const upgradeButtonSelectors = [
        'upsell-button button[data-test-id="bard-upsell-menu-button"]', // Current selector
        'button[aria-label*="upgrade" i]', // Any button with "upgrade" in aria-label
        'button[aria-label*="Upgrade" i]', // Case variations
        '[data-test-id*="upsell"] button', // Any upsell component button
      ];

      for (const selector of upgradeButtonSelectors) {
        try {
          const upgradeButton = doc.querySelector(selector);
          if (upgradeButton) {
            const ariaLabel = upgradeButton.getAttribute("aria-label") || "";
            const textContent = upgradeButton.textContent || "";
            const title = upgradeButton.getAttribute("title") || "";

            const hasUpgradeText = [ariaLabel, textContent, title].some((text) =>
              text.toLowerCase().includes("upgrade")
            );

            if (hasUpgradeText) {
              console.log(`${Utils.getPrefix()} Detected Free plan via upgrade button (${selector})`);
              return "Free";
            }
          }
        } catch (e) {
          // Some selectors might not be supported, continue to next
          continue;
        }
      }

      // Additional strategy: Find buttons by text content using broader selector
      try {
        const allButtons = doc.querySelectorAll("button");
        for (const button of allButtons) {
          const textContent = button.textContent || "";
          if (textContent.toLowerCase().includes("upgrade")) {
            console.log(`${Utils.getPrefix()} Detected Free plan via button text content`);
            return "Free";
          }
        }
      } catch (e) {
        // Continue if this approach fails
      }

      // --- 4. Detect "Gemini Free" as fallback (If account area exists but no Pro indicators) ---
      // Use multiple strategies to find account area
      const accountSelectors = [
        '[aria-label*="Google Account" i]', // Most semantic and reliable
        '.gb_B[aria-label*="Google Account" i]', // Current implementation
        '[class*="gb_"][aria-label*="account" i]', // Google bar with account reference
        'a[href*="accounts.google.com"]', // Link to Google accounts
        '[aria-label*="account" i]:has(img)', // Any account element with profile image
      ];

      for (const selector of accountSelectors) {
        try {
          const accountArea = doc.querySelector(selector);
          if (accountArea) {
            console.log(
              `${Utils.getPrefix()} Detected Free plan as fallback (account area found via ${selector} but no Pro indicators)`
            );
            return "Free";
          }
        } catch (e) {
          // Some selectors might not be supported, continue to next
          continue;
        }
      }

      // --- 5. Final fallback ---
      // If no account area or plan indicators are found
      console.warn(`${Utils.getPrefix()} Could not determine Gemini plan from any known indicators`);
      return null;
    },

    /**
     * Normalizes a tool name to a consistent format.
     * Matches against known tool names, similar to model normalization.
     *
     * @param {string} rawToolName - The raw tool name from the UI
     * @returns {string} - The normalized tool name
     */
    normalizeTool: function (rawToolName) {
      if (!rawToolName) return null;

      // Sort keys by length (longest first) to match more specific names first
      const sortedKeys = Object.keys(TOOL_NAMES).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        // Case-insensitive check if the raw name contains the key
        if (rawToolName.toLowerCase().includes(key.toLowerCase())) {
          console.log(`${Utils.getPrefix()} Normalized tool: "${rawToolName}" -> "${TOOL_NAMES[key]}"`);
          return TOOL_NAMES[key];
        }
      }

      // Fallback: return raw name if no match found
      console.log(`${Utils.getPrefix()} Tool "${rawToolName}" didn't match known tools, using raw name`);
      return rawToolName;
    },

    /**
     * Checks if any tools are activated in the toolbox drawer.
     * Uses the new Nov 2025 UI structure with deselect buttons.
     * All tools from the tool selection UI are treated as tools (not models).
     * Models are only Fast/Thinking (or legacy versions).
     *
     * @returns {string|null} - The activated tool name, or null if no tool is activated
     */
    checkForSpecialTools: function () {
      console.log(`${Utils.getPrefix()} Checking for activated tools...`);

      // NEW: Check for deselect button (indicates an active tool in Nov 2025+ UI)
      const deselectButton = document.querySelector("button.toolbox-drawer-item-deselect-button");

      if (deselectButton) {
        // Method 1: Parse from aria-label (most reliable)
        const ariaLabel = deselectButton.getAttribute("aria-label") || "";
        const match = ariaLabel.match(/^Deselect (.+)$/);

        if (match) {
          const toolName = match[1];
          console.log(`${Utils.getPrefix()} Found activated tool via aria-label: "${toolName}"`);
          return this.normalizeTool(toolName);
        }

        // Method 2: Fallback to label text
        const labelElement = deselectButton.querySelector(".toolbox-drawer-item-deselect-button-label");
        if (labelElement && labelElement.textContent) {
          const labelText = labelElement.textContent.trim();
          if (labelText) {
            console.log(`${Utils.getPrefix()} Found activated tool via label: "${labelText}"`);
            return this.normalizeTool(labelText);
          }
        }
      }

      // LEGACY: Check for old UI structure (pre-Nov 2025)
      const activatedButtons = document.querySelectorAll(
        'button.toolbox-drawer-item-button.is-selected[aria-pressed="true"]'
      );
      console.log(
        `${Utils.getPrefix()} Found ${activatedButtons.length} activated tool buttons (legacy check)`
      );

      for (const button of activatedButtons) {
        const labelElement = button.querySelector(".toolbox-drawer-button-label");
        if (!labelElement || !labelElement.textContent) continue;

        const buttonText = labelElement.textContent.trim();
        if (!buttonText) continue;
        console.log(`${Utils.getPrefix()} Found activated button with text: "${buttonText}"`);
        return this.normalizeTool(buttonText);
      }

      // Alternative legacy detection via icons
      const toolboxDrawer = document.querySelector("toolbox-drawer");
      if (toolboxDrawer) {
        // Try to find Deep Research button via icon
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

        // Try to find Video button via icon
        const videoIcon = toolboxDrawer.querySelector('mat-icon[data-mat-icon-name="movie"]');
        if (videoIcon) {
          const videoButton = videoIcon.closest(
            'button.toolbox-drawer-item-button.is-selected[aria-pressed="true"]'
          );
          if (videoButton) {
            console.log(`${Utils.getPrefix()} Video tool is activated (detected via icon)`);
            return "Create videos";
          }
        }
      }

      return null;
    },

    /**
     * Attempts to detect the currently selected Gemini model from the UI.
     * Tries multiple selector strategies to find the model name.
     * Also checks for activated tools and returns both model and tool information.
     *
     * Models are always Fast/Thinking (or legacy versions).
     * Tools are everything from the tool selection UI (Deep Research, Create images, Create videos, etc.)
     *
     * @returns {{model: string, tool: string|null}} - Object with detected model name and optional tool
     */
    getCurrentModelName: function () {
      console.log(`${Utils.getPrefix()} Attempting to get current model name...`);

      // Check for activated tools (all tools from the tool selection UI)
      const activatedTool = this.checkForSpecialTools();
      if (activatedTool) {
        console.log(`${Utils.getPrefix()} Tool activated: ${activatedTool}`);
      }

      // Always detect the underlying model from the UI (Fast/Thinking)
      let rawText = null;
      let foundVia = null;

      // Try #1: New input area model switcher (Nov 2025+)
      // Model switcher moved from top menu to inside the chat input area
      const inputAreaSwitcher = document.querySelector(
        "bard-mode-switcher .logo-pill-label-container.input-area-switch-label span"
      );
      if (inputAreaSwitcher && inputAreaSwitcher.textContent) {
        rawText = inputAreaSwitcher.textContent.trim();
        foundVia = "Input Area Model Switcher";
        console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
      } else {
        console.log(`${Utils.getPrefix()} Model not found via Input Area Model Switcher.`);
        // Try #2: Generic bard-mode-switcher label container
        const modeSwitcherLabel = document.querySelector(
          "bard-mode-switcher .logo-pill-label-container span:first-child"
        );
        if (modeSwitcherLabel && modeSwitcherLabel.textContent) {
          rawText = modeSwitcherLabel.textContent.trim();
          foundVia = "Mode Switcher Label";
          console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
        } else {
          console.log(`${Utils.getPrefix()} Model not found via Mode Switcher Label.`);
          // Try #3: Legacy button structure
          const modelButton = document.querySelector(
            "button.gds-mode-switch-button.mat-mdc-button-base .logo-pill-label-container span"
          );
          if (modelButton && modelButton.textContent) {
            rawText = modelButton.textContent.trim();
            foundVia = "Legacy Button Structure";
            console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
          } else {
            console.log(`${Utils.getPrefix()} Model not found via Legacy Button Structure.`);
            // Try #4: data-test-id
            const modelElement = document.querySelector(
              'bard-mode-switcher [data-test-id="attribution-text"] span'
            );
            if (modelElement && modelElement.textContent) {
              rawText = modelElement.textContent.trim();
              foundVia = "Data-Test-ID";
              console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
            } else {
              console.log(`${Utils.getPrefix()} Model not found via Data-Test-ID.`);
              // Try #5: Fallback selector
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
        }
      }

      let model = "Unknown";
      if (rawText) {
        const sortedKeys = Object.keys(MODEL_NAMES).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
          if (rawText.startsWith(key)) {
            model = MODEL_NAMES[key];
            console.log(`${Utils.getPrefix()} Matched known model: "${model}" from raw text "${rawText}"`);
            break;
          }
        }
        if (model === "Unknown") {
          // Log fallback to raw text with standard prefix
          console.log(
            `${Utils.getPrefix()} Raw text "${rawText}" didn't match known prefixes, using raw text as model name.`
          );
          model = rawText;
        }
      } else {
        // Log warning using standard prefix
        console.warn(`${Utils.getPrefix()} Could not determine current model name from any known selector.`);
      }

      // Return both model and tool
      return { model, tool: activatedTool };
    },
  };

  window.GeminiHistory_ModelDetector = ModelDetector;
})();
