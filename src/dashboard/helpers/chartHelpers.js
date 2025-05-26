/**
 * Gemini History Manager - Dashboard Chart Helpers
 * Functions for chart visualization in the Dashboard
 */
import { parseTimestamp, Logger } from "../../lib/utils.js";
import dayjs from "dayjs";

/**
 * Reserved color palette for charts (primary, secondary, etc.).
 * Used for consistent color assignment in visualizations.
 * @type {string[]}
 */
export const RESERVED_COLORS = [
  "rgba(110, 65, 226, 0.8)", // Primary purple
  "rgba(30, 100, 200, 0.8)", // Deep blue
  "rgba(71, 163, 255, 0.8)", // Blue
  "rgba(0, 199, 176, 0.8)", // Teal
  "rgba(255, 167, 38, 0.8)", // Orange
  "rgba(0, 255, 255, 0.8)", // Cyan
  "rgba(150, 150, 150, 0.8)", // Gray
];

/**
 * Fallback color palette for unspecified models or overflow.
 * Used when RESERVED_COLORS are exhausted or for dynamic values.
 * @type {string[]}
 */
export const FALLBACK_COLORS = [
  "rgba(156, 204, 101, 0.8)", // Soft green
  "rgba(187, 143, 206, 0.8)", // Soft lavender
  "rgba(133, 193, 233, 0.8)", // Soft blue
  "rgba(241, 196, 15, 0.8)", // Soft yellow
  "rgba(230, 176, 170, 0.8)", // Soft salmon
  "rgba(169, 223, 191, 0.8)", // Soft mint
  "rgba(210, 180, 140, 0.8)", // Soft tan
  "rgba(208, 211, 212, 0.8)", // Soft silver
];

/**
 * Plan-specific color mapping for consistent colors across visualizations.
 * Maps plan names to specific color strings.
 * @type {Object.<string, string>}
 */
export const PLAN_COLOR_MAP = {
  Pro: "rgba(110, 65, 226, 0.8)", // Primary purple for Pro
  Free: "rgba(71, 163, 255, 0.8)", // Blue for Free
  Unknown: "rgba(150, 150, 150, 0.8)", // Gray for unknown plans
};

/**
 * Model-specific color mapping for consistent colors across visualizations.
 * Maps model names to specific color strings.
 * @type {Object.<string, string>}
 */
export const MODEL_COLOR_MAP = {
  "2.5 Pro": RESERVED_COLORS[0], // Primary purple for 2.5 Pro
  "Deep Research": RESERVED_COLORS[1], // Deep blue for Deep Research
  "2.5 Flash": RESERVED_COLORS[2], // Blue for 2.5 Flash
  "2.0 Flash": RESERVED_COLORS[3], // Teal for 2.0 Flash
  "Veo 2": RESERVED_COLORS[4], // Orange for Veo 2
  Personalization: RESERVED_COLORS[5], // Cyan for Personalization
  "All Conversations": RESERVED_COLORS[6], // Grey for all models
  Unknown: RESERVED_COLORS[6], // Gray for unknown models
};

/**
 * Gem-specific color mapping for consistent colors across visualizations.
 * Maps gem names to specific color strings.
 * @type {Object.<string, string>}
 */
export const GEM_COLOR_MAP = {
  // We'll use fallback colors for gems since they're dynamic
  Unknown: RESERVED_COLORS[6], // Gray for unknown gems
};

/**
 * Returns the color for a specific model, ensuring consistency across visualizations.
 * Uses MODEL_COLOR_MAP if available, otherwise falls back to FALLBACK_COLORS.
 *
 * @param {string} modelName - Name of the model.
 * @param {number} [fallbackIndex=0] - Fallback index to use if no specific color is defined.
 * @returns {string} Color to use for the model.
 */
export function getModelColor(modelName, fallbackIndex = 0) {
  // If we have a specific color defined for this model, use it
  if (MODEL_COLOR_MAP[modelName]) {
    return MODEL_COLOR_MAP[modelName];
  }

  // Otherwise use the fallback color based on the index
  return FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}

/**
 * Returns the color for a specific plan, ensuring consistency across visualizations.
 * Uses PLAN_COLOR_MAP if available, otherwise falls back to FALLBACK_COLORS.
 *
 * @param {string} planName - Name of the plan.
 * @param {number} [fallbackIndex=0] - Fallback index to use if no specific color is defined.
 * @returns {string} Color to use for the plan.
 */
export function getPlanColor(planName, fallbackIndex = 0) {
  // If we have a specific color defined for this plan, use it
  if (PLAN_COLOR_MAP[planName]) {
    return PLAN_COLOR_MAP[planName];
  }

  // Otherwise use the fallback color based on the index
  return FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}

