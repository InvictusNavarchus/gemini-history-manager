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
          <p>{{ conversation.model || "Unknown" }}</p>
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
        <button class="button danger-button" @click="deleteConversation">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, onUnmounted } from "vue";
import { parseTimestamp, Logger } from "../../lib/utils.js";

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
const emit = defineEmits(["close", "delete"]);

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
</script>
