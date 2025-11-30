<template>
  <div class="modal" :class="{ active: show }">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ conversation.title || "Conversation Details" }}</h2>
        <button class="close-button" @click="emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="detail-group">
          <h3>Title</h3>
          <p>{{ conversation.title || "Untitled Conversation" }}</p>
        </div>
        <div class="detail-group">
          <h3>Date</h3>
          <p>{{ conversation.timestamp ? formatDateTime(conversation.timestamp) : "-" }}</p>
        </div>
        <div class="detail-group">
          <h3>Model</h3>
          <p>{{ displayModelAndTool }}</p>
        </div>
        <div class="detail-group">
          <h3>Gemini Plan</h3>
          <p>
            <span
              v-if="conversation.geminiPlan"
              class="conversation-plan"
              :class="conversation.geminiPlan.toLowerCase()"
            >
              {{ conversation.geminiPlan }}
            </span>
            <span v-else>Unknown</span>
          </p>
        </div>
        <div class="detail-group">
          <h3>Account</h3>
          <p>
            {{
              conversation.accountName && conversation.accountEmail
                ? `${conversation.accountName} (${conversation.accountEmail})`
                : conversation.accountName || conversation.accountEmail || "Unknown"
            }}
          </p>
        </div>
        <div class="detail-group" v-if="conversation.gemName || conversation.gemId">
          <h3>Gem</h3>
          <p v-if="conversation.gemName">{{ conversation.gemName }}</p>
          <p v-if="conversation.gemId && !conversation.gemName">ID: {{ conversation.gemId }}</p>
          <p v-if="conversation.gemUrl">
            <a :href="conversation.gemUrl" target="_blank" class="gem-link">View Gem</a>
          </p>
        </div>
        <div class="detail-group">
          <h3>Prompt</h3>
          <p>{{ conversation.prompt || "No prompt data available" }}</p>
        </div>
        <div class="detail-group" v-if="conversation.attachedFiles && conversation.attachedFiles.length > 0">
          <h3>Attached Files</h3>
          <ul>
            <li v-for="file in conversation.attachedFiles" :key="file">{{ file }}</li>
          </ul>
        </div>
      </div>
      <div class="modal-footer">
        <button class="button" @click="emit('close')">Close</button>
        <a v-if="conversation.url" :href="conversation.url" target="_blank" class="button primary-button"
          >Open in Gemini</a
        >
        <button
          v-else
          class="button primary-button disabled"
          disabled
          title="No URL available for this conversation"
        >
          Open in Gemini
        </button>
        <button
          v-if="conversation.url"
          class="button secondary-button copy-url-button"
          :class="{ copied: isCopied }"
          @click="copyUrlToClipboard"
          title="Copy conversation URL to clipboard"
        >
          <span v-if="isCopied">✓</span>
          <span v-else>Copy URL</span>
        </button>
        <button class="button danger-button" @click="deleteConversation">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, onUnmounted, ref, computed } from "vue";
import { parseTimestamp, Logger, formatModelAndTool } from "../../lib/utils.js";

// Define props
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  conversation: {
    type: Object,
    default: () => ({}),
  },
});

// Define emits
const emit = defineEmits(["close", "delete", "copy-url"]);

// Reactive state
const isCopied = ref(false);

// Computed properties
const displayModelAndTool = computed(() => {
  return formatModelAndTool(props.conversation);
});

// Component lifecycle hooks
onMounted(() => {
  Logger.debug("ConversationDetail", "Component mounted", {
    conversationId: props.conversation.id,
    show: props.show,
  });
});

onUnmounted(() => {
  Logger.debug("ConversationDetail", "Component unmounted");
});

// Watch for conversation modal visibility changes
// Format datetime using dayjs
function formatDateTime(timestamp) {
  Logger.debug("ConversationDetail", "Formatting timestamp", { timestamp });
  const formatted = parseTimestamp(timestamp).format("llll");

  if (formatted === "Invalid Date") {
    Logger.warn("ConversationDetail", "Invalid timestamp encountered", { timestamp });
    return "Invalid Date";
  }

  return formatted;
}

// Actions
function deleteConversation() {
  Logger.log("ConversationDetail", "User requested conversation deletion", {
    conversationId: props.conversation.id,
    title: props.conversation.title || "Untitled Conversation",
    timestamp: props.conversation.timestamp,
  });

  emit("delete", props.conversation);

  Logger.debug("ConversationDetail", "Delete event emitted");
}

function copyUrlToClipboard() {
  if (!props.conversation.url) {
    Logger.warn("ConversationDetail", "Attempted to copy URL but none available");
    return;
  }

  Logger.log("ConversationDetail", "Copying URL to clipboard", {
    url: props.conversation.url,
    conversationId: props.conversation.id,
  });

  navigator.clipboard
    .writeText(props.conversation.url)
    .then(() => {
      Logger.debug("ConversationDetail", "URL copied to clipboard successfully");
      emit("copy-url", props.conversation.url);

      // Set the copied state to true
      isCopied.value = true;

      // Reset the state after 1.5 seconds
      const timerId = setTimeout(() => {
        isCopied.value = false;
      }, 1500);

      onUnmounted(() => {
        clearTimeout(timerId);
      });
    })
    .catch((error) => {
      Logger.error("ConversationDetail", "Failed to copy URL to clipboard", { error });
    });
}
</script>

<style scoped>
.copy-url-button {
  position: relative;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.copy-url-button.copied {
  background-color: #4caf50; /* Green color */
  color: white;
  border-color: #4caf50;
}

.copy-url-button span {
  display: inline-block;
  transition:
    transform 0.3s ease,
    opacity 0.2s ease;
}

.copy-url-button.copied span {
  transform: scale(1.2);
}

/* Styles for detail groups, moved from dashboard.css */
.detail-group {
  margin-bottom: 15px;
}

.detail-group h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-light);
  margin-bottom: 5px;
}

.detail-group p {
  font-size: 15px;
  color: var(--text-color);
  line-height: 1.5;
  word-break: break-word; /* Ensure long words or IDs don't break layout */
}

.detail-group .conversation-plan {
  /* Contextual styling for plan badge */
  display: inline-block;
  /* Base .conversation-plan styles (bg, color, padding) are assumed to be global or inherited */
}

.detail-group ul {
  list-style-type: none; /* Remove default bullet points */
  padding-left: 0; /* Remove default padding */
  margin-left: 0; /* Explicitly set, though likely reset globally */
}

.detail-group ul li {
  padding: 5px 0;
  font-size: 14px;
  color: var(--text-color);
}

.gem-link {
  color: var(--primary-color);
  text-decoration: underline;
}
.gem-link:hover {
  color: var(--primary-dark);
}

/* Ensure modal parts are styled if not already handled by ConfirmationModal or a base modal style */
/* These are typically part of a more generic modal component, but included if this one is standalone */
.modal {
  display: none; /* Hidden by default */
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  overflow: auto; /* Enable scroll if content overflows */
}

.modal.active {
  display: flex; /* Use flexbox to center content */
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow); /* Use CSS variable for shadow */
  width: 90%;
  max-width: 600px; /* Default max-width for larger modals */
  animation: modalFadeIn 0.3s; /* Use the global animation */
}

/* Keyframes should be global or defined if this component is truly standalone */
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 18px;
  color: var(--text-color);
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-light);
}
.close-button:hover {
  color: var(--text-color);
}

.modal-body {
  padding: 20px;
  max-height: 70vh; /* Limit height and enable scroll */
  overflow-y: auto;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.button.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