/**
 * Returns the color for a specific gem, ensuring consistency across visualizations.
 * Uses GEM_COLOR_MAP if available, otherwise falls back to FALLBACK_COLORS.
 *
 * @param {string} gemName - Name of the gem.
 * @param {number} [fallbackIndex=0] - Fallback index to use if no specific color is defined.
 * @returns {string} Color to use for the gem.
 */
export function getGemColor(gemName, fallbackIndex = 0) {
  // If we have a specific color defined for this gem, use it
  if (GEM_COLOR_MAP[gemName]) {
    return GEM_COLOR_MAP[gemName];
  }

  // Otherwise use the fallback color based on the index
  return FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}

/**
 * Get theme-specific options for Chart.js
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {Object} Theme options for Chart.js
 */
export function getChartJsThemeOptions(theme) {
  Logger.debug("chartHelpers", `Generating chart theme options for theme: ${theme}`);

  const isDark = theme === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

  Logger.debug("chartHelpers", `Chart theme settings: textColor=${textColor}, gridColor=${gridColor}`);
  return { textColor, gridColor };
}

/**
 * Generate configuration for model distribution chart
 * @param {Array} historyData - History data array
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {Object} Chart.js configuration
 */
/**
 * @description Generates the Chart.js configuration for the model distribution chart.
 * @param {Array} historyData - History data array.
 * @param {string} theme - Current theme ('light' or 'dark').
 * @returns {Object} Chart.js configuration.
 */
export function getModelDistributionChartConfig(historyData, theme) {
  Logger.log(
    "chartHelpers",
    `Generating model distribution chart with ${historyData.length} entries and theme: ${theme}`
  );

  const modelCounts = historyData.reduce((acc, entry) => {
    const model = entry.model || "Unknown";
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});

  Logger.debug("chartHelpers", `Model distribution data: ${JSON.stringify(modelCounts)}`);

  // Sort by count in descending order
  const sortedEntries = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);
  const labels = sortedEntries.map((entry) => entry[0]);
  const data = sortedEntries.map((entry) => entry[1]);
  Logger.debug("chartHelpers", `Chart labels: ${labels.join(", ")}`);

  const { textColor, gridColor } = getChartJsThemeOptions(theme);

  return {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Conversations",
          data,
          backgroundColor: labels.map((model, index) => getModelColor(model, index)),
          borderColor: labels.map((model, index) => getModelColor(model, index).replace("0.8", "1")),
          borderWidth: 1,
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      indexAxis: "y", // This makes the bars horizontal
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
            precision: 0,
          },
          title: {
            display: true,
            text: "Number of Conversations",
            color: textColor,
          },
        },
        y: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Hide legend as it's redundant for this chart
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value * 100) / total);
              return `${value} conversations (${percentage}%)`;
            },
          },
        },
      },
    },
  };
}

/**
 * Generate configuration for activity over time chart
 * @param {Array} historyData - History data array
 * @param {Array} availableModels - List of unique models
 * @param {Object} chartOptions - Chart configuration options
 * @param {string} chartOptions.displayMode - Display mode ('combined' or 'separate')
 * @param {string} chartOptions.selectedModel - Selected model for filtering ('all' or specific model name)
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {Object} Chart.js configuration
 */
/**
 * @description Generates the Chart.js configuration for the activity over time chart.
 * @param {Array} historyData - History data array.
 * @param {Array} availableModels - List of unique model names.
 * @param {Object} chartOptions - Chart configuration options.
 * @param {string} chartOptions.displayMode - Display mode ('combined' or 'separate').
 * @param {string} chartOptions.selectedModel - Selected model for filtering ('all' or specific model name').
 * @param {string} theme - Current theme ('light' or 'dark').
 * @returns {Object} Chart.js configuration.
 */
