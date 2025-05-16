<template>
  <div class="modal" :class="{ active: show }">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ conversation.title || 'Conversation Details' }}</h2>
        <button class="close-button" @click="emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="detail-group">
          <h3>Title</h3>
          <p>{{ conversation.title || 'Untitled Conversation' }}</p>
        </div>
        <div class="detail-group">
          <h3>Date</h3>
          <p>{{ conversation.timestamp ? formatDateTime(conversation.timestamp) : '-' }}</p>
        </div>
        <div class="detail-group">
          <h3>Model</h3>
          <p>{{ conversation.model || 'Unknown' }}</p>
        </div>
        <div class="detail-group">
          <h3>Account</h3>
          <p>
            {{ 
              conversation.accountName && conversation.accountEmail 
                ? `${conversation.accountName} (${conversation.accountEmail})` 
                : conversation.accountName || conversation.accountEmail || 'Unknown' 
            }}
          </p>
        </div>
        <div class="detail-group">
          <h3>Prompt</h3>
          <p>{{ conversation.prompt || 'No prompt data available' }}</p>
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
        <button class="button primary-button" @click="openInGemini">Open in Gemini</button>
        <button class="button danger-button" @click="deleteConversation">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { parseTimestamp } from '../../lib/utils.js';

// Define props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  conversation: {
    type: Object,
    default: () => ({})
  }
});

// Define emits
const emit = defineEmits(['close', 'open-in-gemini', 'delete']);

// Format datetime
function formatDateTime(timestamp) {
  return parseTimestamp(timestamp).format('llll');
}

// Actions
function openInGemini() {
  if (props.conversation.url) {
    emit('open-in-gemini', props.conversation.url);
  }
}

function deleteConversation() {
  emit('delete', props.conversation);
}
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.modal.active {
  opacity: 1;
  pointer-events: all;
}

.modal-content {
  background-color: var(--bg-color);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-light);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.close-button:hover {
  background-color: var(--hover-bg);
  color: var(--text-color);
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}

.detail-group {
  margin-bottom: 1rem;
}

.detail-group h3 {
  margin: 0;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: var(--text-light);
}

.detail-group p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-group ul {
  margin: 0;
  padding-left: 1.5rem;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
