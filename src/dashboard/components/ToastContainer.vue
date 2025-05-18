<template>
  <div class="toast-container">
    <ToastNotification
      v-for="toast in toasts"
      :key="toast.id"
      :id="toast.id"
      :type="toast.type"
      :message="toast.message"
      :duration="toast.duration"
      @close="removeToast"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, watch } from 'vue';
import ToastNotification from './ToastNotification.vue';
import { Logger } from '../../lib/utils.js';

// Define props
const props = defineProps({
  toasts: {
    type: Array,
    default: () => []
  }
});

// Define emits
const emit = defineEmits(['remove-toast']);

// Log when toasts are rendered
Logger.log(`🍞 ToastContainer: Component setup initialized`);

watch(() => props.toasts, (newToasts, oldToasts) => {
  Logger.log(`🍞 ToastContainer: Toasts changed - now has ${newToasts.length} toasts`);
  if (newToasts.length > 0) {
    Logger.log(`🍞 ToastContainer: Toast IDs: ${newToasts.map(t => t.id).join(', ')}`);
  }
  
  // Log any added toasts
  if (oldToasts && newToasts.length > oldToasts.length) {
    const addedToasts = newToasts.filter(newToast => 
      !oldToasts.some(oldToast => oldToast.id === newToast.id)
    );
    Logger.log(`🍞 ToastContainer: ${addedToasts.length} new toast(s) added`);
    addedToasts.forEach(toast => {
      Logger.log(`🍞 ToastContainer: Added toast #${toast.id}, message: "${toast.message}", type: ${toast.type}`);
    });
  }
  
  // Log any removed toasts
  if (oldToasts && newToasts.length < oldToasts.length) {
    const removedToasts = oldToasts.filter(oldToast => 
      !newToasts.some(newToast => newToast.id === oldToast.id)
    );
    Logger.log(`🍞 ToastContainer: ${removedToasts.length} toast(s) removed`);
    removedToasts.forEach(toast => {
      Logger.log(`🍞 ToastContainer: Removed toast #${toast.id}`);
    });
  }
}, { deep: true, immediate: true });

// Event handlers
function removeToast(id) {
  Logger.log(`🍞 ToastContainer: removeToast called with ID: ${id}`);
  emit('remove-toast', id);
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
  /* Add border for debugging visibility */
  border: 2px solid transparent;
}

.toast-container > * {
  pointer-events: auto;
}

/* Add this for debugging to highlight the container when toasts are present */
.toast-container:not(:empty) {
  border-color: rgba(255, 0, 0, 0.3);
}
</style>
