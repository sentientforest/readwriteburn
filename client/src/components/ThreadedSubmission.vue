<template>
  <div class="threaded-submission" :style="{ marginLeft: `${depth * 20}px` }">
    <!-- Main Submission -->
    <div
      :class="[
        'submission-item',
        depth > 0 ? 'border-l-2 border-gray-200 pl-4' : '',
        'bg-white border border-gray-200 rounded-lg p-4 mb-3'
      ]"
    >
      <div class="flex gap-4">
        <!-- Vote Section -->
        <div class="votes flex flex-col items-center min-w-[120px]">
          <div class="vote-count text-lg font-bold text-gray-800 mb-2">
            {{ submission.votes ?? 0 }}
          </div>
          <div class="vote-form flex flex-col items-center gap-2">
            <div class="input-group flex items-center gap-2">
              <input
                v-model="voteQuantity"
                type="number"
                :min="0"
                step="1"
                placeholder="🔥🔥🔥"
                :disabled="isVoting"
                class="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span class="text-xs text-gray-500">GALA</span>
            </div>
            <button
              :disabled="!voteQuantity || isVoting || !userStore.isAuthenticated"
              class="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
              @click="submitVote"
            >
              {{ isVoting ? "Voting..." : "Vote" }}
            </button>
          </div>
        </div>

        <!-- Content Section -->
        <div class="content flex-1">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <h4 :class="['font-medium', depth === 0 ? 'text-lg text-gray-900' : 'text-base text-gray-800']">
                {{ submission.name }}
              </h4>
              <ContentVerificationBadge
                :submission-id="submission.id"
                :initial-verified="submission.hash_verified"
                :initial-moderation-status="submission.moderation_status"
                :show-verify-button="false"
                class="scale-75"
              />
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span>by {{ formatUser(submission.contributor) }}</span>
              <span>{{ formatDate(submission.created_at) }}</span>
            </div>
          </div>

          <p class="text-gray-700 text-sm mb-3">{{ submission.description }}</p>

          <div class="flex items-center gap-4 text-sm">
            <a
              v-if="submission.url"
              :href="submission.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary-600 hover:text-primary-700"
            >
              View Source
            </a>

            <router-link
              :to="`/submissions/${submission.id}/verify`"
              class="text-primary-600 hover:text-primary-700"
            >
              Verify Content
            </router-link>

            <button class="text-primary-600 hover:text-primary-700" @click="toggleReplyForm">Reply</button>

            <router-link
              :to="`/f/${fireSlug}/reply?replyTo=${submission.id}`"
              class="text-primary-600 hover:text-primary-700"
            >
              Reply (new page)
            </router-link>

            <button
              v-if="childSubmissions.length > 0"
              class="text-gray-600 hover:text-gray-700 flex items-center gap-1"
              @click="toggleReplies"
            >
              <ChevronRightIcon :class="['h-4 w-4 transition-transform', showReplies && 'rotate-90']" />
              {{ childSubmissions.length }} replies
            </button>
          </div>
        </div>
      </div>

      <!-- Reply Form -->
      <div v-if="showReplyForm" class="mt-4 pt-4 border-t border-gray-200">
        <QuickReplyForm
          :parent-submission-id="submission.id.toString()"
          :fire-slug="fireSlug"
          @reply-posted="handleReplyPosted"
          @cancel="showReplyForm = false"
        />
      </div>
    </div>

    <!-- Child Submissions (Replies) -->
    <div v-if="showReplies && childSubmissions.length > 0" class="ml-4">
      <ThreadedSubmission
        v-for="child in childSubmissions"
        :key="child.id"
        :submission="child"
        :fire-slug="fireSlug"
        :depth="depth + 1"
        :all-submissions="allSubmissions"
        @submission-updated="$emit('submission-updated')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "@/stores";
import type { SubmissionResponse } from "@/types/api";
import { ChevronRightIcon } from "@heroicons/vue/24/outline";
import { computed, ref } from "vue";

import ContentVerificationBadge from "./ContentVerificationBadge.vue";
import QuickReplyForm from "./QuickReplyForm.vue";

interface Props {
  submission: SubmissionResponse;
  fireSlug: string;
  depth: number;
  allSubmissions?: SubmissionResponse[];
}

const props = withDefaults(defineProps<Props>(), {
  allSubmissions: () => []
});

const emit = defineEmits<{
  "submission-updated": [];
}>();

const userStore = useUserStore();

// State
const voteQuantity = ref<number | null>(null);
const isVoting = ref(false);
const showReplyForm = ref(false);
const showReplies = ref(depth < 2); // Auto-expand first 2 levels

// Computed properties
const childSubmissions = computed(() => {
  return props.allSubmissions.filter((sub) => sub.entryParent === props.submission.id.toString());
});

// Methods
function toggleReplyForm() {
  showReplyForm.value = !showReplyForm.value;
}

function toggleReplies() {
  showReplies.value = !showReplies.value;
}

async function submitVote() {
  if (!voteQuantity.value || isVoting.value || !userStore.isAuthenticated) return;

  isVoting.value = true;
  try {
    const apiBase = import.meta.env.VITE_PROJECT_API;
    const response = await fetch(`${apiBase}/api/submissions/${props.submission.id}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: voteQuantity.value
      })
    });

    if (!response.ok) {
      throw new Error("Failed to submit vote");
    }

    voteQuantity.value = null;
    emit("submission-updated");
  } catch (error) {
    console.error("Error submitting vote:", error);
  } finally {
    isVoting.value = false;
  }
}

function handleReplyPosted() {
  showReplyForm.value = false;
  showReplies.value = true; // Show replies when new one is posted
  emit("submission-updated");
}

function formatUser(contributor: string): string {
  // Extract address from eth|0x... format
  if (contributor.includes("|")) {
    const address = contributor.split("|")[1];
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  return contributor;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else {
    return "Just now";
  }
}
</script>

<style scoped>
.threaded-submission {
  @apply select-text;
}

.submission-item {
  transition: all 0.2s ease;
}

.submission-item:hover {
  @apply shadow-sm;
}
</style>
