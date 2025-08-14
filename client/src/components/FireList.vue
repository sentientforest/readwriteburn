<template>
  <div class="fire-list">
    <div class="mb-6">
      <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Fires</h2>
      <p class="text-gray-600 text-sm sm:text-base">Discover communities and join the conversation</p>
      
      <!-- Error and Success Messages -->
      <div v-if="submitError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-700 text-sm">{{ submitError }}</p>
      </div>
      <div v-if="success" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <p class="text-green-700 text-sm">{{ success }}</p>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
      <p class="text-gray-600 text-sm">Loading fires...</p>
    </div>

    <div v-else-if="loadError" class="bg-error-50 border border-error-200 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="h-5 w-5 text-error-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 class="text-error-800 font-medium mb-1">Failed to Load Fires</h3>
          <p class="text-error-700 text-sm">Unable to fetch fires from the server. Please try again later.</p>
        </div>
      </div>
    </div>

    <div v-else>
      <div v-if="fires.length === 0" class="text-center py-12">
        <svg
          class="h-12 w-12 text-gray-400 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
          />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No fires created yet</h3>
        <p class="text-gray-600 text-sm mb-4">Be the first to create a fire and start the conversation!</p>
        <RouterLink
          to="/firestarter"
          class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Fire
        </RouterLink>
      </div>

      <div v-else class="grid gap-4 sm:gap-6">
        <div
          v-for="fire in fires"
          :key="getFireSlug(fire) || fire.fireKey"
          class="fire-item bg-white rounded-lg border border-gray-200 p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:border-primary-300 transition-all duration-200 touch-manipulation"
          @click="selectFire(fire)"
        >
          <div class="flex items-start justify-between">
            <!-- Vote Section -->
            <div class="flex flex-col items-center mr-4 min-w-[100px]">
              <div class="vote-count text-xl font-bold text-gray-900 mb-2">
                {{ fire.votes ?? 0 }}
              </div>
              <div class="vote-form flex flex-col items-center gap-2">
                <div class="flex items-center gap-1">
                  <input
                    v-model="voteQuantities[getFireSlug(fire) || '']"
                    type="number"
                    :min="0"
                    step="1"
                    placeholder="🔥"
                    :disabled="isProcessing"
                    class="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                    @click.stop
                  />
                  <span class="text-xs text-gray-500">GALA</span>
                </div>
                <button
                  :disabled="!voteQuantities[getFireSlug(fire) || ''] || isProcessing || !userStore.address"
                  @click.stop="submitVoteForFire(fire)"
                  class="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {{ isProcessing ? "..." : "Vote" }}
                </button>
              </div>
            </div>

            <!-- Content Section -->
            <div class="flex-1 min-w-0">
              <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2 truncate">
                {{ fire.name || fire.metadata?.name }}
              </h3>
              <p class="text-gray-600 text-sm sm:text-base line-clamp-3">
                {{ fire.description || fire.metadata?.description }}
              </p>
            </div>
            
            <!-- Navigate Arrow -->
            <svg
              class="h-5 w-5 text-gray-400 ml-3 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <!-- Mobile-friendly fire stats -->
          <div
            class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs sm:text-sm text-gray-500"
          >
            <span>Fire: {{ getFireSlug(fire) }}</span>
            <span class="text-primary-600 font-medium">Tap to explore</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFiresStore } from "@/stores";
import { useUserStore } from "@/stores/user";
import { computed, getCurrentInstance, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BigNumber from "bignumber.js";
import { CastVoteAuthorizationDto, Fire, VoteDto } from "@/types/fire";
import { randomUniqueKey } from "@/utils";

interface ExtendedFireResponse {
  slug: string;
  name: string;
  description?: string;
  votes?: number;
  userVoteQty?: number | null;
}

const firesStore = useFiresStore();
const userStore = useUserStore();
const router = useRouter();

// Access global metamaskClient
const instance = getCurrentInstance();
const metamaskClient = computed(() => instance?.appContext.config.globalProperties.$metamaskClient);

const apiBase = import.meta.env.VITE_PROJECT_API;
const isProcessing = ref(false);
const submitError = ref("");
const success = ref("");

// Reactive state for vote quantities
const voteQuantities = ref<Record<string, number | null>>({});

// Computed properties from store
const fires = computed(() => firesStore.fires.map(fire => ({
  ...fire,
  userVoteQty: voteQuantities.value[getFireSlug(fire) || ''] || null
})) as ExtendedFireResponse[]);
const loading = computed(() => firesStore.loading);
const loadError = computed(() => !!firesStore.error);

function getFireSlug(fire: ExtendedFireResponse): string | null {
  return fire.slug || fire.metadata?.slug || null;
}

function selectFire(fire: ExtendedFireResponse) {
  const slug = getFireSlug(fire);
  if (!slug) {
    console.error('Fire missing slug:', fire);
    return;
  }
  router.push(`/f/${slug}`);
}

async function submitVoteForFire(fire: ExtendedFireResponse) {
  const slug = getFireSlug(fire);
  if (!slug) return;
  
  const voteQty = voteQuantities.value[slug];
  if (!voteQty || isProcessing.value || !userStore.address) return;

  isProcessing.value = true;
  submitError.value = "";
  success.value = "";

  try {
    // Create ReadWriteBurn client
    const rwbClient = metamaskClient.value;

    if (!rwbClient) {
      throw new Error(`No client software connected`);
    }

    // Create Fire composite key - Fire only has slug as ChainKey
    const fireCompositeKey = Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, [slug]);
    
    // Create VoteDto for Fire voting
    const voteDto = new VoteDto({
      entryType: Fire.INDEX_KEY, // Use Fire's INDEX_KEY ("RWBF")
      entryParent: "", // Empty string for top-level content (fires have no parent)
      entry: fireCompositeKey, // The fire we're voting on
      quantity: new BigNumber(voteQty),
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

    // Send to server - we'll need a new endpoint for fire votes
    const response = await fetch(`${apiBase}/api/fires/${slug}/vote`, {
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

    success.value = "Fire vote submitted successfully!";
    // Clear the vote quantity for this fire
    delete voteQuantities.value[slug];
    await firesStore.fetchFires(); // Refresh the list
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      success.value = "";
    }, 3000);
  } catch (error) {
    console.error("Error submitting fire vote:", error);
    submitError.value = error instanceof Error ? error.message : "Failed to submit fire vote. Please try again.";
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      submitError.value = "";
    }, 5000);
  } finally {
    isProcessing.value = false;
  }
}

onMounted(async () => {
  await firesStore.fetchFires();
});
</script>

<style scoped>
/* Line clamp utility for description text */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Touch-friendly interactions */
.touch-manipulation {
  touch-action: manipulation;
}

/* Mobile-specific hover states */
@media (hover: hover) {
  .fire-item:hover {
    transform: translateY(-1px);
  }
}

/* Mobile tap states */
@media (hover: none) {
  .fire-item:active {
    transform: scale(0.98);
    transition: transform 0.1s;
  }
}

/* Ensure proper touch targets on mobile */
@media (max-width: 768px) {
  .fire-item {
    min-height: 80px;
  }
}
</style>
