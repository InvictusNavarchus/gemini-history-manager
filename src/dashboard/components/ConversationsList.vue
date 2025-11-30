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
          <option value="relevance">Relevance</option>
          <option value="date-desc">Date (Newest First)</option>
          <option value="date-asc">Date (Oldest First)</option>
          <option value="title-asc">Title (A-Z)</option>
          <option value="title-desc">Title (Z-A)</option>
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
          <div
            class="conversation-title"
            v-html="highlightMatch(entry.title || 'Untitled Conversation', 'title', entry)"
          ></div>
          <div class="conversation-meta">
            <div class="meta-left">
              <span>{{ formatDate(entry.timestamp) }}</span>
              <span class="conversation-model">{{ formatModelAndTool(entry) }}</span>
              <span v-if="entry.geminiPlan" class="conversation-plan" :class="entry.geminiPlan.toLowerCase()">
                {{ entry.geminiPlan }}
              </span>
              <span v-if="entry.gemName" class="conversation-gem"> Gem: {{ entry.gemName }} </span>
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
          <div
            class="conversation-prompt"
            v-if="entry.prompt"
            :title="entry.prompt"
            v-html="highlightMatch(entry.prompt, 'prompt', entry)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Logger from "../../lib/logger.js";
import { defineProps, defineEmits, computed } from "vue";
import { dayjsFormatDate, formatModelAndTool } from "../../lib/utils.js";

// Define props
const props = defineProps({
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
  hasSearchQuery: {
    type: Boolean,
    default: false,
  },
  searchQuery: {
    type: String,
    default: "",
  },
});

// Define emits
const emit = defineEmits([
  "update:currentSortBy",
  "show-details",
  "start-chat",
  "reset-filters",
  "search-with-highlight",
]);

// Watch for search query changes to enable highlighting
import { watch } from "vue";
watch(
  () => props.searchQuery,
  (newQuery) => {
    if (newQuery && newQuery.trim() !== "") {
      // Emit event to parent to perform search with highlighting enabled
      emit("search-with-highlight", newQuery);
      Logger.debug("ConversationsList", "Emitted search-with-highlight event", { query: newQuery });
    }
  },
  { immediate: true }
);

// Highlight search matches in text using MiniSearch's _matches field
function highlightMatch(text, field, entry) {
  Logger.debug("ConversationsList", "highlightMatch called", {
    searchQuery: props.searchQuery,
    hasSearchQuery: props.hasSearchQuery,
    text,
    field,
  });
  if (!props.hasSearchQuery || !props.searchQuery || !text) return escapeHtml(text);

  try {
    // If we have _matches from MiniSearch and they include this field
    if (entry && entry._matches && entry._matches[field]) {
      // Get the field matches information
      const matches = entry._matches[field];

      // If no matches for this field, just return the escaped text
      if (!matches || matches.length === 0) {
        return escapeHtml(text);
      }

      // Sort matches by position to process them in order
      matches.sort((a, b) => a.index - b.index);

      // Apply highlighting to the text
      let result = escapeHtml(text);
      let offset = 0;

      for (const match of matches) {
        const startPos = match.index + offset;
        const matchText = result.substring(startPos, startPos + match.length);
        const highlighted = `<mark class="search-highlight">${matchText}</mark>`;
        result = result.substring(0, startPos) + highlighted + result.substring(startPos + match.length);
        offset += highlighted.length - match.length;
      }

      return result;
    } else {
      // Fallback to simple highlighting if _matches not available
      // This ensures backward compatibility
      const searchTerms = props.searchQuery.trim().split(/\s+/).filter(Boolean);
      if (!searchTerms.length) return escapeHtml(text);

      const regex = new RegExp(
        "(" + searchTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")",
        "gi"
      );

      return escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
    }
  } catch (e) {
    Logger.error("ConversationsList", "highlightMatch error", e);
    return escapeHtml(text);
  }
}
// Escape HTML to prevent XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Format date
function formatDate(timestamp) {
  return dayjsFormatDate(timestamp);
}
</script>

