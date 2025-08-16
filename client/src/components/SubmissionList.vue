<template>
  <div class="submission-list">
    <!-- Fire Hierarchy Navigation -->
    <FireHierarchy :fire-slug="subfireSlug" :show-tree-view="false" class="mb-6" />
    <div v-if="loading">
      <p><i>Loading submissions...</i></p>
    </div>
    <div v-else-if="loadError">
      <p><i>Failed to fetch submissions from the server. Please try again later.</i></p>
    </div>
    <div v-else class="submission-board">
      <!-- Display Mode Toggle -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-900">
          {{ topLevelSubmissions.length }} Submissions
          <span v-if="totalReplies > 0" class="text-sm font-normal text-gray-600">
            ({{ totalReplies }} replies)
          </span>
        </h2>

        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 text-sm text-gray-600">
            <input
              v-model="showThreaded"
              type="checkbox"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Show threaded view
          </label>
        </div>
      </div>

      <!-- Threaded View -->
      <div v-if="showThreaded" class="threaded-submissions space-y-4">
        <ThreadedSubmission
          v-for="submission in topLevelSubmissions"
          :key="submission.id"
          :submission="submission"
          :fire-slug="subfireSlug"
          :depth="0"
          :all-submissions="submissions"
          @submission-updated="fetchSubmissions"
        />
      </div>

      <!-- Classic Flat View -->
      <div v-else class="flat-submissions space-y-4">
        <div v-for="submission in submissions" :key="submission.id" class="submission-item">
          <div class="votes">
            <div class="vote-count">
              <p>{{ submission.votes ?? 0 }}</p>
            </div>
            <div class="vote-form">
              <div class="input-group">
                <input
                  v-model="submission.userVoteQty"
                  type="number"
                  :min="0"
                  step="1"
                  placeholder="🔥🔥🔥"
                  :disabled="isProcessing"
                />
                <span class="currency">GALA</span>
              </div>
              <small class="fee-notice">Network fee: 1 GALA</small>

              <span class="vote-submit">
                <button
                  :disabled="!submission.userVoteQty || isProcessing || !userStore.address"
                  @click="submitVote(submission)"
                >
                  {{ isProcessing ? "Processing..." : "Burn & Vote" }}
                </button>
              </span>

              <p v-if="submitError" class="error">{{ submitError }}</p>
              <p v-if="success" class="success">{{ success }}</p>
            </div>
          </div>
          <div class="item-content">
            <div class="flex items-start justify-between mb-2">
              <h3 class="item-title">{{ submission.name }}</h3>
              <ContentVerificationBadge
                :submission-id="submission.id"
                :initial-verified="submission.hash_verified"
                :initial-moderation-status="submission.moderation_status"
                :show-verify-button="false"
              />
            </div>
            <p class="item-description">{{ submission.description }}</p>
            <div class="flex items-center gap-4 mt-2">
              <a
                v-if="submission.url"
                :href="submission.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary-600 hover:text-primary-700 text-sm"
                >View Source</a
              >
              <router-link
                :to="`/submissions/${submission.id}/verify`"
                class="text-primary-600 hover:text-primary-700 text-sm"
              >
                Verify Content
              </router-link>
              <span v-if="submission.entryParent" class="text-xs text-gray-500">
                Reply to #{{ submission.entryParent }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { VoteService } from "@/services";
import { useUserStore } from "../stores/user";
import type { SubmissionResponse } from "../types/api";
import ContentVerificationBadge from "./ContentVerificationBadge.vue";
import FireHierarchy from "./FireHierarchy.vue";
import ThreadedSubmission from "./ThreadedSubmission.vue";

interface ExtendedSubmissionResDto extends SubmissionResponse {
  userVoteQty: number | null;
}

const apiBase = import.meta.env.VITE_PROJECT_API;

// Access global metamaskClient
const instance = getCurrentInstance();
const metamaskClient = computed(() => instance?.appContext.config.globalProperties.$metamaskClient);

// Create vote service instance
const voteService = computed(() => {
  if (!metamaskClient.value) return null;
  return new VoteService(apiBase, metamaskClient.value);
});

const route = useRoute();
const subfireSlug = route.params.slug as string;
const userStore = useUserStore();

const submissions = ref<ExtendedSubmissionResDto[]>([]);
const loading = ref(false);
const isProcessing = ref(false);
const loadError = ref(false);
const submitError = ref("");
const success = ref("");
const showThreaded = ref(true); // Default to threaded view

// Computed properties for threaded discussions
const topLevelSubmissions = computed(() => {
  return submissions.value.filter((sub) => !sub.entryParent);
});

const totalReplies = computed(() => {
  return submissions.value.filter((sub) => sub.entryParent).length;
});

async function fetchSubmissions() {
  loading.value = true;
  loadError.value = false;

  try {
    // Fetch submissions for this fire
    const submissionsRes = await fetch(`${apiBase}/api/fires/${subfireSlug}/submissions`);
    if (!submissionsRes.ok) throw new Error(`Failed to fetch submissions`);

    const data = await submissionsRes.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid response format");
    }

    submissions.value = data.map((submission) => ({
      ...submission,
      userVoteQty: null
    }));
  } catch (error) {
    console.error("Error fetching submissions:", error);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function submitVote(submission: ExtendedSubmissionResDto) {
  if (!submission.userVoteQty || isProcessing.value || !userStore.address || !voteService.value) return;

  isProcessing.value = true;
  submitError.value = "";
  success.value = "";

  try {
    console.log("Submitting submission vote using VoteService...");
    
    // Use the VoteService to handle the entire voting process
    const result = await voteService.value.voteOnSubmission(submission.id, submission.userVoteQty);

    if (!result.success) {
      throw new Error(result.error || result.message);
    }

    success.value = result.message;
    submission.userVoteQty = null;
    await fetchSubmissions(); // Refresh the list
  } catch (error) {
    console.error("Error submitting vote:", error);
    submitError.value = error instanceof Error ? error.message : "Failed to submit vote. Please try again.";
  } finally {
    isProcessing.value = false;
  }
}

onMounted(async () => {
  await fetchSubmissions();
});
</script>

<style>
.submission-board {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.submission-item {
  display: flex;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
}

.votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 1rem;
  min-width: 120px;
}

.vote-count {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

.vote-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-group input {
  width: 80px;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.currency {
  color: #666;
}

.fee-notice {
  color: #666;
  font-size: 0.8rem;
}

.vote-submit button {
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.vote-submit button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.item-content {
  flex: 1;
}

.item-title {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  color: #333;
}

.item-description {
  margin: 0 0 0.5rem;
  color: #666;
}

.error {
  color: #f44336;
  margin: 0.5rem 0;
}

.success {
  color: #4caf50;
  margin: 0.5rem 0;
}
</style>
