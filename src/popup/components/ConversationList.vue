<template>
  <div class="history-preview">
    <h2>Recent Conversations</h2>
    <div id="recentConversations" class="conversation-list">
      <div v-if="conversations.length === 0 && !isLoading" class="empty-state">
        <p>No conversation history found.</p>
        <button @click="handleStartChat" class="button primary-button">Start a Gemini Chat</button>
      </div>
      <div v-else>
        <div
          v-for="entry in conversations"
          :key="entry.url"
          class="conversation-item"
          @click="openConversation(entry.url)"
        >
          <div class="conversation-title">{{ entry.title || "Untitled Conversation" }}</div>
          <div class="conversation-meta">
            <span class="conversation-date">{{ formatDateForDisplay(parseTimestamp(entry.timestamp)) }}</span>
            <span class="conversation-model">{{ formatModelAndTool(entry) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";
import { Logger, parseTimestamp, formatDateForDisplay, formatModelAndTool } from "../../lib/utils.js";

// Define props
const props = defineProps({
  conversations: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

// Define emits
const emit = defineEmits(["startChat", "openConversation"]);

// Event handlers
function handleStartChat() {
  Logger.log("ConversationList", "Start a Gemini Chat button clicked");
  emit("startChat");
}

function openConversation(url) {
  Logger.log("ConversationList", "Opening conversation", { url });
  emit("openConversation", url);
}
</script>

<style scoped>
/* History section */
.history-preview h2 {
  font-size: 14px;
  margin-bottom: 12px;
}

.conversation-list {
  background-color: var(--card-bg);
  border-radius: 6px;
  box-shadow: var(--shadow);
  overflow-y: auto;
}

.conversation-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color var(--animation-speed);
}

.conversation-item:hover {
  background-color: var(--hover-bg);
}

.conversation-item:last-child {
  border-bottom: none;
}

.conversation-title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-light);
}

.conversation-model {
  background-color: var(--hover-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 24px 12px;
  color: var(--text-light);
}

.empty-state p {
  margin-bottom: 16px;
  font-size: 14px;
}
</style>
