<template>
  <div class="moderation-panel max-w-6xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Content Moderation</h1>
      <p class="text-gray-600 mt-2">Manage content integrity and community guidelines</p>
    </div>

    <!-- Moderation Queue -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Moderation Queue</h2>
        <div class="flex items-center gap-3">
          <button
            :disabled="loading"
            class="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
            @click="refreshQueue"
          >
            <ArrowPathIcon :class="['h-4 w-4', loading && 'animate-spin']" />
            Refresh
          </button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">
            Status Filter
          </label>
          <select
            id="status-filter"
            v-model="statusFilter"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="removed">Removed</option>
            <option value="modified">Modified</option>
          </select>
        </div>

        <div>
          <label for="verification-filter" class="block text-sm font-medium text-gray-700 mb-1">
            Verification Filter
          </label>
          <select
            id="verification-filter"
            v-model="verificationFilter"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Verification</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>

        <div>
          <label for="fire-filter" class="block text-sm font-medium text-gray-700 mb-1"> Fire Filter </label>
          <select
            id="fire-filter"
            v-model="fireFilter"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Fires</option>
            <option v-for="fire in availableFires" :key="fire.slug" :value="fire.slug">
              {{ fire.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Submissions List -->
      <div v-if="loading && filteredSubmissions.length === 0" class="p-8 text-center">
        <ArrowPathIcon class="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
        <p class="text-gray-600">Loading submissions...</p>
      </div>

      <div v-else-if="filteredSubmissions.length === 0" class="p-8 text-center">
        <FlagIcon class="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p class="text-gray-600">No submissions found for the current filters</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="submission in filteredSubmissions"
          :key="submission.id"
          class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                  <h3 class="font-semibold text-gray-900 truncate">{{ submission.name }}</h3>
                  <ContentVerificationBadge
                    :submission-id="submission.id"
                    :initial-verified="submission.hash_verified"
                    :initial-moderation-status="submission.moderation_status"
                    :show-verify-button="true"
                  />
                </div>

                <p class="text-gray-600 text-sm mb-2 line-clamp-2">{{ submission.description }}</p>

                <div class="text-xs text-gray-500 space-y-1">
                  <div class="flex flex-wrap gap-x-3 gap-y-1">
                    <span><span class="font-medium">ID:</span> {{ submission.id }}</span>
                    <span><span class="font-medium">Fire:</span> {{ submission.subfire_id }}</span>
                    <span
                      ><span class="font-medium">Contributor:</span>
                      {{ formatAddress(submission.contributor) }}</span
                    >
                  </div>
                  <div v-if="submission.created_at">
                    <span class="font-medium">Created:</span> {{ formatDate(submission.created_at) }}
                  </div>
                </div>
              </div>

              <!-- Moderation Actions -->
              <div class="flex flex-wrap gap-2 sm:gap-1 sm:flex-col lg:flex-row lg:items-center">
                <button
                  :disabled="processing"
                  class="flex-1 sm:flex-none px-3 py-2 text-xs bg-warning-600 text-white rounded hover:bg-warning-700 disabled:opacity-50 min-h-[36px] touch-manipulation"
                  @click="openModerationModal(submission, 'flag')"
                >
                  Flag
                </button>
                <button
                  :disabled="processing"
                  class="flex-1 sm:flex-none px-3 py-2 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 min-h-[36px] touch-manipulation"
                  @click="openModerationModal(submission, 'modify')"
                >
                  Modify
                </button>
                <button
                  :disabled="processing"
                  class="flex-1 sm:flex-none px-3 py-2 text-xs bg-error-600 text-white rounded hover:bg-error-700 disabled:opacity-50 min-h-[36px] touch-manipulation"
                  @click="openModerationModal(submission, 'remove')"
                >
                  Remove
                </button>
                <button
                  v-if="submission.moderation_status !== 'active'"
                  :disabled="processing"
                  class="flex-1 sm:flex-none px-3 py-2 text-xs bg-success-600 text-white rounded hover:bg-success-700 disabled:opacity-50 min-h-[36px] touch-manipulation"
                  @click="openModerationModal(submission, 'restore')"
                >
                  Restore
                </button>
              </div>
            </div>
          </div>

          <!-- Moderation History (if available) -->
          <div
            v-if="getModerationHistory(submission.id).length > 0"
            class="mt-3 pt-3 border-t border-gray-200"
          >
            <button
              class="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              @click="toggleHistoryVisibility(submission.id)"
            >
              <ChevronDownIcon
                :class="['h-3 w-3 transition-transform', historyVisibility[submission.id] && 'rotate-180']"
              />
              {{ getModerationHistory(submission.id).length }} moderation action(s)
            </button>

            <div v-if="historyVisibility[submission.id]" class="mt-2 space-y-2">
              <div
                v-for="action in getModerationHistory(submission.id)"
                :key="action.id"
                class="text-xs bg-gray-50 rounded p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium capitalize">{{ action.action.replace("_", " ") }}</span>
                  <span class="text-gray-500">{{ formatDate(action.created_at) }}</span>
                </div>
                <div class="mt-1">
                  <span class="text-gray-600">{{ action.reason }}</span>
                  <span class="text-gray-500"> - by {{ formatAddress(action.admin_user) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Moderation Modal -->
    <div
      v-if="showModerationModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold capitalize">{{ currentModerationAction }} Content</h3>
            <button class="text-gray-400 hover:text-gray-600" @click="closeModerationModal">
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>

          <div v-if="currentSubmission" class="space-y-4">
            <!-- Submission Info -->
            <div class="bg-gray-50 rounded-lg p-3">
              <h4 class="font-medium text-gray-900 mb-1">{{ currentSubmission.name }}</h4>
              <p class="text-sm text-gray-600">{{ currentSubmission.description }}</p>
            </div>

            <!-- Reason Input -->
            <div>
              <label for="moderation-reason" class="block text-sm font-medium text-gray-700 mb-1">
                Reason for {{ currentModerationAction }}
              </label>
              <textarea
                id="moderation-reason"
                v-model="moderationReason"
                rows="3"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                :placeholder="`Enter reason for ${currentModerationAction}...`"
              ></textarea>
            </div>

            <!-- New Content (for modify action) -->
            <div v-if="currentModerationAction === 'modify'">
              <label for="new-content" class="block text-sm font-medium text-gray-700 mb-1">
                New Content
              </label>
              <textarea
                id="new-content"
                v-model="newContent"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter the modified content..."
              ></textarea>
            </div>

            <!-- Warning Message -->
            <div class="bg-warning-50 border border-warning-200 rounded-lg p-3">
              <div class="flex items-start gap-2">
                <ExclamationTriangleIcon class="h-5 w-5 text-warning-500 mt-0.5" />
                <div class="text-sm">
                  <p class="font-medium text-warning-800">Moderation Warning</p>
                  <p class="text-warning-700 mt-1">
                    This action will {{ getModerationWarning(currentModerationAction) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                :disabled="processing || !moderationReason.trim()"
                :class="[
                  'w-full sm:flex-1 px-4 py-3 text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]',
                  getModerationButtonClass(currentModerationAction)
                ]"
                @click="executeModerationAction"
              >
                <ArrowPathIcon v-if="processing" class="h-4 w-4 animate-spin" />
                {{ processing ? "Processing..." : `Confirm ${currentModerationAction}` }}
              </button>

              <button
                :disabled="processing"
                class="w-full sm:w-auto px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 min-h-[44px]"
                @click="closeModerationModal"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFiresStore, useSubmissionsStore } from "@/stores";
import type { ModerationLogEntry, ModerationRequest, SubmissionResponse } from "@/types/api";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  XMarkIcon
} from "@heroicons/vue/24/outline";
import { computed, onMounted, ref, watch } from "vue";

import ContentVerificationBadge from "./ContentVerificationBadge.vue";

const submissionsStore = useSubmissionsStore();
const firesStore = useFiresStore();

// State
const loading = ref(false);
const processing = ref(false);
const statusFilter = ref("");
const verificationFilter = ref("");
const fireFilter = ref("");

// Moderation modal state
const showModerationModal = ref(false);
const currentSubmission = ref<SubmissionResponse | null>(null);
const currentModerationAction = ref<"flag" | "modify" | "remove" | "restore">("flag");
const moderationReason = ref("");
const newContent = ref("");

// History visibility state
const historyVisibility = ref<Record<number, boolean>>({});

// Mock moderation history (in real app, this would come from API)
const moderationHistory = ref<Record<number, ModerationLogEntry[]>>({});

// Computed properties
const submissions = computed(() => submissionsStore.submissions);
const availableFires = computed(() => firesStore.fires);

const filteredSubmissions = computed(() => {
  let filtered = [...submissions.value];

  if (statusFilter.value) {
    filtered = filtered.filter((sub) => sub.moderation_status === statusFilter.value);
  }

  if (verificationFilter.value === "verified") {
    filtered = filtered.filter((sub) => sub.hash_verified);
  } else if (verificationFilter.value === "unverified") {
    filtered = filtered.filter((sub) => !sub.hash_verified);
  }

  if (fireFilter.value) {
    filtered = filtered.filter((sub) => sub.subfire_id === fireFilter.value);
  }

  return filtered;
});

// Watch filters
watch([statusFilter, verificationFilter, fireFilter], () => {
  // Auto-refresh when filters change
  refreshQueue();
});

async function refreshQueue() {
  loading.value = true;

  try {
    // Fetch all submissions across all fires
    await Promise.all([
      firesStore.fetchFires(),
      // Fetch submissions for each fire
      ...firesStore.fires.map((fire) => submissionsStore.fetchSubmissions(fire.slug, true))
    ]);
  } catch (error) {
    console.error("Error refreshing moderation queue:", error);
  } finally {
    loading.value = false;
  }
}

function openModerationModal(submission: SubmissionResponse, action: typeof currentModerationAction.value) {
  currentSubmission.value = submission;
  currentModerationAction.value = action;
  moderationReason.value = "";
  newContent.value = action === "modify" ? submission.description : "";
  showModerationModal.value = true;
}

function closeModerationModal() {
  showModerationModal.value = false;
  currentSubmission.value = null;
  moderationReason.value = "";
  newContent.value = "";
}

async function executeModerationAction() {
  if (!currentSubmission.value || processing.value || !moderationReason.value.trim()) {
    return;
  }

  processing.value = true;

  try {
    const moderationRequest: ModerationRequest = {
      action: currentModerationAction.value,
      reason: moderationReason.value.trim(),
      newContent: currentModerationAction.value === "modify" ? newContent.value : undefined
    };

    // Call moderation API (placeholder - implement in store)
    const response = await fetch(
      `${import.meta.env.VITE_PROJECT_API}/api/admin/submissions/${currentSubmission.value.id}/moderate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(moderationRequest)
      }
    );

    if (!response.ok) {
      throw new Error("Moderation action failed");
    }

    const result = await response.json();
    console.log("Moderation action result:", result);

    // Update local submission state
    submissionsStore.updateSubmissionModerationStatus(
      currentSubmission.value.id,
      currentModerationAction.value,
      false // Mark as unverified after moderation
    );

    // Add to moderation history
    const historyEntry: ModerationLogEntry = {
      id: Date.now(), // Mock ID
      submission_id: currentSubmission.value.id,
      action: currentModerationAction.value,
      reason: moderationReason.value,
      admin_user: "current-admin", // Would come from user store
      original_hash: result.originalHash || "",
      new_hash: result.newHash,
      created_at: new Date().toISOString()
    };

    if (!moderationHistory.value[currentSubmission.value.id]) {
      moderationHistory.value[currentSubmission.value.id] = [];
    }
    moderationHistory.value[currentSubmission.value.id].unshift(historyEntry);

    closeModerationModal();

    // Refresh the queue to show updated status
    await refreshQueue();
  } catch (error) {
    console.error("Moderation action failed:", error);
    // TODO: Show error toast
  } finally {
    processing.value = false;
  }
}

function getModerationHistory(submissionId: number): ModerationLogEntry[] {
  return moderationHistory.value[submissionId] || [];
}

function toggleHistoryVisibility(submissionId: number) {
  historyVisibility.value[submissionId] = !historyVisibility.value[submissionId];
}

function getModerationWarning(action: string): string {
  switch (action) {
    case "flag":
      return "mark this content as flagged for review but keep it visible.";
    case "modify":
      return "change the content while preserving the original hash on the blockchain.";
    case "remove":
      return "hide this content from public view while preserving the blockchain record.";
    case "restore":
      return "restore this content to active status and make it visible again.";
    default:
      return "perform this moderation action.";
  }
}

function getModerationButtonClass(action: string): string {
  switch (action) {
    case "flag":
      return "bg-warning-600 hover:bg-warning-700";
    case "modify":
      return "bg-primary-600 hover:bg-primary-700";
    case "remove":
      return "bg-error-600 hover:bg-error-700";
    case "restore":
      return "bg-success-600 hover:bg-success-700";
    default:
      return "bg-gray-600 hover:bg-gray-700";
  }
}

function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateString;
  }
}

// Load initial data
onMounted(async () => {
  await refreshQueue();
});
</script>

<style scoped>
/* Line clamp utility for description text */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Touch-friendly interactions */
.touch-manipulation {
  touch-action: manipulation;
}

/* Mobile-specific button adjustments */
@media (max-width: 640px) {
  .moderation-panel {
    padding: 1rem;
  }

  /* Ensure buttons are properly sized for touch */
  button {
    min-height: 44px;
  }

  /* Stack action buttons vertically on very small screens */
  .flex-wrap > button {
    min-width: calc(50% - 0.25rem);
  }
}

/* Ensure modal is properly sized on mobile */
@media (max-width: 768px) {
  .bg-white.rounded-lg.shadow-xl {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }
}
</style>
