<template>
  <div class="vote-explorer max-w-6xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Vote Explorer</h1>
      <p class="text-gray-600 mt-2">
        Browse and analyze votes across fires and submissions
      </p>
    </div>

    <!-- Filters and Search -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Filters</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label for="entry-type" class="block text-sm font-medium text-gray-700 mb-1">
            Entry Type
          </label>
          <select
            id="entry-type"
            v-model="filters.entryType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Types</option>
            <option value="submission">Submissions</option>
            <option value="fire">Fires</option>
          </select>
        </div>

        <div>
          <label for="fire-filter" class="block text-sm font-medium text-gray-700 mb-1">
            Fire
          </label>
          <select
            id="fire-filter"
            v-model="filters.fire"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Fires</option>
            <option v-for="fire in availableFires" :key="fire.slug" :value="fire.slug">
              {{ fire.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="submission-filter" class="block text-sm font-medium text-gray-700 mb-1">
            Submission ID
          </label>
          <input
            id="submission-filter"
            v-model="filters.submission"
            type="number"
            placeholder="Enter submission ID"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
        </div>

        <div>
          <label for="limit-filter" class="block text-sm font-medium text-gray-700 mb-1">
            Results Per Page
          </label>
          <select
            id="limit-filter"
            v-model="filters.limit"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="200">200</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-3 mt-4">
        <button
          @click="applyFilters"
          :disabled="loading"
          class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
        >
          <MagnifyingGlassIcon v-if="!loading" class="h-4 w-4" />
          <ArrowPathIcon v-else class="h-4 w-4 animate-spin" />
          {{ loading ? 'Loading...' : 'Search Votes' }}
        </button>
        
        <button
          @click="clearFilters"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Clear Filters
        </button>

        <div class="ml-auto text-sm text-gray-600">
          {{ votes.length }} vote{{ votes.length !== 1 ? 's' : '' }} found
        </div>
      </div>
    </div>

    <!-- Vote Statistics -->
    <div v-if="votes.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Statistics</h2>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-primary-600">{{ voteStatistics.totalVotes }}</div>
          <div class="text-sm text-gray-600">Total Votes</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gala-600">{{ formatGala(voteStatistics.totalAmount) }}</div>
          <div class="text-sm text-gray-600">Total GALA</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-success-600">{{ formatGala(voteStatistics.averageVote) }}</div>
          <div class="text-sm text-gray-600">Avg Vote</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-600">{{ voteStatistics.fireBreakdown.size }}</div>
          <div class="text-sm text-gray-600">Fires</div>
        </div>
      </div>
    </div>

    <!-- Votes List -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold">Votes</h2>
      </div>

      <div v-if="loading && votes.length === 0" class="p-8 text-center">
        <ArrowPathIcon class="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
        <p class="text-gray-600">Loading votes...</p>
      </div>

      <div v-else-if="error" class="p-8 text-center">
        <ExclamationTriangleIcon class="h-8 w-8 mx-auto text-error-400 mb-2" />
        <p class="text-error-600">{{ error }}</p>
        <button 
          @click="applyFilters"
          class="mt-2 text-sm text-primary-600 hover:text-primary-700"
        >
          Try Again
        </button>
      </div>

      <div v-else-if="votes.length === 0" class="p-8 text-center">
        <MagnifyingGlassIcon class="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p class="text-gray-600">No votes found for the current filters</p>
        <button 
          @click="clearFilters"
          class="mt-2 text-sm text-primary-600 hover:text-primary-700"
        >
          Clear Filters
        </button>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="vote in votes"
          :key="vote.id"
          class="p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {{ vote.entryType }}
                </span>
                <span class="text-sm text-gray-600">
                  {{ formatDate(vote.created) }}
                </span>
              </div>
              
              <div class="space-y-1">
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Voter:</span>
                  <code class="ml-1 text-xs font-mono">{{ formatAddress(vote.voter) }}</code>
                </div>
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Entry:</span>
                  <span class="ml-1">{{ vote.entry }}</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Fire:</span>
                  <router-link 
                    :to="`/f/${vote.fire}`"
                    class="ml-1 text-primary-600 hover:text-primary-700"
                  >
                    {{ vote.fire }}
                  </router-link>
                </div>
              </div>
            </div>
            
            <div class="text-right">
              <div class="text-lg font-bold text-gala-600">
                {{ formatGala(parseFloat(vote.quantity)) }}
              </div>
              <div class="text-xs text-gray-500">GALA</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load More Button -->
      <div v-if="hasMore && votes.length > 0" class="p-4 border-t border-gray-200">
        <button
          @click="loadMore"
          :disabled="loading"
          class="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ArrowPathIcon v-if="loading" class="h-4 w-4 animate-spin" />
          {{ loading ? 'Loading...' : 'Load More Votes' }}
        </button>
      </div>
    </div>

    <!-- Vote Processing (Admin) -->
    <div v-if="isAdmin" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <h2 class="text-lg font-semibold mb-4">Vote Processing</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Process votes for counting
          </label>
          <p class="text-sm text-gray-600 mb-4">
            Select votes to process into VoteCount aggregates. This will update rankings and create voter receipts.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="processSelectedVotes"
            :disabled="selectedVoteIds.length === 0 || processing"
            class="px-4 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 disabled:opacity-50 flex items-center gap-2"
          >
            <ArrowPathIcon v-if="processing" class="h-4 w-4 animate-spin" />
            <CalculatorIcon v-else class="h-4 w-4" />
            {{ processing ? 'Processing...' : 'Process Selected Votes' }}
          </button>
          
          <button
            @click="selectAllVisibleVotes"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Select All Visible
          </button>
          
          <button
            @click="clearSelection"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Selection
          </button>

          <div class="ml-auto text-sm text-gray-600">
            {{ selectedVoteIds.length }} vote{{ selectedVoteIds.length !== 1 ? 's' : '' }} selected
          </div>
        </div>

        <!-- Selection Checkboxes (only show for admin) -->
        <div v-if="isAdmin && votes.length > 0" class="text-xs text-gray-500">
          Click votes to select them for processing
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  ArrowPathIcon, 
  CalculatorIcon,
  ExclamationTriangleIcon, 
  MagnifyingGlassIcon 
} from '@heroicons/vue/24/outline';
import { ref, computed, onMounted, watch } from 'vue';
import { useVotesStore, useFiresStore, useUserStore } from '@/stores';
import type { FetchVotesRequest } from '@/types/api';

const votesStore = useVotesStore();
const firesStore = useFiresStore();
const userStore = useUserStore();

// State
const filters = ref<FetchVotesRequest>({
  entryType: '',
  fire: '',
  submission: '',
  limit: 50
});

const selectedVoteIds = ref<string[]>([]);
const processing = ref(false);

// Computed properties
const votes = computed(() => votesStore.votes);
const loading = computed(() => votesStore.loading);
const error = computed(() => votesStore.error);
const hasMore = computed(() => votesStore.hasMore);
const availableFires = computed(() => firesStore.fires);
const voteStatistics = computed(() => votesStore.voteStatistics);

// Admin check (placeholder - implement proper admin role checking)
const isAdmin = computed(() => {
  // TODO: Implement proper admin role checking
  return userStore.isAuthenticated;
});

// Watch filters for auto-search (debounced)
let filterTimeout: NodeJS.Timeout | null = null;
watch(filters, () => {
  if (filterTimeout) clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    applyFilters();
  }, 500);
}, { deep: true });

