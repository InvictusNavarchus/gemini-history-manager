<template>
  <div>
    <div v-if="isLoading" class="loading-state">
      <p>Loading...</p>
    </div>
    <div v-else-if="errorState.hasError" class="error-state">
      <p>{{ errorState.message }}</p>
      <button @click="retryInitialization" class="button">Retry</button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

// Define props
defineProps({
  isLoading: {
    type: Boolean,
    default: false,
  },
  errorState: {
    type: Object,
    default: () => ({ hasError: false, message: "" }),
  },
});

// Define emits
const emit = defineEmits(["retry"]);

// Event handlers
function retryInitialization() {
  emit("retry");
}
</script>
