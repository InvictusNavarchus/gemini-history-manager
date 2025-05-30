(function () {
  "use strict";
  const Utils = window.GeminiHistory_Utils;
  const InputExtractor = {
    /**
     * Parses text and replaces codeblocks with placeholders while preserving non-codeblock text.
     * Handles multiple codeblocks and nested backticks within codeblocks.
     *
     * @param {string} text - The text to process
     * @returns {Object} - Object with processedText and hasCodeblocks properties
     */
    _processCodeblocks: function (text) {
      const result = [];
      let position = 0;
      let codeblockCount = 0;
      let hasCodeblocks = false;

      while (position < text.length) {
        const nextCodeblockStart = text.indexOf("```", position);

        if (nextCodeblockStart === -1) {
          // No more codeblocks, add remaining text
          result.push(text.substring(position));
          break;
        }

        // Add text before the codeblock
        result.push(text.substring(position, nextCodeblockStart));

        // Find the end of this codeblock
        let codeblockEnd = nextCodeblockStart + 3;
        let foundClosing = false;

        // Skip to end of the opening line (language identifier)
        while (codeblockEnd < text.length && text[codeblockEnd] !== "\n" && text[codeblockEnd] !== "\r") {
          codeblockEnd++;
        }
        if (codeblockEnd < text.length && (text[codeblockEnd] === "\n" || text[codeblockEnd] === "\r")) {
          codeblockEnd++;
        }

        // Look for closing triple backticks
        while (codeblockEnd < text.length) {
          const nextTripleBacktick = text.indexOf("```", codeblockEnd);

          if (nextTripleBacktick === -1) {
            // No closing backticks found, treat rest as unclosed codeblock
            break;
          }

          // Check if this is at the start of a line (proper closing)
          const lineStart =
            nextTripleBacktick === 0 ||
            text[nextTripleBacktick - 1] === "\n" ||
            text[nextTripleBacktick - 1] === "\r";

          if (lineStart) {
            // Check if there's only whitespace or newline after the closing backticks
            let afterBackticks = nextTripleBacktick + 3;
            while (
              afterBackticks < text.length &&
              text[afterBackticks] !== "\n" &&
              text[afterBackticks] !== "\r" &&
              /\s/.test(text[afterBackticks])
            ) {
              afterBackticks++;
            }

            if (
              afterBackticks >= text.length ||
              text[afterBackticks] === "\n" ||
              text[afterBackticks] === "\r"
            ) {
              // Valid closing backticks
              codeblockEnd = afterBackticks;
              foundClosing = true;
              break;
            }
          }

          // Not a valid closing, continue searching
          codeblockEnd = nextTripleBacktick + 3;
        }

        if (!foundClosing) {
          // Unclosed codeblock, take everything to the end
          codeblockEnd = text.length;
        }

        // Replace the codeblock with a placeholder
        codeblockCount++;
        result.push(`[codeblock-${codeblockCount}]`);
        hasCodeblocks = true;
        position = codeblockEnd;

        console.log(
          `${Utils.getPrefix()} Found codeblock ${codeblockCount} from position ${nextCodeblockStart} to ${codeblockEnd}`
        );
      }

      const processedText = result.join("").trim();
      console.log(
        `${Utils.getPrefix()} Processed ${codeblockCount} codeblock(s). Final text: "${processedText}"`
      );

      return {
        processedText,
        hasCodeblocks,
        codeblockCount,
      };
    },

    /**
     * Extracts the prompt text from the input area.
     * If the prompt contains code blocks delimited by triple backticks,
     * they will be replaced with placeholders while preserving other text.
     *
     * @returns {string} - The extracted prompt text or empty string if not found
     */
    getPromptText: function () {
      const promptElement = document.querySelector("rich-textarea .ql-editor");
      if (promptElement) {
        const text = promptElement.innerText.trim();

        // Process codeblocks
        const result = this._processCodeblocks(text);

        if (result.hasCodeblocks) {
          console.log(
            `${Utils.getPrefix()} Extracted prompt text with ${result.codeblockCount} codeblock(s): "${result.processedText}"`
          );
          return result.processedText;
        }

        console.log(`${Utils.getPrefix()} Extracted prompt text: "${text}"`);
        return text;
      } else {
        console.warn(
          `${Utils.getPrefix()} Could not find prompt input element ('rich-textarea .ql-editor').`
        );
        return ""; // Return empty string if not found
      }
    },

    /**
     * Extracts the original prompt text limited to 200 characters.
     * This is useful for title comparison when the main getPromptText() returns
     * a truncated version with [attached blockcode] placeholder.
     *
     * @returns {string} - The original prompt text limited to 200 characters, or empty string if not found
     */
    getOriginalPromptText: function () {
      const promptElement = document.querySelector("rich-textarea .ql-editor");
      if (promptElement) {
        const text = promptElement.innerText.trim();

        // Limit to 200 characters to avoid memory issues and provide reasonable comparison length
        const limitedText = text.length > 200 ? text.substring(0, 200) : text;

        console.log(
          `[${Utils.getPrefix()}] Extracted original prompt text (limited to 200 chars): "${limitedText}"`
        );
        return limitedText;
      } else {
        console.warn(
          `${Utils.getPrefix()} Could not find prompt input element for original text extraction.`
        );
        return "";
      }
    },

    /**
     * Extracts the filenames of attached files from the UI.
     *
     * @returns {string[]} - Array of filenames (strings) or empty array if none found
     */
    getAttachedFiles: function () {
      const fileElements = document.querySelectorAll(
        'uploader-file-preview-container .file-preview [data-test-id="file-name"]'
      );
      if (fileElements.length > 0) {
        const filenames = Array.from(fileElements).map((el) => {
          // Prefer the 'title' attribute as it usually contains the full name
          return el.getAttribute("title") || el.innerText.trim();
        });
        console.log(`${Utils.getPrefix()} Extracted attached filenames:`, filenames);
        return filenames;
      } else {
        console.log(`${Utils.getPrefix()} No attached file elements found.`);
        return []; // Return empty array if none found
      }
    },

    /**
     * Extracts the user account name and email from the UI.
     *
     * @returns {Object} - Object with name and email properties
     */
    getAccountInfo: function () {
      console.log(`${Utils.getPrefix()} Attempting to extract account information...`);

      // Strategy 1: Find by link to accounts.google.com with aria-label containing email
      const accountLinks = Array.from(document.querySelectorAll('a[href*="accounts.google.com"]'));
      let accountElement = null;
      let ariaLabel = null;

      // Check links to accounts.google.com that have aria-labels
      for (const link of accountLinks) {
        const label = link.getAttribute("aria-label");
        if (label && label.indexOf("@") !== -1) {
          accountElement = link;
          ariaLabel = label;
          console.log(
            `${Utils.getPrefix()} Found account element via accounts.google.com link with email in aria-label`
          );
          break;
        }
      }

      // Strategy 2: Find by profile image
      if (!accountElement) {
        const profileImages = document.querySelectorAll("img.gbii, img.gb_P");
        for (const img of profileImages) {
          const parent = img.closest("a[aria-label]");
          if (parent) {
            const label = parent.getAttribute("aria-label");
            if (label && label.indexOf("@") !== -1) {
              accountElement = parent;
              ariaLabel = label;
              console.log(
                `[${Utils.getPrefix()}] Found account element via profile image with parent having email in aria-label`
              );
              break;
            }
          }
        }
      }

      // Strategy 3: Find by user menu structure
      if (!accountElement) {
        // Look for common Google account menu container classes
        const potentialContainers = document.querySelectorAll(".gb_z, .gb_D, .gb_Za");
        for (const container of potentialContainers) {
          const accountLink = container.querySelector("a[aria-label]");
          if (accountLink) {
            const label = accountLink.getAttribute("aria-label");
            if (label && label.indexOf("@") !== -1) {
              accountElement = accountLink;
              ariaLabel = label;
              console.log(`${Utils.getPrefix()} Found account element via container class structure`);
              break;
            }
          }
        }
      }

      // If we still haven't found it, try a broader approach
      if (!accountElement) {
        // Look for ANY element with an aria-label containing an email address
        const elementsWithAriaLabel = document.querySelectorAll("[aria-label]");
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

        for (const el of elementsWithAriaLabel) {
          const label = el.getAttribute("aria-label");
          if (label && emailRegex.test(label)) {
            accountElement = el;
            ariaLabel = label;
            console.log(`${Utils.getPrefix()} Found account element via generic aria-label search`);
            break;
          }
        }
      }

      // If we found an element with account info, parse it
      if (accountElement && ariaLabel) {
        console.log(`${Utils.getPrefix()} Found aria-label with potential account info: "${ariaLabel}"`);
        try {
          // Extract email using regex
          const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
          const emailMatch = ariaLabel.match(emailRegex);

          if (!emailMatch) {
            console.warn(`${Utils.getPrefix()} Could not find email in aria-label`);
            return { name: "Unknown", email: "Unknown" };
          }

          const email = emailMatch[0];

          // Extract name - try with parentheses pattern first
          let name = "Unknown";
          const parenthesesPattern = /[^:]*:\s*(.*?)\s+\([^)]*@[^)]*\)/i;
          const nameMatch = ariaLabel.match(parenthesesPattern);

          if (nameMatch && nameMatch[1]) {
            name = nameMatch[1].trim();
          } else {
            // Alternative: Try to extract name by removing email and common prefixes
            const withoutEmail = ariaLabel.replace(email, "").trim();
            const colonIndex = withoutEmail.lastIndexOf(":");

            if (colonIndex !== -1) {
              name = withoutEmail.substring(colonIndex + 1).trim();
              // Clean up remaining punctuation and parentheses
              name = name.replace(/^\s*[(:\-–—]\s*|\s*[)\-–—]\s*$/g, "");
            }
          }

          console.log(
            `${Utils.getPrefix()} Successfully extracted account info - Name: "${name}", Email: "${email}"`
          );
          return { name, email };
        } catch (e) {
          // Log error using standard prefix
          console.error(`${Utils.getPrefix()} Error parsing account information:`, e);
          return { name: "Unknown", email: "Unknown" };
        }
      }

      console.warn(`${Utils.getPrefix()} Could not find any element with account information`);
      return { name: "Unknown", email: "Unknown" };
    },
  };

  window.GeminiHistory_InputExtractor = InputExtractor;
})();
