<template>
  <div class="history-preview">
    <h2>Recent Conversations</h2>
    <div id="recentConversations" class="conversation-list">
      <div v-if="conversations.length === 0 && !isLoading" class="empty-state">
        <p>No conversation history found.</p>
        <button @click="handleStartChat" class="button primary-button">Start a Gemini Chat</button>
      </div>
      <div v-else>
        <div v-for="entry in conversations" :key="entry.url" class="conversation-item" @click="openConversation(entry.url)">
          <div class="conversation-title">{{ entry.title || 'Untitled Conversation' }}</div>
          <div class="conversation-meta">
            <span class="conversation-date">{{ formatDateForDisplay(parseTimestamp(entry.timestamp)) }}</span>
            <span class="conversation-model">{{ entry.model || 'Unknown' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { Logger, parseTimestamp, formatDateForDisplay } from '../../lib/utils.js';

// Define props
const props = defineProps({
  conversations: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

// Define emits
const emit = defineEmits(['startChat', 'openConversation']);

// Event handlers
function handleStartChat() {
  Logger.log("Start a Gemini Chat button clicked.");
  emit('startChat');
}

function openConversation(url) {
  Logger.log(`Opening conversation: ${url}`);
  emit('openConversation', url);
}
</script>

<style scoped>
.history-preview {
  padding: 0 10px;
  margin-top: 15px;
}

.history-preview h2 {
  font-size: 16px;
  margin: 0 0 10px 0;
  color: var(--text-color);
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-item {
  background-color: var(--card-bg);
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  box-shadow: var(--card-shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.conversation-item:hover {
  background-color: var(--hover-bg);
  transform: translateY(-1px);
  box-shadow: var(--card-shadow-hover);
}

.conversation-title {
  font-weight: 500;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-light);
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--text-light);
}

.empty-state .button {
  margin-top: 10px;
}
</style>
