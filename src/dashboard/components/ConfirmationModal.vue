<template>
  <div class="modal" :class="{ active: show }">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="close-button" @click="$emit('cancel')">&times;</button>
      </div>
      <div class="modal-body">
        <p>{{ message }}</p>
      </div>
      <div class="modal-footer">
        <button class="button" @click="$emit('cancel')">Cancel</button>
        <button class="button danger-button" @click="$emit('confirm')">Confirm</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

// Define props
defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "Confirmation",
  },
  message: {
    type: String,
    default: "Are you sure you want to proceed?",
  },
});

// Define emits
defineEmits(["confirm", "cancel"]);
</script>

<style scoped>
/* Modal styles moved from dashboard.css */
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  overflow: auto;
}

.modal.active {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow);
  width: 90%;
  /* max-width: 600px; Default from original .modal-content */
  max-width: 400px; /* Applied from .confirmation-modal specific style */
  animation: modalFadeIn 0.3s;
}

/* Keyframes need to be defined globally or duplicated if strictly scoped and not supported by preprocessor.
   For Vue scoped styles, @keyframes are typically fine directly. */
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
  max-height: 70vh; /* Assuming this is desired for confirmation modals too */
  overflow-y: auto;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Button styles are assumed to be global from .button, .danger-button */
/* No specific dark theme overrides for modal elements were found beyond variable usage */
</style>