export function getActivityOverTimeChartConfig(historyData, availableModels, chartOptions, theme) {
  Logger.log("chartHelpers", `Generating activity over time chart with ${historyData.length} entries`);
  Logger.debug(
    "chartHelpers",
    `Chart options: ${JSON.stringify({
      displayMode: chartOptions.displayMode,
      selectedModel: chartOptions.selectedModel,
      availableModels: availableModels.join(", "),
      theme,
    })}`
  );

  const { textColor, gridColor } = getChartJsThemeOptions(theme);
  const displayMode = chartOptions.displayMode;
  const selectedModelForChart = chartOptions.selectedModel;

  // Calculate date ranges
  const dateGroups = {};
  const modelDateGroups = {};
  availableModels.forEach((model) => (modelDateGroups[model] = {}));

  historyData.forEach((entry) => {
    const timestamp = parseTimestamp(entry.timestamp);
    if (!timestamp.isValid()) return;

    const dateKey = timestamp.format("YYYY-MM-DD");
    const model = entry.model || "Unknown";

    // For combined chart
    dateGroups[dateKey] = (dateGroups[dateKey] || 0) + 1;

    // For separate by model chart
    if (!modelDateGroups[model]) modelDateGroups[model] = {};
    modelDateGroups[model][dateKey] = (modelDateGroups[model][dateKey] || 0) + 1;
  });

  // Sort dates and fill in missing dates
  const sortedDates = Object.keys(dateGroups).sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  Logger.debug(
    "chartHelpers",
    `Raw date range: ${
      sortedDates.length > 0
        ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
        : "No dates found"
    }`
  );

  const filledDateGroups = {};

  if (sortedDates.length > 0) {
    // Fill in any missing dates in the range
    const startDate = dayjs(sortedDates[0]);
    const endDate = dayjs(sortedDates[sortedDates.length - 1]);
    Logger.debug(
      "chartHelpers",
      `Filling date range from ${startDate.format("YYYY-MM-DD")} to ${endDate.format("YYYY-MM-DD")}`
    );

    let currentDate = startDate;
    while (currentDate.isSameOrBefore(endDate)) {
      const dateKey = currentDate.format("YYYY-MM-DD");

      // For combined chart
      filledDateGroups[dateKey] = dateGroups[dateKey] || 0;

      // For separate by model chart
      availableModels.forEach((model) => {
        if (!modelDateGroups[model]) modelDateGroups[model] = {};
        modelDateGroups[model][dateKey] = modelDateGroups[model][dateKey] || 0;
      });

      currentDate = currentDate.add(1, "day");
    }

    Logger.debug(
      "chartHelpers",
      `Successfully filled date range with ${Object.keys(filledDateGroups).length} days`
    );
  } else {
    Logger.warn("chartHelpers", "No dates found in history data for chart");
  }

  const finalSortedDates = Object.keys(filledDateGroups).sort(
    (a, b) => dayjs(a).valueOf() - dayjs(b).valueOf()
  );
  const displayDates = finalSortedDates.map((date) => dayjs(date).format("MMM D, YY"));
  Logger.debug("chartHelpers", `Final date range has ${finalSortedDates.length} days`);

  let datasets = [];
  Logger.debug(
    "chartHelpers",
    `Creating datasets with display mode: ${displayMode}, selected model: ${selectedModelForChart}`
  );

  if (displayMode === "combined" || !finalSortedDates.length) {
    // Combined mode shows all models together
    Logger.log("chartHelpers", "Creating combined dataset for all models");
    const combinedData = finalSortedDates.map((date) => filledDateGroups[date]);

    datasets = [
      {
        label: "All Conversations",
        data: combinedData,
        borderColor: MODEL_COLOR_MAP["All Conversations"],
        backgroundColor: MODEL_COLOR_MAP["All Conversations"].replace("0.8", "0.2"),
        fill: true,
        tension: 0.2,
        pointRadius: 3,
      },
    ];

    const totalConversations = combinedData.reduce((sum, count) => sum + count, 0);
    Logger.debug(
      "chartHelpers",
      `Combined dataset created with total of ${totalConversations} conversations`
    );
  } else {
    // 'separate'
    // Filter by selected model if needed
    if (selectedModelForChart === "all") {
      // Show all models separately
      Logger.log("chartHelpers", `Creating separate datasets for all ${availableModels.length} models`);

      datasets = availableModels.map((model, index) => {
        const modelData = finalSortedDates.map((date) => modelDateGroups[model][date] || 0);
        const totalForModel = modelData.reduce((sum, count) => sum + count, 0);
        Logger.debug("chartHelpers", `Dataset for model "${model}" has ${totalForModel} total conversations`);

        // Get consistent color for this model
        const modelColor = getModelColor(model, index);

        return {
          label: model,
          data: modelData,
          borderColor: modelColor,
          backgroundColor: modelColor.replace("0.8", "0.2"),
          fill: false, // multiple datasets look better without fill
          tension: 0.2,
          pointRadius: 3,
        };
      });

      Logger.log("chartHelpers", `Created ${datasets.length} separate model datasets`);
    } else {
      // Show only selected model
      Logger.log("chartHelpers", `Creating dataset for selected model: ${selectedModelForChart}`);
      const modelData = finalSortedDates.map(
        (date) =>
          (modelDateGroups[selectedModelForChart] && modelDateGroups[selectedModelForChart][date]) || 0
      );
      const totalForModel = modelData.reduce((sum, count) => sum + count, 0);

      // Get consistent color for this model
      const modelColor = getModelColor(selectedModelForChart, 0);

      datasets = [
        {
          label: selectedModelForChart,
          data: modelData,
          borderColor: modelColor,
          backgroundColor: modelColor.replace("0.8", "0.2"),
          fill: true,
          tension: 0.2,
          pointRadius: 3,
        },
      ];

      Logger.debug(
        "chartHelpers",
        `Dataset for "${selectedModelForChart}" has ${totalForModel} total conversations`
      );
    }
  }

  // Chart configuration
  Logger.log("chartHelpers", "Finalizing chart configuration");

  const chartConfig = {
    type: "line",
    data: {
      labels: displayDates,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
            precision: 0,
          },
          title: {
            display: true,
            text: "Conversations",
            color: textColor,
          },
        },
        x: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
    },
  };

  Logger.debug("chartHelpers", "Chart configuration created successfully");
  return chartConfig;
}

