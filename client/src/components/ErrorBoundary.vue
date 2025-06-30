<template>
  <div v-if="hasError" class="error-boundary min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <div class="flex items-center mb-4">
        <svg class="h-8 w-8 text-error-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 class="text-xl font-semibold text-gray-900">Something went wrong</h2>
      </div>

      <div class="mb-6">
        <p class="text-gray-600 text-sm mb-4">
          We encountered an unexpected error. Don't worry, your data is safe and we're working to fix this.
        </p>

        <div v-if="showDetails" class="bg-gray-50 rounded-lg p-3 mt-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Error Details:</h4>
          <p class="text-xs text-gray-600 font-mono break-all">{{ errorMessage }}</p>
          <div v-if="errorInfo" class="mt-2">
            <p class="text-xs text-gray-500">Component Stack:</p>
            <p class="text-xs text-gray-600 font-mono whitespace-pre-wrap">{{ errorInfo }}</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <button
          :disabled="retrying"
          class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          @click="handleRetry"
        >
          <svg v-if="retrying" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {{ retrying ? "Retrying..." : "Try Again" }}
        </button>

        <button
          class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          @click="handleReload"
        >
          Reload Page
        </button>
      </div>

      <div class="mt-4 pt-4 border-t border-gray-200">
        <button
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          @click="showDetails = !showDetails"
        >
          <svg
            :class="['h-4 w-4 transition-transform', showDetails && 'rotate-180']"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
          {{ showDetails ? "Hide" : "Show" }} technical details
        </button>
      </div>

      <div class="mt-4 text-center">
        <p class="text-xs text-gray-500">
          If the problem persists, please
          <a href="#" class="text-primary-600 hover:text-primary-700 underline" @click="handleReport">
            report this issue
          </a>
        </p>
      </div>
    </div>
  </div>

  <slot v-else />
</template>

<script setup lang="ts">
import { useErrorReporting } from "@/composables/useErrorReporting";
import { nextTick, onErrorCaptured, ref } from "vue";
// Reset error state when component unmounts
import { onBeforeUnmount } from "vue";

interface Props {
  fallbackComponent?: any;
  maxRetries?: number;
  onError?: (error: Error, info: any) => void;
}

const props = withDefaults(defineProps<Props>(), {
  maxRetries: 3,
  onError: undefined
});

const { reportError } = useErrorReporting();

// Error state
const hasError = ref(false);
const errorMessage = ref("");
const errorInfo = ref("");
const showDetails = ref(false);
const retrying = ref(false);
const retryCount = ref(0);

// Error recovery
let retryTimeout: NodeJS.Timeout | null = null;

onErrorCaptured((error: Error, instance: any, info: string) => {
  console.error("ErrorBoundary captured error:", error, info);

  hasError.value = true;
  errorMessage.value = error.message || "Unknown error occurred";
  errorInfo.value = info;

  // Call custom error handler if provided
  if (props.onError) {
    props.onError(error, info);
  }

  // Report error for monitoring
  reportError(error, {
    component: "ErrorBoundary",
    info,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    url: window.location.href
  });

  // Prevent the error from propagating further
  return false;
});

async function handleRetry() {
  if (retryCount.value >= props.maxRetries) {
    console.warn("Max retry attempts reached");
    return;
  }

  retrying.value = true;
  retryCount.value++;

  try {
    // Wait a moment before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Reset error state
    hasError.value = false;
    errorMessage.value = "";
    errorInfo.value = "";

    // Force component re-render
    await nextTick();
  } catch (retryError) {
    console.error("Retry failed:", retryError);
    hasError.value = true;
  } finally {
    retrying.value = false;
  }
}

function handleReload() {
  window.location.reload();
}

function handleReport() {
  // Create detailed error report
  const errorReport = {
    message: errorMessage.value,
    info: errorInfo.value,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    retryCount: retryCount.value
  };

  // Copy to clipboard for easy reporting
  navigator.clipboard
    .writeText(JSON.stringify(errorReport, null, 2))
    .then(() => {
      alert("Error details copied to clipboard. Please paste this when reporting the issue.");
    })
    .catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = JSON.stringify(errorReport, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Error details copied to clipboard. Please paste this when reporting the issue.");
    });
}

// Auto-retry mechanism for certain types of errors
function shouldAutoRetry(error: Error): boolean {
  const retryableErrors = ["Network Error", "Failed to fetch", "Load failed", "ChunkLoadError"];

  return retryableErrors.some((retryableError) => error.message.includes(retryableError));
}

// Cleanup
function cleanup() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
}

onBeforeUnmount(cleanup);
</script>

<style scoped>
.error-boundary {
  /* Ensure the error boundary takes full height and provides a clean layout */
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif;
}

/* Animation for retry spinner */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Smooth transitions */
.transition-transform {
  transition: transform 0.2s ease-in-out;
}

.rotate-180 {
  transform: rotate(180deg);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .error-boundary {
    padding: 1rem;
  }

  .error-boundary .max-w-md {
    margin: 0;
  }
}
</style>