async function applyFilters() {
  const cleanFilters: FetchVotesRequest = {};
  
  if (filters.value.entryType) cleanFilters.entryType = filters.value.entryType;
  if (filters.value.fire) cleanFilters.fire = filters.value.fire;
  if (filters.value.submission) cleanFilters.submission = filters.value.submission;
  if (filters.value.limit) cleanFilters.limit = filters.value.limit;

  await votesStore.fetchVotes(cleanFilters);
}

async function loadMore() {
  const cleanFilters: FetchVotesRequest = {};
  
  if (filters.value.entryType) cleanFilters.entryType = filters.value.entryType;
  if (filters.value.fire) cleanFilters.fire = filters.value.fire;
  if (filters.value.submission) cleanFilters.submission = filters.value.submission;
  if (filters.value.limit) cleanFilters.limit = filters.value.limit;

  await votesStore.loadMoreVotes(cleanFilters);
}

function clearFilters() {
  filters.value = {
    entryType: '',
    fire: '',
    submission: '',
    limit: 50
  };
  selectedVoteIds.value = [];
  votesStore.clearVotes();
}

function selectAllVisibleVotes() {
  selectedVoteIds.value = votes.value.map(vote => vote.id);
}

function clearSelection() {
  selectedVoteIds.value = [];
}

async function processSelectedVotes() {
  if (selectedVoteIds.value.length === 0 || processing.value) return;

  processing.value = true;

  try {
    const request = {
      votes: selectedVoteIds.value,
      entryType: filters.value.entryType,
      fire: filters.value.fire,
      submission: filters.value.submission
    };

    const result = await votesStore.countVotes(request);
    
    console.log('Vote processing result:', result);
    
    // Clear selection after successful processing
    selectedVoteIds.value = [];
    
    // Refresh votes to show updated state
    await applyFilters();
  } catch (err) {
    console.error('Vote processing failed:', err);
  } finally {
    processing.value = false;
  }
}

function formatGala(amount: number): string {
  // Format GALA amount (assuming 8 decimals)
  return (amount / 100000000).toFixed(2);
}

function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return timestamp.toString();
  }
}

// Load initial data
onMounted(async () => {
  // Load fires for filter dropdown
  await firesStore.fetchFires();
  
  // Load initial votes
  await applyFilters();
});
</script>

<style scoped>
code {
  @apply bg-gray-100 px-1 py-0.5 rounded;
}
</style>