<template>
  <div class="content-verification max-w-4xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Content Verification</h1>
      <p class="text-gray-600 mt-2">Verify the integrity of submission content using cryptographic hashes</p>
    </div>

    <!-- Single Submission Verification -->
    <div v-if="submissionId" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Submission Verification</h2>

      <div v-if="loading" class="text-center py-8">
        <ArrowPathIcon class="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
        <p class="text-gray-600">Loading submission details...</p>
      </div>

      <div v-else-if="submission" class="space-y-4">
        <!-- Submission Info -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="font-semibold text-gray-900 mb-2">{{ submission.name }}</h3>
          <p class="text-gray-600 mb-2">{{ submission.description }}</p>
          <div class="text-sm text-gray-500">
            <span>By {{ submission.contributor }}</span>
            <span class="mx-2">•</span>
            <span>{{ formatDate(submission.created_at) }}</span>
          </div>
        </div>

        <!-- Verification Badge -->
        <ContentVerificationBadge
          :submission-id="submissionId"
          :initial-verified="submission.hash_verified"
          :initial-moderation-status="submission.moderation_status"
          :show-details="true"
          @verified="handleVerificationResult"
          @verification-failed="handleVerificationError"
        />

        <!-- Detailed Verification Results -->
        <div v-if="verificationResult" class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold text-gray-900 mb-3">Verification Details</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">SQLite Hash</label>
              <code class="block w-full p-2 bg-white border rounded text-xs font-mono break-all">
                {{ verificationResult.sqliteHash }}
              </code>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Blockchain Hash</label>
              <code class="block w-full p-2 bg-white border rounded text-xs font-mono break-all">
                {{ verificationResult.chainHash }}
              </code>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Current Content Hash</label>
              <code class="block w-full p-2 bg-white border rounded text-xs font-mono break-all">
                {{ verificationResult.currentHash }}
              </code>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
              <div class="flex items-center gap-2">
                <CheckCircleIcon v-if="verificationResult.verified" class="h-5 w-5 text-success-500" />
                <ExclamationTriangleIcon v-else class="h-5 w-5 text-warning-500" />
                <span :class="verificationResult.verified ? 'text-success-700' : 'text-warning-700'">
                  {{ verificationResult.verified ? "Verified" : "Hash Mismatch" }}
                </span>
              </div>
            </div>
          </div>

          <!-- Hash Mismatch Warning -->
          <div
            v-if="!verificationResult.verified"
            class="mt-4 p-4 bg-warning-50 border border-warning-200 rounded-lg"
          >
            <div class="flex items-start gap-3">
              <ExclamationTriangleIcon class="h-5 w-5 text-warning-500 mt-0.5" />
              <div>
                <h5 class="font-semibold text-warning-800">Content Integrity Warning</h5>
                <p class="text-warning-700 text-sm mt-1">
                  The current content does not match the original hash stored on the blockchain. This may
                  indicate the content has been modified for moderation purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <ExclamationTriangleIcon class="h-8 w-8 mx-auto text-error-400 mb-2" />
        <p class="text-error-600">{{ error }}</p>
        <button class="mt-2 text-sm text-primary-600 hover:text-primary-700" @click="fetchSubmission">
          Try Again
        </button>
      </div>
    </div>

    <!-- Bulk Verification Interface -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold mb-4">Bulk Verification</h2>

      <div class="space-y-4">
        <div>
          <label for="submission-ids" class="block text-sm font-medium text-gray-700 mb-2">
            Submission IDs (one per line, max 1000)
          </label>
          <textarea
            id="submission-ids"
            v-model="bulkIds"
            rows="6"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="1&#10;2&#10;3&#10;..."
          ></textarea>
        </div>

        <div class="flex items-center gap-3">
          <button
            :disabled="bulkVerifying || !parsedBulkIds.length || parsedBulkIds.length > 1000"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            @click="performBulkVerification"
          >
            <ArrowPathIcon v-if="bulkVerifying" class="h-4 w-4 animate-spin" />
            <ShieldCheckIcon v-else class="h-4 w-4" />
            {{ bulkVerifying ? "Verifying..." : "Verify All" }}
          </button>

          <span class="text-sm text-gray-600">
            {{ parsedBulkIds.length }} submission{{ parsedBulkIds.length !== 1 ? "s" : "" }}
            {{ parsedBulkIds.length > 1000 ? "(max 1000)" : "" }}
          </span>
        </div>

        <!-- Bulk Results -->
        <div v-if="bulkResults.length > 0" class="space-y-3">
          <h3 class="font-semibold text-gray-900">Verification Results</h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="result in bulkResults"
              :key="result.id"
              :class="[
                'p-3 rounded-lg border',
                result.status === 'verified'
                  ? 'bg-success-50 border-success-200'
                  : result.status === 'hash_mismatch'
                    ? 'bg-warning-50 border-warning-200'
                    : 'bg-error-50 border-error-200'
              ]"
            >
              <div class="flex items-center gap-2 mb-1">
                <CheckCircleIcon v-if="result.status === 'verified'" class="h-4 w-4 text-success-500" />
                <ExclamationTriangleIcon
                  v-else-if="result.status === 'hash_mismatch'"
                  class="h-4 w-4 text-warning-500"
                />
                <XCircleIcon v-else class="h-4 w-4 text-error-500" />
                <span class="font-medium text-sm">ID: {{ result.id }}</span>
              </div>
              <div class="text-xs capitalize text-gray-600">
                {{ result.status.replace("_", " ") }}
              </div>
            </div>
          </div>

          <!-- Summary Stats -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 mb-2">Summary</h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span class="block text-gray-600">Total</span>
                <span class="font-semibold">{{ bulkResults.length }}</span>
              </div>
              <div>
                <span class="block text-gray-600">Verified</span>
                <span class="font-semibold text-success-600">{{ verifiedCount }}</span>
              </div>
              <div>
                <span class="block text-gray-600">Mismatched</span>
                <span class="font-semibold text-warning-600">{{ mismatchedCount }}</span>
              </div>
              <div>
                <span class="block text-gray-600">Errors</span>
                <span class="font-semibold text-error-600">{{ errorCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSubmissionsStore } from "@/stores";
import type { BulkVerificationResponse, ContentVerificationResponse, SubmissionResponse } from "@/types/api";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  XCircleIcon
} from "@heroicons/vue/24/outline";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import ContentVerificationBadge from "./ContentVerificationBadge.vue";