/**
 * Generate configuration for plan distribution chart
 * @param {Array} historyData - History data array
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {Object} Chart.js configuration
 */
/**
 * @description Generates the Chart.js configuration for the plan distribution chart.
 * @param {Array} historyData - History data array.
 * @param {string} theme - Current theme ('light' or 'dark').
 * @returns {Object} Chart.js configuration.
 */
export function getPlanDistributionChartConfig(historyData, theme) {
  Logger.log(
    "chartHelpers",
    `Generating plan distribution chart with ${historyData.length} entries and theme: ${theme}`
  );

  const planCounts = historyData.reduce((acc, entry) => {
    const plan = entry.geminiPlan || "Unknown";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  Logger.debug("chartHelpers", `Plan distribution data: ${JSON.stringify(planCounts)}`);

  // Sort by count in descending order
  const sortedEntries = Object.entries(planCounts).sort((a, b) => b[1] - a[1]);
  const labels = sortedEntries.map((entry) => entry[0]);
  const data = sortedEntries.map((entry) => entry[1]);
  Logger.debug("chartHelpers", `Chart labels: ${labels.join(", ")}`);

  const { textColor, gridColor } = getChartJsThemeOptions(theme);

  return {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Conversations",
          data,
          backgroundColor: labels.map((plan, index) => PLAN_COLOR_MAP[plan] || FALLBACK_COLORS[index]),
          borderColor: labels.map((plan, index) =>
            (PLAN_COLOR_MAP[plan] || FALLBACK_COLORS[index]).replace("0.8", "1")
          ),
          borderWidth: 1,
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      indexAxis: "y", // This makes the bars horizontal
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
            precision: 0,
          },
          title: {
            display: true,
            text: "Number of Conversations",
            color: textColor,
          },
        },
        y: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Hide legend as it's redundant for this chart
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value * 100) / total);
              return `${value} conversations (${percentage}%)`;
            },
          },
        },
      },
    },
  };
}

/**
 * Generate configuration for gem distribution chart
 * @param {Array} historyData - History data array
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {Object} Chart.js configuration
 */
/**
 * @description Generates the Chart.js configuration for the gem distribution chart.
 * @param {Array} historyData - History data array.
 * @param {string} theme - Current theme ('light' or 'dark').
 * @returns {Object} Chart.js configuration.
 */
export function getGemDistributionChartConfig(historyData, theme) {
  Logger.log(
    "chartHelpers",
    `Generating gem distribution chart with ${historyData.length} entries and theme: ${theme}`
  );

  const gemCounts = historyData.reduce((acc, entry) => {
    const gem = entry.gemName || "Unknown";
    if (gem !== "Unknown") {
      acc[gem] = (acc[gem] || 0) + 1;
    }
    return acc;
  }, {});

  Logger.debug("chartHelpers", `Gem distribution data: ${JSON.stringify(gemCounts)}`);

  // Sort by count in descending order
  const sortedEntries = Object.entries(gemCounts).sort((a, b) => b[1] - a[1]);
  const labels = sortedEntries.map((entry) => entry[0]);
  const data = sortedEntries.map((entry) => entry[1]);
  Logger.debug("chartHelpers", `Chart labels: ${labels.join(", ")}`);

  const { textColor, gridColor } = getChartJsThemeOptions(theme);

  return {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Conversations",
          data,
          backgroundColor: labels.map((gem, index) => getGemColor(gem, index)),
          borderColor: labels.map((gem, index) => getGemColor(gem, index).replace("0.8", "1")),
          borderWidth: 1,
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      indexAxis: "y", // This makes the bars horizontal
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
            precision: 0,
          },
          title: {
            display: true,
            text: "Number of Conversations",
            color: textColor,
          },
        },
        y: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Hide legend as it's redundant for this chart
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value * 100) / total);
              return `${value} conversations (${percentage}%)`;
            },
          },
        },
      },
    },
  };
}
