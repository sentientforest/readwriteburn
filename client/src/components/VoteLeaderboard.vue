<template>
  <div class="vote-leaderboard max-w-4xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Vote Leaderboard</h1>
      <p class="text-gray-600 mt-2">Top submissions and fires ranked by vote weight</p>
    </div>

    <!-- Filter Controls -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex items-center gap-4">
        <div>
          <label for="ranking-type" class="block text-sm font-medium text-gray-700 mb-1">
            Ranking Type
          </label>
          <select
            id="ranking-type"
            v-model="rankingType"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Entries</option>
            <option value="submissions">Submissions Only</option>
            <option value="fires">Fires Only</option>
          </select>
        </div>

        <div>
          <label for="fire-filter" class="block text-sm font-medium text-gray-700 mb-1"> Fire Filter </label>
          <select
            id="fire-filter"
            v-model="fireFilter"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Fires</option>
            <option v-for="fire in availableFires" :key="fire.slug" :value="fire.slug">
              {{ fire.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="time-period" class="block text-sm font-medium text-gray-700 mb-1"> Time Period </label>
          <select
            id="time-period"
            v-model="timePeriod"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Time</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="year">Past Year</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Leaderboard -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold">Rankings</h2>
      </div>

      <div v-if="loading" class="p-8 text-center">
        <ArrowPathIcon class="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
        <p class="text-gray-600">Loading rankings...</p>
      </div>

      <div v-else-if="error" class="p-8 text-center">
        <ExclamationTriangleIcon class="h-8 w-8 mx-auto text-error-400 mb-2" />
        <p class="text-error-600">{{ error }}</p>
      </div>

      <div v-else-if="rankedEntries.length === 0" class="p-8 text-center">
        <TrophyIcon class="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p class="text-gray-600">No rankings available</p>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="(entry, index) in rankedEntries"
          :key="entry.id"
          class="p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <!-- Ranking Position -->
            <div
              class="flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg"
              :class="getRankingBadgeClass(index + 1)"
            >
              {{ index + 1 }}
            </div>

            <!-- Entry Details -->
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-semibold text-gray-900">{{ entry.name || `Entry ${entry.entry}` }}</h3>
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  :class="getEntryTypeBadgeClass(entry.entryType)"
                >
                  {{ entry.entryType }}
                </span>
              </div>

              <div class="text-sm text-gray-600 space-y-1">
                <div>
                  <span class="font-medium">Fire:</span>
                  <router-link :to="`/f/${entry.fire}`" class="ml-1 text-primary-600 hover:text-primary-700">
                    {{ entry.fire }}
                  </router-link>
                </div>
                <div>
                  <span class="font-medium">Entry ID:</span>
                  <span class="ml-1 font-mono text-xs">{{ entry.entry }}</span>
                </div>
                <div>
                  <span class="font-medium">Last Updated:</span>
                  <span class="ml-1">{{ formatDate(entry.updated) }}</span>
                </div>
              </div>
            </div>

            <!-- Vote Stats -->
            <div class="text-right">
              <div class="text-2xl font-bold text-gala-600">
                {{ formatGala(parseFloat(entry.quantity)) }}
              </div>
              <div class="text-xs text-gray-500 mb-1">GALA</div>
              <div class="text-sm text-gray-600">Rank #{{ entry.ranking }}</div>
            </div>
          </div>

          <!-- Vote Trend (if available) -->
          <div v-if="entry.trend" class="mt-3 pt-3 border-t border-gray-100">
            <div class="flex items-center gap-2 text-sm">
              <ArrowTrendingUpIcon v-if="entry.trend > 0" class="h-4 w-4 text-success-500" />
              <ArrowTrendingDownIcon v-else-if="entry.trend < 0" class="h-4 w-4 text-error-500" />
              <MinusIcon v-else class="h-4 w-4 text-gray-400" />
              <span
                :class="
                  entry.trend > 0 ? 'text-success-600' : entry.trend < 0 ? 'text-error-600' : 'text-gray-600'
                "
              >
                {{ entry.trend > 0 ? "+" : "" }}{{ formatGala(Math.abs(entry.trend)) }} GALA this
                {{ timePeriod }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="p-4 border-t border-gray-200">
        <button
          :disabled="loading"
          class="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
          @click="loadMore"
        >
          <ArrowPathIcon v-if="loading" class="h-4 w-4 animate-spin" />
          {{ loading ? "Loading..." : "Load More Rankings" }}
        </button>
      </div>
    </div>

    <!-- Summary Statistics -->
    <div
      v-if="rankedEntries.length > 0"
      class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6"
    >
      <h2 class="text-lg font-semibold mb-4">Summary Statistics</h2>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900">{{ rankedEntries.length }}</div>
          <div class="text-sm text-gray-600">Ranked Entries</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gala-600">{{ formatGala(totalVoteAmount) }}</div>
          <div class="text-sm text-gray-600">Total GALA</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-success-600">{{ formatGala(averageVoteAmount) }}</div>
          <div class="text-sm text-gray-600">Average</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-primary-600">{{ uniqueVoters }}</div>
          <div class="text-sm text-gray-600">Unique Voters</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFiresStore, useVotesStore } from "@/stores";
import type { VoteCountResponse } from "@/types/api";
import {
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  MinusIcon,
  TrophyIcon
} from "@heroicons/vue/24/outline";
import { computed, onMounted, ref, watch } from "vue";

const votesStore = useVotesStore();
const firesStore = useFiresStore();

// State
const rankingType = ref("all");
const fireFilter = ref("");
const timePeriod = ref("all");
const loading = ref(false);
const error = ref<string | null>(null);
const hasMore = ref(false);

// Mock ranked entries (in real app, this would come from vote counts API)
const rankedEntries = ref<(VoteCountResponse & { name?: string; trend?: number })[]>([]);

// Computed properties
const availableFires = computed(() => firesStore.fires);

const totalVoteAmount = computed(() => {
  return rankedEntries.value.reduce((total, entry) => {
    return total + parseFloat(entry.quantity);
  }, 0);
});

const averageVoteAmount = computed(() => {
  if (rankedEntries.value.length === 0) return 0;
  return totalVoteAmount.value / rankedEntries.value.length;
});

const uniqueVoters = computed(() => {
  // This would need to be calculated from vote data
  // Placeholder implementation
  return Math.floor(rankedEntries.value.length * 0.7);
});

// Watch filters
watch([rankingType, fireFilter, timePeriod], () => {
  loadRankings();
});

async function loadRankings() {
  loading.value = true;
  error.value = null;

  try {
    // Fetch vote counts based on filters
    await votesStore.fetchVoteCounts(fireFilter.value);

    // Get vote counts and transform for display
    let entries = [...votesStore.voteCounts];

    // Filter by entry type
    if (rankingType.value !== "all") {
      entries = entries.filter((entry) => entry.entryType === rankingType.value);
    }

    // Sort by quantity (highest first)
    entries.sort((a, b) => parseFloat(b.quantity) - parseFloat(a.quantity));

    // Add mock names and trends (in real app, fetch from submissions/fires)
    rankedEntries.value = entries.map((entry, index) => ({
      ...entry,
      name: entry.entryType === "submission" ? `Submission ${entry.entry}` : `Fire ${entry.fire}`,
      trend: Math.random() > 0.5 ? Math.random() * 1000 : -Math.random() * 500
    }));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load rankings";
    console.error("Error loading rankings:", err);
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  // Implement pagination if needed
  console.log("Load more rankings");
}

function getRankingBadgeClass(position: number): string {
  switch (position) {
    case 1:
      return "bg-yellow-100 text-yellow-800 border-2 border-yellow-300";
    case 2:
      return "bg-gray-100 text-gray-800 border-2 border-gray-300";
    case 3:
      return "bg-orange-100 text-orange-800 border-2 border-orange-300";
    default:
      return "bg-primary-100 text-primary-800 border border-primary-200";
  }
}

function getEntryTypeBadgeClass(entryType: string): string {
  switch (entryType) {
    case "submission":
      return "bg-blue-100 text-blue-800";
    case "fire":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatGala(amount: number): string {
  // Format GALA amount (assuming 8 decimals)
  return (amount / 100000000).toFixed(2);
}

function formatDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return timestamp.toString();
  }
}

// Load initial data
onMounted(async () => {
  await firesStore.fetchFires();
  await loadRankings();
});
</script>

<style scoped>
/* Additional component-specific styles if needed */
</style>
