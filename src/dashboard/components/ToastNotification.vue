<template>
  <transition name="toast-fade">
    <div class="toast" :class="[type, { hide: isHiding }]">
      <div class="toast-content">
        <div class="toast-icon" v-html="getIconForType"></div>
        <span>{{ message }}</span>
      </div>
      <button class="toast-close" @click="closeToast">&times;</button>
      <div class="toast-progress">
        <div class="toast-progress-bar" ref="progressBar"></div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, onBeforeUnmount, computed } from "vue";
import { Logger } from "../../lib/utils.js";

// Define props
const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    default: "info",
    validator: (value) => ["success", "error", "warning", "info"].includes(value),
  },
  message: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    default: 5000,
  },
});

Logger.log("ToastNotification", "Component initialized", {
  id: props.id,
  message: props.message,
  type: props.type,
  duration: props.duration,
});

// Define emits
const emit = defineEmits(["close"]);

// Refs
const progressBar = ref(null);
const isHiding = ref(false);
let timeout = null;

// Computed
const getIconForType = computed(() => {
  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  };
  return icons[props.type] || icons.info;
});

// Methods
function closeToast() {
  Logger.log("ToastNotification", "closeToast method called", { id: props.id });
  isHiding.value = true;

  Logger.log("ToastNotification", "Hiding toast and waiting before closing", {
    id: props.id,
    isHiding: true,
    waitTime: 300,
  });

  setTimeout(() => {
    Logger.log("ToastNotification", "Emitting close event after timeout", { id: props.id });
    emit("close", props.id);
  }, 300);
}

function startTimer() {
  Logger.log("ToastNotification", "startTimer called", {
    id: props.id,
    duration: props.duration,
  });

  if (props.duration > 0) {
    // Check if progress bar ref is available
    Logger.debug("ToastNotification", "Progress bar status check", {
      id: props.id,
      progressBarExists: !!progressBar.value,
    });

    // Animate progress bar
    if (progressBar.value) {
      Logger.debug("ToastNotification", "Setting up progress bar animation", {
        id: props.id,
        duration: props.duration,
      });

      // Set initial width to 100%
      progressBar.value.style.width = "100%";

      // Force a reflow to ensure the initial width is applied
      progressBar.value.offsetHeight;

      // Set up the transition
      progressBar.value.style.transition = `width ${props.duration / 1000}s linear`;

      // Trigger animation by setting width to 0%
      requestAnimationFrame(() => {
        progressBar.value.style.width = "0%";
      });
    } else {
      Logger.warn("ToastNotification", "Progress bar reference unavailable", { id: props.id });
    }

    // Set timeout to close toast
    Logger.debug("ToastNotification", "Setting auto-close timeout", {
      id: props.id,
      duration: props.duration,
    });

    timeout = setTimeout(() => {
      Logger.log("ToastNotification", "Auto-close timeout triggered", {
        id: props.id,
        duration: props.duration,
      });
      closeToast();
    }, props.duration);
  } else {
    Logger.log("ToastNotification", "No auto-close timer set", {
      id: props.id,
      duration: props.duration,
    });
  }
}

// Lifecycle hooks
onMounted(() => {
  Logger.debug("ToastNotification", "Component mounted", { id: props.id });
  startTimer();
});

onBeforeUnmount(() => {
  Logger.debug("ToastNotification", "Component will unmount", { id: props.id });
  if (timeout) {
    Logger.debug("ToastNotification", "Clearing auto-close timeout", { id: props.id });
    clearTimeout(timeout);
  }
});
</script>