<style scoped>
.search-highlight,
mark.search-highlight {
  background: var(--primary-bg, #ffe066);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

/* Styles originally for .content, now applied to .conversations-container */
.conversations-container {
  flex-grow: 1;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.conversation-header {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.conversation-header h2 {
  font-size: 16px;
  color: var(--text-color);
  margin: 0; /* Added to match h1 reset potentially if h2 was styled similarly */
}

.conversation-header span {
  color: var(--text-light);
  font-weight: normal;
}

.sorting {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sorting label {
  font-size: 13px;
  color: var(--text-light);
}

.sorting select {
  background-color: var(--input-bg);
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-color);
}

/* Conversation list */
.conversation-list {
  flex-grow: 1;
  overflow-y: auto;
  /* Max height to ensure it scrolls within its container if content overflows */
  max-height: calc(100vh - 250px); /* Adjust as needed based on header/tabs height */
}

.conversation-item {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color var(--animation-speed);
}

.conversation-item:hover {
  background-color: var(--hover-bg);
}

.conversation-title {
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 5px;
}

.conversation-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-light);
}

.conversation-prompt {
  max-width: 550px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta-left {
  display: flex;
  gap: 15px;
  align-items: center; /* Align items vertically in meta-left */
}

.meta-right {
  display: flex;
  gap: 10px;
  align-items: center; /* Align items vertically in meta-right */
}

.conversation-model {
  background-color: var(--primary-bg);
  color: var(--primary-color);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.conversation-plan {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.conversation-plan.pro {
  background-color: #e6f4ea;
  color: #137333;
}

.conversation-plan.free {
  background-color: #fff8e1;
  color: #f9a825;
}

.conversation-account {
  color: var(--text-lighter);
  font-size: 12px;
}

.conversation-gem, /* Added styling for gem if it exists */
.conversation-files {
  /* Added styling for files if it exists */
  font-size: 12px;
  color: var(--text-lighter);
  background-color: var(--hover-bg); /* Subtle background to distinguish */
  padding: 2px 6px;
  border-radius: 4px;
}

/* Dark theme specific adjustments */
:deep(html[data-theme="dark"]) .conversation-plan.pro {
  background-color: rgba(19, 115, 51, 0.2);
  color: #81c995;
}

:deep(html[data-theme="dark"]) .conversation-plan.free {
  background-color: rgba(249, 168, 37, 0.15);
  color: #ffcc80;
}

:deep(html[data-theme="dark"]) .conversation-model {
  background-color: var(--primary-bg);
  color: var(--primary-light);
}

/* Empty and Loading states - Assuming these are part of ConversationsList.vue template */
.empty-state,
.loading-state {
  /* loading-state styles were not in the provided CSS but adding selector if needed */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-light);
  height: 100%;
  flex-grow: 1;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 10px;
  color: var(--text-color);
}

.empty-state p {
  margin-bottom: 20px;
  max-width: 300px;
}

/* Spinner is used in loading state, assuming it's defined elsewhere or should be here */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(110, 65, 226, 0.2);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:deep(html[data-theme="dark"]) .spinner {
  border-color: rgba(139, 104, 240, 0.2);
  border-top-color: var(--primary-light);
}

:deep(html[data-theme="dark"]) .empty-state {
  color: var(--text-light);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .conversation-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .sorting {
    width: 100%;
  }

  .sorting select {
    flex-grow: 1;
  }

  .conversation-meta {
    flex-direction: column;
    gap: 5px;
    align-items: flex-start; /* Align items to start in column layout */
  }
  .meta-left,
  .meta-right {
    flex-direction: column; /* Stack meta items vertically */
    align-items: flex-start;
    gap: 5px; /* Adjust gap for stacked items */
  }
}
</style>
