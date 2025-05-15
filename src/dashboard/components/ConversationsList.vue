<template>
  <div class="conversations-container">
    <div class="conversation-header">
      <h2>Conversations <span id="conversationCount">({{ conversations.length }})</span></h2>
      <div class="sorting">
        <label for="sortBy">Sort by:</label>
        <select id="sortBy" 
          :value="currentSortBy" 
          @change="$emit('update:currentSortBy', $event.target.value)"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="title-asc">Title (A-Z)</option>
          <option value="title-desc">Title (Z-A)</option>
          <option value="model">Model</option>
        </select>
      </div>
    </div>
    
    <div class="conversation-list">
      <div v-if="conversations.length === 0" class="empty-state">
        <div class="empty-icon">{{ totalConversations === 0 ? '📋' : '🤷' }}</div>
        <h3>{{ totalConversations === 0 ? 'No Conversations Found' : 'No Conversations Match Filters' }}</h3>
        <p>{{ totalConversations === 0 ? 'Your conversation history will appear here once you chat with Gemini.' : 'Try adjusting your search or filter criteria.' }}</p>
        <button v-if="totalConversations === 0" @click="$emit('start-chat')" class="button primary-button">Start a Gemini Chat</button>
        <button v-else @click="$emit('reset-filters')" class="button">Clear Filters</button>
      </div>
      
      <div v-else>
        <div v-for="entry in conversations" :key="entry.url" class="conversation-item" @click="$emit('show-details', entry)">
          <div class="conversation-title">{{ entry.title || 'Untitled Conversation' }}</div>
          <div class="conversation-meta">
            <div class="meta-left">
              <span>{{ formatDate(entry.timestamp) }}</span>
              <span class="conversation-model">{{ entry.model || 'Unknown' }}</span>
            </div>
            <div class="meta-right">
              <span v-if="entry.accountName && entry.accountName !== 'Unknown'" class="conversation-account">
                {{ entry.accountEmail || entry.accountName }}
              </span>
              <span v-if="entry.attachedFiles && entry.attachedFiles.length > 0" class="conversation-files">
                {{ entry.attachedFiles.length }} file{{ entry.attachedFiles.length !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { dayjsFormatDate } from '../../lib/utils.js';

// Define props
defineProps({
  conversations: {
    type: Array,
    default: () => []
  },
  totalConversations: {
    type: Number,
    default: 0
  },
  currentSortBy: {
    type: String,
    default: 'date-desc'
  }
});

// Define emits
defineEmits([
  'update:currentSortBy',
  'show-details',
  'start-chat',
  'reset-filters'
]);

// Format date
function formatDate(timestamp) {
  return dayjsFormatDate(timestamp);
}
</script>

<style scoped>
.conversations-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.conversation-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.sorting {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sorting label {
  color: var(--text-light);
  font-size: 0.9rem;
}

.sorting select {
  padding: 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
}

.conversation-list {
  overflow-y: auto;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.conversation-item {
  background-color: var(--card-bg);
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  box-shadow: var(--card-shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.conversation-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
}

.conversation-title {
  font-weight: 500;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-light);
}

.meta-left, .meta-right {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.conversation-model {
  padding: 2px 8px;
  background-color: var(--tag-bg);
  border-radius: 12px;
  font-size: 0.75rem;
}

.conversation-account, .conversation-files {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  height: 100%;
  color: var(--text-light);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0;
  margin-bottom: 0.5rem;
}

.empty-state p {
  margin: 0;
  margin-bottom: 1.5rem;
}
</style>