const route = useRoute();
const submissionsStore = useSubmissionsStore();

// Props from route
const submissionId = computed(() => {
  const id = route.params.id || route.query.id;
  return id ? parseInt(id as string) : null;
});

// Single verification state
const submission = ref<SubmissionResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const verificationResult = ref<ContentVerificationResponse | null>(null);

// Bulk verification state
const bulkIds = ref("");
const bulkVerifying = ref(false);
const bulkResults = ref<any[]>([]);

// Computed properties for bulk verification
const parsedBulkIds = computed(() => {
  return bulkIds.value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !isNaN(parseInt(line)))
    .map((line) => parseInt(line));
});

const verifiedCount = computed(() => bulkResults.value.filter((r) => r.status === "verified").length);

const mismatchedCount = computed(() => bulkResults.value.filter((r) => r.status === "hash_mismatch").length);

const errorCount = computed(
  () => bulkResults.value.filter((r) => r.status === "error" || r.status === "not_found").length
);

// Watch for submission ID changes
watch(submissionId, (newId) => {
  if (newId) {
    fetchSubmission();
  }
});

async function fetchSubmission() {
  if (!submissionId.value) return;

  loading.value = true;
  error.value = null;

  try {
    const result = await submissionsStore.fetchSubmissionById(submissionId.value);
    submission.value = result;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to fetch submission";
  } finally {
    loading.value = false;
  }
}

function handleVerificationResult(result: ContentVerificationResponse) {
  verificationResult.value = result;
}

function handleVerificationError(errorMessage: string) {
  error.value = errorMessage;
}

async function performBulkVerification() {
  if (bulkVerifying.value || parsedBulkIds.value.length === 0 || parsedBulkIds.value.length > 1000) {
    return;
  }

  bulkVerifying.value = true;
  bulkResults.value = [];

  try {
    const result: BulkVerificationResponse = await submissionsStore.bulkVerifyContent(parsedBulkIds.value);
    bulkResults.value = result.results;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Bulk verification failed";
  } finally {
    bulkVerifying.value = false;
  }
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateString;
  }
}

// Fetch submission on mount if ID is available
onMounted(() => {
  if (submissionId.value) {
    fetchSubmission();
  }
});
</script>

<style scoped>
code {
  @apply bg-gray-100;
}
</style>
