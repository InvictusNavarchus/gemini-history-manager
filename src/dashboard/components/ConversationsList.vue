<template>
  <div class="conversations-container">
    <div class="conversation-header">
      <h2>
        Conversations <span id="conversationCount">({{ conversations.length }})</span>
      </h2>
      <div class="sorting">
        <label for="sortBy">Sort by:</label>
        <select
          id="sortBy"
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
        <div class="empty-icon">{{ totalConversations === 0 ? "📋" : "🤷" }}</div>
        <h3>{{ totalConversations === 0 ? "No Conversations Found" : "No Conversations Match Filters" }}</h3>
        <p>
          {{
            totalConversations === 0
              ? "Your conversation history will appear here once you chat with Gemini."
              : "Try adjusting your search or filter criteria."
          }}
        </p>
        <button v-if="totalConversations === 0" @click="$emit('start-chat')" class="button primary-button">
          Start a Gemini Chat
        </button>
        <button v-else @click="$emit('reset-filters')" class="button">Clear Filters</button>
      </div>

      <div v-else>
        <div
          v-for="entry in conversations"
          :key="entry.url"
          class="conversation-item"
          @click="$emit('show-details', entry)"
        >
          <div class="conversation-title">{{ entry.title || "Untitled Conversation" }}</div>
          <div class="conversation-meta">
            <div class="meta-left">
              <span>{{ formatDate(entry.timestamp) }}</span>
              <span class="conversation-model">{{ entry.model || "Unknown" }}</span>
            </div>
            <div class="meta-right">
              <span v-if="entry.accountName && entry.accountName !== 'Unknown'" class="conversation-account">
                {{ entry.accountEmail || entry.accountName }}
              </span>
              <span v-if="entry.attachedFiles && entry.attachedFiles.length > 0" class="conversation-files">
                {{ entry.attachedFiles.length }} file{{ entry.attachedFiles.length !== 1 ? "s" : "" }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";
import { dayjsFormatDate } from "../../lib/utils.js";

// Define props
defineProps({
  conversations: {
    type: Array,
    default: () => [],
  },
  totalConversations: {
    type: Number,
    default: 0,
  },
  currentSortBy: {
    type: String,
    default: "date-desc",
  },
});

// Define emits
defineEmits(["update:currentSortBy", "show-details", "start-chat", "reset-filters"]);

// Format date
function formatDate(timestamp) {
  return dayjsFormatDate(timestamp);
}
</script>
