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
import { defineProps, defineEmits, watch, ref, onMounted } from "vue";
import ToastNotification from "./ToastNotification.vue";
import { Logger } from "../../lib/utils.js";

// Define props
const props = defineProps({
  toasts: {
    type: Array,
    default: () => [],
  },
});

// Define emits
const emit = defineEmits(["remove-toast"]);

onMounted(() => {
  Logger.log(
    "ToastContainer",
    `🍞 ToastContainer: Component mounted, initial toasts: ${props.toasts.length}`
  );
});

// Log when toasts are rendered
Logger.log("ToastContainer", `🍞 ToastContainer: Component setup initialized`);

watch(
  () => props.toasts,
  (newToasts, oldToasts) => {
    Logger.log("ToastContainer", `🍞 ToastContainer: Toasts changed - now has ${newToasts.length} toasts`);
    if (newToasts.length > 0) {
      Logger.log("ToastContainer", `🍞 ToastContainer: Toast IDs: ${newToasts.map((t) => t.id).join(", ")}`);
    }

    // Log any added toasts
    if (oldToasts && newToasts.length > oldToasts.length) {
      const addedToasts = newToasts.filter(
        (newToast) => !oldToasts.some((oldToast) => oldToast.id === newToast.id)
      );
      Logger.log("ToastContainer", `🍞 ToastContainer: ${addedToasts.length} new toast(s) added`);
      addedToasts.forEach((toast) => {
        Logger.log(
          "ToastContainer",
          `🍞 ToastContainer: Added toast #${toast.id}, message: "${toast.message}", type: ${toast.type}`
        );
      });
    }

    // Log any removed toasts
    if (oldToasts && newToasts.length < oldToasts.length) {
      const removedToasts = oldToasts.filter(
        (oldToast) => !newToasts.some((newToast) => newToast.id === oldToast.id)
      );
      Logger.log("ToastContainer", `🍞 ToastContainer: ${removedToasts.length} toast(s) removed`);
      removedToasts.forEach((toast) => {
        Logger.log("ToastContainer", `🍞 ToastContainer: Removed toast #${toast.id}`);
      });
    }
  },
  { deep: true, immediate: true }
);

// Event handlers
function removeToast(id) {
  Logger.log("ToastContainer", `🍞 ToastContainer: removeToast called with ID: ${id}`);
  emit("remove-toast", id);
}
</script>
