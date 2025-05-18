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
import { ref, defineProps, defineEmits, onMounted, onBeforeUnmount, computed } from 'vue';
import { Logger } from '../../lib/utils.js';

// Define props
const props = defineProps({
  id: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  message: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 5000
  }
});

Logger.log(`🍞 ToastNotification #${props.id}: Component initialized with message: "${props.message}", type: ${props.type}`);

// Define emits
const emit = defineEmits(['close']);

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
  Logger.log(`🍞 ToastNotification #${props.id}: closeToast method called`);
  isHiding.value = true;
  
  Logger.log(`🍞 ToastNotification #${props.id}: Set isHiding=true, waiting 300ms before emitting close event`);
  setTimeout(() => {
    Logger.log(`🍞 ToastNotification #${props.id}: Emitting close event after timeout`);
    emit('close', props.id);
  }, 300);
}

function startTimer() {
  Logger.log(`🍞 ToastNotification #${props.id}: startTimer called with duration: ${props.duration}ms`);
  
  if (props.duration > 0) {
    // Check if progress bar ref is available
    Logger.log(`🍞 ToastNotification #${props.id}: Progress bar ref exists: ${!!progressBar.value}`);
    
    // Animate progress bar
    if (progressBar.value) {
      Logger.log(`🍞 ToastNotification #${props.id}: Setting up progress bar animation for ${props.duration}ms`);
      // Set initial width to 100%
      progressBar.value.style.width = '100%';
      
      // Force a reflow to ensure the initial width is applied
      progressBar.value.offsetHeight;
      
      // Set up the transition
      progressBar.value.style.transition = `width ${props.duration / 1000}s linear`;
      
      // Trigger animation by setting width to 0%
      requestAnimationFrame(() => {
        progressBar.value.style.width = '0%';
      });
    } else {
      Logger.warn(`🍞 ToastNotification #${props.id}: Progress bar reference is not available`);
    }
    
    // Set timeout to close toast
    Logger.log(`🍞 ToastNotification #${props.id}: Setting auto-close timeout for ${props.duration}ms`);
    timeout = setTimeout(() => {
      Logger.log(`🍞 ToastNotification #${props.id}: Auto-close timeout triggered after ${props.duration}ms`);
      closeToast();
    }, props.duration);
  } else {
    Logger.log(`🍞 ToastNotification #${props.id}: No auto-close timer set (duration is ${props.duration})`);
  }
}

// Lifecycle hooks
onMounted(() => {
  Logger.log(`🍞 ToastNotification #${props.id}: Component mounted`);
  startTimer();
});

onBeforeUnmount(() => {
  Logger.log(`🍞 ToastNotification #${props.id}: Component will unmount`);
  if (timeout) {
    Logger.log(`🍞 ToastNotification #${props.id}: Clearing auto-close timeout`);
    clearTimeout(timeout);
  }
});
</script>

<style scoped>
.toast {
  position: relative;
  background-color: var(--toast-info-bg);
  color: var(--toast-text);
  margin-bottom: 10px;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: slide-in 0.3s ease;
  max-width: 350px;
  width: 100%;
}

.toast.hide {
  animation: slide-out 0.3s forwards;
}

.toast-content {
  padding: 12px 30px 12px 12px;
  display: flex;
  align-items: center;
}

.toast-icon {
  display: flex;
  align-items: center;
  margin-right: 10px;
}

.toast-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 18px;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.toast-close:hover {
  opacity: 1;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.2);
}

.toast-progress-bar {
  height: 100%;
  width: 100%; /* Start at 100% and animate to 0% */
  background-color: rgba(255, 255, 255, 0.5);
}

.toast.success { background-color: var(--toast-success-bg); }
.toast.info { background-color: var(--toast-info-bg); }
.toast.warning { background-color: var(--toast-warning-bg); }
.toast.error { background-color: var(--toast-error-bg); }

@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slide-out {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

.toast-fade-enter-active, .toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from, .toast-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
