/**
 * Gemini History Manager - Dashboard Modal Helpers
 * Helper functions for modals and dialogs in the Dashboard
 */
import { Logger } from "../../lib/utils.js";
import { ref } from "vue";

/**
 * Creates a modal state manager for conversation details and confirmation dialogs.
 * Provides functions to show/hide modals and manage state for confirmations.
 *
 * @returns {Object} Modal state management functions and refs.
 */
export function createModalManager() {
  // Modal state
  const modalState = ref({
    conversationDetail: {
      show: false,
      data: {},
    },
    confirmation: {
      show: false,
      title: "",
      message: "",
      onConfirm: null,
    },
  });

  /**
   * Show conversation details modal
   * @param {Object} conversation - Conversation data to display
   */
  function showConversationDetailsModal(conversation) {
    Logger.log(
      "modalHelpers",
      `Opening conversation details modal for conversation with title: "${conversation?.title || "Untitled"}"`
    );
    modalState.value.conversationDetail = {
      show: true,
      data: conversation,
    };
    Logger.debug(
      "modalHelpers",
      `Modal data: ${JSON.stringify({
        id: conversation?.id,
        timestamp: conversation?.timestamp,
        model: conversation?.model,
        tool: conversation?.tool,
      })}`
    );
  }

  /**
   * Close conversation details modal
   */
  function closeConversationDetailsModal() {
    const conversationId = modalState.value.conversationDetail.data?.id;
    const conversationTitle = modalState.value.conversationDetail.data?.title || "Untitled";
    Logger.log("modalHelpers", `Closing conversation details modal for: "${conversationTitle}"`);
    modalState.value.conversationDetail.show = false;
    Logger.debug("modalHelpers", `Modal closed for conversation ID: ${conversationId}`);
  }

  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Function} onConfirmCallback - Callback to execute when confirmed
   */
  function showConfirmationModal(title, message, onConfirmCallback) {
    Logger.log("modalHelpers", `Opening confirmation modal: "${title}"`);
    Logger.debug("modalHelpers", `Confirmation message: "${message}"`);

    modalState.value.confirmation = {
      show: true,
      title,
      message,
      onConfirm: onConfirmCallback,
    };

    Logger.log("modalHelpers", `Confirmation modal displayed with title: "${title}"`);
    Logger.debug("modalHelpers", `Confirmation callback type: ${typeof onConfirmCallback}`);
  }

  /**
   * Close confirmation dialog
   */
  function closeConfirmationModal() {
    const title = modalState.value.confirmation.title;
    Logger.log("modalHelpers", `Closing confirmation modal: "${title}"`);

    modalState.value.confirmation.show = false;
    modalState.value.confirmation.onConfirm = null;

    Logger.debug("modalHelpers", "Confirmation modal state reset and closed");
  }

  /**
   * Execute the confirmed action and close the dialog
   * @returns {Promise} A promise resolving after the confirmed action executes
   */
  async function executeConfirmedAction() {
    const title = modalState.value.confirmation.title;
    Logger.log("modalHelpers", `Executing confirmed action for: "${title}"`);

    if (typeof modalState.value.confirmation.onConfirm === "function") {
      Logger.log("modalHelpers", `Executing callback for confirmation: "${title}"`);
      try {
        await modalState.value.confirmation.onConfirm();
        Logger.log("modalHelpers", `Successfully executed confirmation callback for: "${title}"`);
      } catch (error) {
        Logger.error("modalHelpers", `Error executing confirmation callback for: "${title}"`, error);
        throw error; // Re-throw to allow caller handling
      }
    } else {
      Logger.warn("modalHelpers", `No callback function defined for confirmation: "${title}"`);
    }

    closeConfirmationModal();
  }

  /**
   * Get current modal state
   * @returns {Object} Current modal state
   */
  function getModalState() {
    return modalState.value;
  }

  return {
    showConversationDetailsModal,
    closeConversationDetailsModal,
    showConfirmationModal,
    closeConfirmationModal,
    executeConfirmedAction,
    getModalState,
  };
}

/**
 * Creates a delete conversation confirmation dialog trigger.
 * Returns a function that, when called, shows the confirmation dialog and calls deleteFunction on confirm.
 *
 * @param {Object} modalManager - Modal manager from createModalManager().
 * @param {Function} deleteFunction - Function to call when confirmed.
 * @returns {Function} Function that shows confirmation dialog.
 */
export function createDeleteConversationConfirmation(modalManager, deleteFunction) {
  Logger.log("modalHelpers", "Creating delete conversation confirmation handler");

  /**
   * Delete conversation confirmation callback.
   * @param {Object} conversation - Conversation data to delete.
   */
  return function confirmDeleteConversation(conversation) {
    Logger.log(
      "modalHelpers",
      `Preparing delete confirmation for conversation: "${conversation?.title || "Untitled"}"`
    );
    Logger.debug(
      "modalHelpers",
      `Conversation to delete - ID: ${conversation?.id}, Timestamp: ${conversation?.timestamp}`
    );

    // Create a plain JavaScript object copy of the conversation to avoid Proxy cloning issues
    const plainConversation = JSON.parse(JSON.stringify(conversation));
    Logger.debug("modalHelpers", "Created plain conversation object to avoid Proxy issues");

    modalManager.showConfirmationModal(
      "Delete Conversation",
      "Are you sure you want to delete this conversation? This action cannot be undone.",
      async () => {
        Logger.log(
          "modalHelpers",
          `Executing delete for conversation: "${plainConversation?.title || "Untitled"}"`
        );
        try {
          await deleteFunction(plainConversation);
          Logger.log(
            "modalHelpers",
            `Successfully deleted conversation: "${plainConversation?.title || "Untitled"}"`
          );
        } catch (error) {
          Logger.error(
            "modalHelpers",
            `Error deleting conversation: "${plainConversation?.title || "Untitled"}"`,
            error
          );
          throw error;
        }
      }
    );
  };
}

/**
 * Creates a clear all history confirmation dialog trigger.
 * Returns a function that, when called, shows the confirmation dialog and calls clearFunction on confirm.
 *
 * @param {Object} modalManager - Modal manager from createModalManager().
 * @param {Function} clearFunction - Function to call when confirmed.
 * @returns {Function} Function that shows confirmation dialog.
 */
export function createClearHistoryConfirmation(modalManager, clearFunction) {
  Logger.log("modalHelpers", "Creating clear history confirmation handler");

  /**
   * Clear all history confirmation callback.
   */
  return function confirmClearAllHistory() {
    Logger.log("modalHelpers", "Showing clear all history confirmation dialog");

    modalManager.showConfirmationModal(
      "Clear All History",
      "Are you sure you want to clear your entire conversation history? This action cannot be undone.",
      async () => {
        Logger.log("modalHelpers", "User confirmed clearing all history");
        try {
          await clearFunction();
          Logger.log("modalHelpers", "Successfully cleared all conversation history");
        } catch (error) {
          Logger.error("modalHelpers", "Failed to clear conversation history", error);
          throw error;
        }
      }
    );

    Logger.debug("modalHelpers", "Clear history confirmation dialog displayed");
  };
}
