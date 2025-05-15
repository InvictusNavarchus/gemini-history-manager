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
import { defineProps, defineEmits } from 'vue';
import ToastNotification from './ToastNotification.vue';

// Define props
defineProps({
  toasts: {
    type: Array,
    default: () => []
  }
});

// Define emits
const emit = defineEmits(['remove-toast']);

// Event handlers
function removeToast(id) {
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
}

.toast-container > * {
  pointer-events: auto;
}
</style>
