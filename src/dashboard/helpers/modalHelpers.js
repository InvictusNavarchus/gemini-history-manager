/**
 * Gemini History Manager - Dashboard Modal Helpers
 * Helper functions for modals and dialogs in the Dashboard
 */
import { Logger } from '../../lib/utils.js';
import { ref } from 'vue';

/**
 * Create modal state manager for conversation details and confirmation dialogs
 * @returns {Object} Modal state management functions
 */
export function createModalManager() {
  // Modal state
  const modalState = ref({
    conversationDetail: { 
      show: false, 
      data: {} 
    },
    confirmation: { 
      show: false, 
      title: '', 
      message: '', 
      onConfirm: null 
    }
  });
  
  /**
   * Show conversation details modal
   * @param {Object} conversation - Conversation data to display
   */
  function showConversationDetailsModal(conversation) {
    modalState.value.conversationDetail = { 
      show: true, 
      data: conversation 
    };
    Logger.log("Showing conversation details modal");
  }

  /**
   * Close conversation details modal
   */
  function closeConversationDetailsModal() {
    modalState.value.conversationDetail.show = false;
    Logger.log("Closing conversation details modal");
  }

  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Function} onConfirmCallback - Callback to execute when confirmed
   */
  function showConfirmationModal(title, message, onConfirmCallback) {
    modalState.value.confirmation = {
      show: true,
      title,
      message,
      onConfirm: onConfirmCallback
    };
    Logger.log(`Showing confirmation modal: ${title}`);
  }

  /**
   * Close confirmation dialog
   */
  function closeConfirmationModal() {
    modalState.value.confirmation.show = false;
    modalState.value.confirmation.onConfirm = null;
    Logger.log("Closing confirmation modal");
  }

  /**
   * Execute the confirmed action and close the dialog
   * @returns {Promise} A promise resolving after the confirmed action executes
   */
  async function executeConfirmedAction() {
    if (typeof modalState.value.confirmation.onConfirm === 'function') {
      Logger.log("Executing confirmed action");
      await modalState.value.confirmation.onConfirm();
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
    getModalState
  };
}

/**
 * Create a delete conversation confirmation
 * @param {Object} modalManager - Modal manager from createModalManager()
 * @param {Function} deleteFunction - Function to call when confirmed
 * @returns {Function} Function that shows confirmation dialog
 */
export function createDeleteConversationConfirmation(modalManager, deleteFunction) {
  return function confirmDeleteConversation(conversation) {
    modalManager.showConfirmationModal(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      async () => {
        await deleteFunction(conversation);
      }
    );
  };
}

/**
 * Create a clear all history confirmation
 * @param {Object} modalManager - Modal manager from createModalManager()
 * @param {Function} clearFunction - Function to call when confirmed
 * @returns {Function} Function that shows confirmation dialog
 */
export function createClearHistoryConfirmation(modalManager, clearFunction) {
  return function confirmClearAllHistory() {
    modalManager.showConfirmationModal(
      'Clear All History',
      'Are you sure you want to clear your entire conversation history? This action cannot be undone.',
      async () => {
        await clearFunction();
      }
    );
  };
}
