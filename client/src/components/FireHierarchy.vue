<template>
  <div class="fire-hierarchy">
    <!-- Simple Fire Navigation -->
    <nav class="simple-nav mb-6">
      <router-link to="/" class="text-primary-600 hover:text-primary-700 flex items-center mb-2">
        <HomeIcon class="h-4 w-4 mr-1" />
        Back to Home
      </router-link>
    </nav>

    <!-- Current Fire Info -->
    <div
      v-if="currentFire"
      class="current-fire-info bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-2xl font-bold text-gray-900">
              {{ currentFire.name || currentFire.metadata?.name }}
            </h1>
          </div>

          <p v-if="currentFire.description || currentFire.metadata?.description" class="text-gray-600 mb-4">
            {{ currentFire.description || currentFire.metadata?.description }}
          </p>

          <!-- Vote Messages -->
          <div v-if="voteError" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-red-700 text-sm">{{ voteError }}</p>
          </div>
          <div v-if="voteSuccess" class="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p class="text-green-700 text-sm">{{ voteSuccess }}</p>
          </div>

          <div class="flex items-center gap-4 text-sm text-gray-500">
            <div class="flex items-center gap-1">
              <UserIcon class="h-4 w-4" />
              <span
                >Started by
                {{
                  currentFire.starter?.identity || currentFire.metadata?.starter
                    ? formatAddress(currentFire.starter?.identity || currentFire.metadata?.starter)
                    : "Unknown"
                }}</span
              >
            </div>
            <div class="flex items-center gap-1">
              <CalendarIcon class="h-4 w-4" />
              <span>{{ formatDate(currentFire.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 ml-6">
          <!-- Fire Voting Section -->
          <div class="flex flex-col items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border">
            <div class="text-lg font-semibold text-gray-900">
              {{ currentFire.votes ?? 0 }}
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="fireVoteQty"
                type="number"
                :min="0"
                step="1"
                placeholder="🔥"
                :disabled="isVoting"
                class="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
              />
              <span class="text-xs text-gray-500">GALA</span>
            </div>
            <button
              :disabled="!fireVoteQty || isVoting || !userStore.address"
              class="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              @click="submitFireVote"
            >
              {{ isVoting ? "..." : "Vote Fire" }}
            </button>
          </div>

          <router-link
            :to="`/f/${getCurrentFireSlug()}/submit`"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
          >
            <PlusIcon class="h-4 w-4" />
            New Submission
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VoteService } from "@/services";
import { useFiresStore, useSubmissionsStore, useVotesStore } from "@/stores";
import { useUserStore } from "@/stores/user";
import type { FireResponse } from "@/types/api";
import {
  ArrowUpIcon,
  CalendarIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  FireIcon,
  FolderIcon,
  FolderPlusIcon,
  HomeIcon,
  PlusIcon,
  UserIcon
} from "@heroicons/vue/24/outline";
import BigNumber from "bignumber.js";
import { computed, getCurrentInstance, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import FireTreeNode from "./FireTreeNode.vue";

const route = useRoute();
const router = useRouter();
const firesStore = useFiresStore();
const submissionsStore = useSubmissionsStore();
const votesStore = useVotesStore();
const userStore = useUserStore();

// Access global metamaskClient
const instance = getCurrentInstance();
const metamaskClient = computed(() => instance?.appContext.config.globalProperties.$metamaskClient);

const apiBase = import.meta.env.VITE_PROJECT_API;

// Create vote service instance
const voteService = computed(() => {
  if (!metamaskClient.value) return null;
  return new VoteService(apiBase, metamaskClient.value);
});

// Props
interface Props {
  fireSlug?: string;
}

const props = defineProps<Props>();

// Fire voting state
const fireVoteQty = ref<number | null>(null);
const isVoting = ref(false);
const voteError = ref("");
const voteSuccess = ref("");

// Computed properties
const allFires = computed(() => firesStore.fires);
const currentFire = computed(() => {
  const slug = props.fireSlug || (route.params.slug as string);
  if (!slug) return null;

  // Try to find in allFires first
  const fireFromAll = allFires.value.find((fire) => fire.slug === slug);
  if (fireFromAll) return fireFromAll;

  // Fallback to store's currentFire if slug matches
  const storeFire = firesStore.currentFire;
  if (storeFire && storeFire.slug === slug) return storeFire;

  return null;
});

// Methods
function getCurrentFireSlug(): string | null {
  const fire = currentFire.value;
  if (!fire) return null;
  return fire.slug || fire.metadata?.slug || null;
}

function formatAddress(address: string): string {
  if (!address || address.length <= 10) return address || "Unknown";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateString;
  }
}

async function submitFireVote() {
  if (!fireVoteQty.value || isVoting.value || !userStore.address || !currentFire.value || !voteService.value)
    return;

  isVoting.value = true;
  voteError.value = "";
  voteSuccess.value = "";

  try {
    const fireSlug = getCurrentFireSlug();
    if (!fireSlug) {
      throw new Error("Fire slug not found");
    }

    console.log("Submitting fire vote using VoteService...");

    // Use the VoteService to handle the entire voting process
    const result = await voteService.value.voteOnFire(fireSlug, fireVoteQty.value);

    if (!result.success) {
      throw new Error(result.error || result.message);
    }

    voteSuccess.value = result.message;
    fireVoteQty.value = null;
    await firesStore.fetchFires(); // Refresh the fire list

    // Clear success message after 3 seconds
    setTimeout(() => {
      voteSuccess.value = "";
    }, 3000);
  } catch (error) {
    console.error("Error submitting fire vote:", error);
    voteError.value =
      error instanceof Error ? error.message : "Failed to submit fire vote. Please try again.";

    // Clear error message after 5 seconds
    setTimeout(() => {
      voteError.value = "";
    }, 5000);
  } finally {
    isVoting.value = false;
  }
}

// Watch for route changes
watch(
  () => route.params.slug,
  async (newSlug) => {
    if (newSlug) {
      await loadFireStats();
    }
  },
  { immediate: true }
);

// Function to load fire stats
async function loadFireStats() {
  const slug = props.fireSlug || (route.params.slug as string);
  if (slug && !currentFire.value) {
    await firesStore.fetchFireBySlug(slug);
  }
}

// Load initial data
onMounted(async () => {
  await firesStore.fetchFires();
  await loadFireStats();
});
</script>

<style scoped>
.simple-nav {
  @apply bg-gray-50 rounded-lg px-4 py-2;
}
</style>
