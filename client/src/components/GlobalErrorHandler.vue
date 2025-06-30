<template>
  <ErrorBoundary @error="handleGlobalError">
    <slot />
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { useErrorReporting } from "@/composables/useErrorReporting";
import { onMounted } from "vue";

import ErrorBoundary from "./ErrorBoundary.vue";

const { reportError, setupGlobalErrorHandling } = useErrorReporting();

function handleGlobalError(error: Error, info: any) {
  reportError(error, {
    component: "GlobalErrorHandler",
    info,
    level: "critical"
  });
}

onMounted(() => {
  setupGlobalErrorHandling();
});
</script>
