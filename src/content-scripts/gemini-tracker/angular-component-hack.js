/**
 * Helper functions to manipulate Angular components directly
 */
(function() {
  "use strict";

  const Logger = window.GeminiHistoryLogger;

  const AngularComponentHack = {
    /**
     * Attempts to directly modify Angular component state
     * @param {HTMLElement} button - The button element to hack
     */
    tryAngularComponentHack: function(button) {
      try {
        // Try to access Angular component instance through __ngContext__
        if (button.__ngContext__) {
          Logger.log("gemini-tracker", "[DEBUG ENHANCE] Found Angular context on button");
          
          // Try to modify the component properties directly
          // This is a hack to directly modify component state through debug properties
          const context = button.__ngContext__;
          
          // Look for component instances in the context that might control the button state
          let componentsFound = false;
          if (Array.isArray(context)) {
            for (let i = 0; i < context.length; i++) {
              const item = context[i];
              if (item && typeof item === 'object') {
                // Look for properties that might control button state
                const stateProps = ['disabled', 'isDisabled', 'canSubmit', 'buttonEnabled', 'enabled'];
                for (const prop of stateProps) {
                  if (prop in item) {
                    const oldValue = item[prop];
                    // Try to set it to enabled
                    if (typeof oldValue === 'boolean') {
                      item[prop] = prop.includes('disabled') ? false : true;
                      Logger.log("gemini-tracker", `[DEBUG ENHANCE] Modified Angular component property ${prop}: ${oldValue} -> ${item[prop]}`);
                      componentsFound = true;
                    }
                  }
                }
                
                // Force Angular change detection if possible
                if ('markForCheck' in item && typeof item.markForCheck === 'function') {
                  item.markForCheck();
                  Logger.log("gemini-tracker", "[DEBUG ENHANCE] Called markForCheck on component");
                }
                
                if ('detectChanges' in item && typeof item.detectChanges === 'function') {
                  item.detectChanges();
                  Logger.log("gemini-tracker", "[DEBUG ENHANCE] Called detectChanges on component");
                }
              }
            }
          }
          
          if (!componentsFound) {
            Logger.log("gemini-tracker", "[DEBUG ENHANCE] No suitable component properties found to modify");
          }
        }
      } catch (e) {
        Logger.warn("gemini-tracker", `Error in Angular component hack: ${e.message}`);
      }
    }
  };

  // Export the functions
  window.GeminiHistory_AngularComponentHack = AngularComponentHack;
})();
