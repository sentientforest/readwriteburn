<template>
  <div class="performance-dashboard bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Performance Monitoring</h3>
      <p class="text-gray-600 text-sm">Real-time application performance metrics and user analytics</p>
    </div>

    <!-- Performance Score -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-md font-semibold text-gray-900">Performance Score</h4>
        <div class="flex items-center gap-2">
          <div
            :class="[
              'w-3 h-3 rounded-full',
              performanceScore >= 90
                ? 'bg-success-500'
                : performanceScore >= 70
                  ? 'bg-warning-500'
                  : 'bg-error-500'
            ]"
          ></div>
          <span
            :class="[
              'text-2xl font-bold',
              performanceScore >= 90
                ? 'text-success-600'
                : performanceScore >= 70
                  ? 'text-warning-600'
                  : 'text-error-600'
            ]"
          >
            {{ performanceScore }}
          </span>
        </div>
      </div>

      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          :class="[
            'h-2 rounded-full transition-all duration-500',
            performanceScore >= 90
              ? 'bg-success-500'
              : performanceScore >= 70
                ? 'bg-warning-500'
                : 'bg-error-500'
          ]"
          :style="{ width: `${performanceScore}%` }"
        ></div>
      </div>
    </div>

    <!-- Web Vitals -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">LCP</p>
            <p class="text-lg font-semibold text-gray-900">
              {{ formatMs(metrics.LCP) }}
            </p>
          </div>
          <div :class="['w-2 h-2 rounded-full', getLCPStatus(metrics.LCP)]"></div>
        </div>
        <p class="text-xs text-gray-500 mt-1">Largest Contentful Paint</p>
      </div>

      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">FID</p>
            <p class="text-lg font-semibold text-gray-900">
              {{ formatMs(metrics.FID) }}
            </p>
          </div>
          <div :class="['w-2 h-2 rounded-full', getFIDStatus(metrics.FID)]"></div>
        </div>
        <p class="text-xs text-gray-500 mt-1">First Input Delay</p>
      </div>

      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">CLS</p>
            <p class="text-lg font-semibold text-gray-900">
              {{ formatCLS(metrics.CLS) }}
            </p>
          </div>
          <div :class="['w-2 h-2 rounded-full', getCLSStatus(metrics.CLS)]"></div>
        </div>
        <p class="text-xs text-gray-500 mt-1">Cumulative Layout Shift</p>
      </div>

      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">TTFB</p>
            <p class="text-lg font-semibold text-gray-900">
              {{ formatMs(metrics.TTFB) }}
            </p>
          </div>
          <div :class="['w-2 h-2 rounded-full', getTTFBStatus(metrics.TTFB)]"></div>
        </div>
        <p class="text-xs text-gray-500 mt-1">Time to First Byte</p>
      </div>
    </div>

    <!-- System Metrics -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div>
        <h4 class="text-md font-semibold text-gray-900 mb-3">System Resources</h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Memory Usage</span>
            <span class="text-sm font-medium text-gray-900">
              {{ formatMemory(metrics.memoryUsage) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Load Time</span>
            <span class="text-sm font-medium text-gray-900">
              {{ formatMs(metrics.loadTime) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Route Change Time</span>
            <span class="text-sm font-medium text-gray-900">
              {{ formatMs(metrics.routeChangeTime) }}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 class="text-md font-semibold text-gray-900 mb-3">User Activity</h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Session Duration</span>
            <span class="text-sm font-medium text-gray-900">
              {{ formatDuration(sessionInfo?.duration) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Page Views</span>
            <span class="text-sm font-medium text-gray-900">
              {{ sessionInfo?.pageViews || 0 }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">User Interactions</span>
            <span class="text-sm font-medium text-gray-900">
              {{ metrics.userInteractions }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- API Performance -->
    <div class="mb-8">
      <h4 class="text-md font-semibold text-gray-900 mb-3">API Performance</h4>
      <div class="bg-gray-50 rounded-lg p-4">
        <div v-if="Object.keys(metrics.apiResponseTimes).length === 0" class="text-center py-4">
          <p class="text-sm text-gray-500">No API calls recorded yet</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(time, endpoint) in metrics.apiResponseTimes"
            :key="endpoint"
            class="flex justify-between items-center"
          >
            <span class="text-sm text-gray-600 font-mono">{{ endpoint }}</span>
            <span
              :class="[
                'text-sm font-medium',
                time > 2000 ? 'text-error-600' : time > 1000 ? 'text-warning-600' : 'text-success-600'
              ]"
            >
              {{ time.toFixed(0) }}ms
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Metrics -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-md font-semibold text-gray-900">Error Tracking</h4>
        <button
          class="text-sm text-primary-600 hover:text-primary-700"
          @click="showErrorDetails = !showErrorDetails"
        >
          {{ showErrorDetails ? "Hide" : "View" }} Details
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-error-50 rounded-lg p-4">
          <p class="text-xs font-medium text-error-500 uppercase tracking-wider">Total Errors</p>
          <p class="text-2xl font-semibold text-error-900">{{ errorStats.totalErrors }}</p>
        </div>
        <div class="bg-warning-50 rounded-lg p-4">
          <p class="text-xs font-medium text-warning-500 uppercase tracking-wider">Recent Errors</p>
          <p class="text-2xl font-semibold text-warning-900">{{ errorStats.recentErrors }}</p>
        </div>
        <div class="bg-primary-50 rounded-lg p-4">
          <p class="text-xs font-medium text-primary-500 uppercase tracking-wider">Rate Limited</p>
          <p class="text-2xl font-semibold text-primary-900">
            {{ errorStats.rateLimited ? "Yes" : "No" }}
          </p>
        </div>
      </div>

      <div v-if="showErrorDetails && errorHistory.length > 0" class="mt-4 bg-gray-50 rounded-lg p-4">
        <h5 class="text-sm font-medium text-gray-900 mb-3">Recent Errors</h5>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          <div v-for="error in errorHistory.slice(0, 10)" :key="error.timestamp" class="text-xs">
            <div class="flex justify-between items-start">
              <span class="text-gray-900 font-medium">{{ error.message }}</span>
              <span class="text-gray-500">{{ formatDate(error.timestamp) }}</span>
            </div>
            <span class="text-gray-600">{{ error.component }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-3">
      <button
        :disabled="refreshing"
        class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
        @click="refreshMetrics"
      >
        <svg v-if="refreshing" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        {{ refreshing ? "Refreshing..." : "Refresh Metrics" }}
      </button>

      <button class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" @click="exportMetrics">
        Export Data
      </button>

      <button
        class="px-4 py-2 bg-warning-600 text-white rounded-lg hover:bg-warning-700"
        @click="clearErrorHistory"
      >
        Clear Errors
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAnalytics } from "@/composables/useAnalytics";
import { useErrorReporting } from "@/composables/useErrorReporting";
import { usePerformanceMonitoring } from "@/composables/usePerformanceMonitoring";
import { computed, onMounted, onUnmounted, ref } from "vue";

const { metrics, getCurrentMetrics, getPerformanceScore, reportMetrics } = usePerformanceMonitoring();

const { getSessionInfo } = useAnalytics();
const { getErrorHistory, getErrorStats, clearErrorHistory: clearErrors } = useErrorReporting();

// State
const showErrorDetails = ref(false);
const refreshing = ref(false);

// Computed
const performanceScore = computed(() => getPerformanceScore());
const sessionInfo = computed(() => getSessionInfo());
const errorHistory = computed(() => getErrorHistory());
const errorStats = computed(() => getErrorStats());

// Auto-refresh
let refreshInterval: NodeJS.Timeout | null = null;

// Formatting helpers
function formatMs(value: number | null): string {
  if (value === null) return "-";
  return `${value.toFixed(0)}ms`;
}

function formatCLS(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(3);
}

function formatMemory(bytes: number | null): string {
  if (bytes === null) return "-";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return "-";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatDate(timestamp: string | undefined): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleTimeString();
}

// Status helpers
function getLCPStatus(value: number | null): string {
  if (value === null) return "bg-gray-400";
  if (value <= 2500) return "bg-success-500";
  if (value <= 4000) return "bg-warning-500";
  return "bg-error-500";
}

function getFIDStatus(value: number | null): string {
  if (value === null) return "bg-gray-400";
  if (value <= 100) return "bg-success-500";
  if (value <= 300) return "bg-warning-500";
  return "bg-error-500";
}

function getCLSStatus(value: number | null): string {
  if (value === null) return "bg-gray-400";
  if (value <= 0.1) return "bg-success-500";
  if (value <= 0.25) return "bg-warning-500";
  return "bg-error-500";
}

function getTTFBStatus(value: number | null): string {
  if (value === null) return "bg-gray-400";
  if (value <= 800) return "bg-success-500";
  if (value <= 1800) return "bg-warning-500";
  return "bg-error-500";
}

// Actions
async function refreshMetrics() {
  refreshing.value = true;
  try {
    getCurrentMetrics();
    await reportMetrics();
  } finally {
    refreshing.value = false;
  }
}

function exportMetrics() {
  const data = {
    timestamp: new Date().toISOString(),
    performanceScore: performanceScore.value,
    metrics: metrics.value,
    sessionInfo: sessionInfo.value,
    errorStats: errorStats.value
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `performance-metrics-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearErrorHistory() {
  clearErrors();
}

onMounted(() => {
  // Set up auto-refresh every 30 seconds
  refreshInterval = setInterval(refreshMetrics, 30000);

  // Initial refresh
  refreshMetrics();
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
