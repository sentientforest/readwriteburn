<template>
  <div class="submission-list">
    <h2>{{ subfire?.name || "Submissions" }}</h2>
    <div v-if="loading">
      <p><i>Loading submissions...</i></p>
    </div>
    <div v-else-if="loadError">
      <p><i>Failed to fetch submissions from the server. Please try again later.</i></p>
    </div>
    <div v-else class="submission-board">
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
                :disabled="!submission.userVoteQty || isProcessing || !props.walletAddress"
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
          <h3 class="item-title">{{ submission.name }}</h3>
          <p class="item-description">{{ submission.description }}</p>
          <a v-if="submission.url" :href="submission.url" target="_blank" rel="noopener noreferrer"
            >View Source</a
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MetamaskConnectClient } from "@gala-chain/connect";
import BigNumber from "bignumber.js";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import type { SubfireResDto, SubmissionResDto } from "../types";

interface ExtendedSubmissionResDto extends SubmissionResDto {
  userVoteQty: number | null;
}

const apiBase = import.meta.env.VITE_PROJECT_API;
const burnCostVote = ref(new BigNumber(import.meta.env.VITE_BURN_COST_VOTE ?? 1));

const props = defineProps<{
  walletAddress: string;
  metamaskClient: MetamaskConnectClient;
}>();

const route = useRoute();
const subfireSlug = route.params.slug as string;

const submissions = ref<ExtendedSubmissionResDto[]>([]);
const subfire = ref<SubfireResDto | null>(null);
const loading = ref(false);
const isProcessing = ref(false);
const loadError = ref(false);
const submitError = ref("");
const success = ref("");

async function fetchSubmissions() {
  loading.value = true;
  loadError.value = false;

  try {
    // Fetch subfire details
    const subfireRes = await fetch(`${apiBase}/api/subfires/${subfireSlug}`);
    if (!subfireRes.ok) throw new Error(`Failed to fetch subfire`);
    subfire.value = await subfireRes.json();

    // Fetch submissions for this subfire
    const submissionsRes = await fetch(`${apiBase}/api/subfires/${subfireSlug}/submissions`);
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
  if (!submission.userVoteQty || isProcessing.value) return;

  isProcessing.value = true;
  submitError.value = "";
  success.value = "";

  try {
    const response = await fetch(`${apiBase}/api/submissions/${submission.id}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: submission.userVoteQty
      })
    });

    if (!response.ok) {
      throw new Error("Failed to submit vote");
    }

    success.value = "Vote submitted successfully!";
    submission.userVoteQty = null;
    await fetchSubmissions(); // Refresh the list
  } catch (error) {
    console.error("Error submitting vote:", error);
    submitError.value = "Failed to submit vote. Please try again.";
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
