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
            <h1 class="text-2xl font-bold text-gray-900">{{ currentFire.name }}</h1>
          </div>

          <p v-if="currentFire.description" class="text-gray-600 mb-4">{{ currentFire.description }}</p>

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
              <span>Started by {{ formatAddress(currentFire.starter) }}</span>
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
              @click="submitFireVote"
              class="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {{ isVoting ? "..." : "Vote Fire" }}
            </button>
          </div>

          <router-link
            :to="`/f/${currentFire.slug}/submit`"
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
import { computed, getCurrentInstance, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BigNumber from "bignumber.js";

import FireTreeNode from "./FireTreeNode.vue";
import { CastVoteAuthorizationDto, Fire, VoteDto } from "../types/fire";
import { randomUniqueKey } from "../utils";

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
  return allFires.value.find((fire) => fire.slug === slug) || null;
});


// Methods

function formatAddress(address: string): string {
  if (address.length <= 10) return address;
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
  if (!fireVoteQty.value || isVoting.value || !userStore.address || !currentFire.value) return;

  isVoting.value = true;
  voteError.value = "";
  voteSuccess.value = "";

  try {
    // Create ReadWriteBurn client
    const rwbClient = metamaskClient.value;

    if (!rwbClient) {
      throw new Error(`No client software connected`);
    }

    // Create Fire composite key - simplified structure with just slug
    const fireCompositeKey = Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, [currentFire.value.slug]);
    
    // Create VoteDto for Fire voting
    const voteDto = new VoteDto({
      entryType: Fire.INDEX_KEY, // Use Fire's INDEX_KEY ("RWBF") instead of Submission's
      entryParent: currentFire.value.slug, // Fire slug as parent (simplified hierarchy)
      entry: fireCompositeKey, // The fire we're voting on
      quantity: new BigNumber(fireVoteQty.value),
      uniqueKey: randomUniqueKey()
    });

    console.log("Signing fire vote:", voteDto);

    // Sign the VoteDto
    const signedVote = await rwbClient.signVote(voteDto);

    // Create authorization DTO for server
    const authDto = new CastVoteAuthorizationDto({
      vote: signedVote
    });

    console.log("Sending fire vote authorization to server:", authDto);

    // Send to server
    const response = await fetch(`${apiBase}/api/fires/${currentFire.value.slug}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(authDto)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to submit fire vote");
    }

    voteSuccess.value = "Fire vote submitted successfully!";
    fireVoteQty.value = null;
    await firesStore.fetchFires(); // Refresh the fire list
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      voteSuccess.value = "";
    }, 3000);
  } catch (error) {
    console.error("Error submitting fire vote:", error);
    voteError.value = error instanceof Error ? error.message : "Failed to submit fire vote. Please try again.";
    
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
  }
);

// Load initial data
onMounted(async () => {
  await firesStore.fetchFires();
});
</script>

<style scoped>
.simple-nav {
  @apply bg-gray-50 rounded-lg px-4 py-2;
}
</style>
