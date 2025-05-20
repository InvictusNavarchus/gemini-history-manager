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
  Logger.log("ConversationList", "Start a Gemini Chat button clicked");
  emit('startChat');
}

function openConversation(url) {
  Logger.log("ConversationList", "Opening conversation", { url });
  emit('openConversation', url);
}
</script>


