<template>
  <div class="filters-section">
    <h2>Filters</h2>
    <div class="filter-group">
      <label for="modelFilter">Model</label>
      <select id="modelFilter" :value="selectedModelFilter" @change="handleModelFilterChange($event)">
        <option value="">All Models</option>
        <option v-for="model in availableModels" :key="model" :value="model">{{ model }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label for="planFilter">Gemini Plan</label>
      <select id="planFilter" :value="selectedPlanFilter" @change="handlePlanFilterChange($event)">
        <option value="">All Plans</option>
        <option v-for="plan in availablePlans" :key="plan" :value="plan">{{ plan }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label for="gemFilter">Gem</label>
      <select id="gemFilter" :value="selectedGemFilter" @change="handleGemFilterChange($event)">
        <option value="">All Conversations</option>
        <option value="hasGem">Gem Conversations Only</option>
        <option v-for="gem in availableGems" :key="gem" :value="gem">{{ gem }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label for="dateFilter">Date Range</label>
      <select
        id="dateFilter"
        :value="selectedDateFilter"
        @change="handleDateFilterChange($event.target.value)"
      >
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="thisWeek">This Week</option>
        <option value="thisMonth">This Month</option>
        <option value="custom">Custom Range</option>
      </select>
    </div>
    <div v-if="selectedDateFilter === 'custom'" class="filter-group date-range">
      <div class="date-input">
        <label for="startDate">Start Date</label>
        <input
          type="date"
          id="startDate"
          :value="customStartDate"
          @change="handleCustomDateChange(true, $event)"
        />
      </div>
      <div class="date-input">
        <label for="endDate">End Date</label>
        <input
          type="date"
          id="endDate"
          :value="customEndDate"
          @change="handleCustomDateChange(false, $event)"
        />
      </div>
    </div>
    <div class="filter-group">
      <label for="sortBy">Sort By</label>
      <select id="sortBy" :value="currentSortBy" @change="handleSortChange($event)">
        <option value="date-desc">Date (Newest First)</option>
        <option value="date-asc">Date (Oldest First)</option>
        <option value="title-asc">Title (A-Z)</option>
        <option value="title-desc">Title (Z-A)</option>
      </select>
    </div>
    <button class="button reset-button" @click="resetAllFilters">Reset All Filters</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, watch, computed } from "vue";
import { Logger } from "../../lib/utils.js";

// Define props
const props = defineProps({
  selectedModelFilter: {
    type: String,
    default: "",
  },
  selectedPlanFilter: {
    type: String,
    default: "",
  },
  selectedGemFilter: {
    type: String,
    default: "",
  },
  selectedDateFilter: {
    type: String,
    default: "all",
  },
  customStartDate: {
    type: String,
    default: "",
  },
  customEndDate: {
    type: String,
    default: "",
  },
  currentSortBy: {
    type: String,
    default: "date-desc",
  },
  availableModels: {
    type: Array,
    default: () => [],
  },
  availablePlans: {
    type: Array,
    default: () => [],
  },
  availableGems: {
    type: Array,
    default: () => [],
  },
});

// Define emits
const emit = defineEmits([
  "update:selectedModelFilter",
  "update:selectedPlanFilter",
  "update:selectedGemFilter",
  "update:selectedDateFilter",
  "update:customStartDate",
  "update:customEndDate",
  "update:currentSortBy",
  "filter-change",
  "reset-filters",
]);

// Component lifecycle
onMounted(() => {
  Logger.debug("Filters", "Component mounted", {
    initialModelFilter: props.selectedModelFilter,
    initialDateFilter: props.selectedDateFilter,
    initialSortBy: props.currentSortBy,
    availableModels: props.availableModels.length,
  });
});

// Watch for changes to input props
watch(
  () => props.availableModels,
  (newModels) => {
    Logger.debug("Filters", "Available models updated", {
      count: newModels.length,
      models: newModels,
    });
  }
);

// Track active filtering state
const hasActiveFilters = computed(() => {
  return (
    props.selectedModelFilter !== "" ||
    props.selectedPlanFilter !== "" ||
    props.selectedGemFilter !== "" ||
    props.selectedDateFilter !== "all" ||
    props.currentSortBy !== "date-desc"
  );
});

// Event handlers
function handleDateFilterChange(value) {
  Logger.log("Filters", "Date filter changed by user", {
    from: props.selectedDateFilter,
    to: value,
    requiresCustomDates: value === "custom",
  });

  emit("update:selectedDateFilter", value);
  emit("filter-change");

  if (value === "custom") {
    Logger.debug("Filters", "Custom date range selected, using dates", {
      startDate: props.customStartDate || "not set",
      endDate: props.customEndDate || "not set",
    });
  }
}

// Handle model filter changes
function handleModelFilterChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Model filter changed by user", {
    from: props.selectedModelFilter,
    to: newValue,
  });

  emit("update:selectedModelFilter", newValue);
  emit("filter-change");
}

// Handle plan filter changes
function handlePlanFilterChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Plan filter changed by user", {
    from: props.selectedPlanFilter,
    to: newValue,
  });

  emit("update:selectedPlanFilter", newValue);
  emit("filter-change");
}

// Handle gem filter changes
function handleGemFilterChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Gem filter changed by user", {
    from: props.selectedGemFilter,
    to: newValue,
  });

  emit("update:selectedGemFilter", newValue);
  emit("filter-change");
}

// Handle sort order changes
function handleSortChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Sort order changed by user", {
    from: props.currentSortBy,
    to: newValue,
  });

  emit("update:currentSortBy", newValue);
  emit("filter-change");
}

// Handle custom date range changes
function handleCustomDateChange(isStartDate, event) {
  const dateType = isStartDate ? "start" : "end";
  const newDate = event.target.value;

  Logger.log("Filters", `Custom ${dateType} date changed`, {
    newValue: newDate,
  });

  if (isStartDate) {
    emit("update:customStartDate", newDate);
  } else {
    emit("update:customEndDate", newDate);
  }

  emit("filter-change");
}

// Handle filter reset
function resetAllFilters() {
  Logger.log("Filters", "User reset all filters", {
    previousModelFilter: props.selectedModelFilter,
    previousDateFilter: props.selectedDateFilter,
    previousSortOrder: props.currentSortBy,
  });

  emit("reset-filters");
}
</script>
