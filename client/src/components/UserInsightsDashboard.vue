<template>
  <div class="user-insights-dashboard max-w-4xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">User Insights</h1>
      <p class="text-gray-600 mt-2">Analyze your voting patterns, engagement, and contribution history</p>
    </div>

    <!-- User Selection (for admins) -->
    <div v-if="isAdmin" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex items-center gap-4">
        <label class="text-sm font-medium text-gray-700">Analyze User:</label>
        <input
          v-model="selectedUser"
          type="text"
          placeholder="Enter user address or leave blank for your data"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          :disabled="isLoading"
          class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          @click="loadUserData"
        >
          Load Data
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="flex items-center gap-3">
        <ArrowPathIcon class="h-6 w-6 animate-spin text-primary-600" />
        <span class="text-gray-600">Loading user insights...</span>
      </div>
    </div>

    <!-- User Profile Summary -->
    <div v-else-if="userProfile" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <UserIcon class="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900">
              {{ userProfile.alias || formatAddress(userProfile.address) }}
            </h2>
            <p class="text-gray-500">{{ formatAddress(userProfile.address) }}</p>
          </div>
          <div class="ml-auto text-right">
            <div class="text-sm text-gray-500">Reputation Score</div>
            <div class="text-2xl font-bold text-purple-600">{{ userProfile.reputation.toFixed(0) }}</div>
          </div>
        </div>

        <!-- Key Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-primary-600">{{ userProfile.votesGiven }}</div>
            <div class="text-sm text-gray-500">Votes Cast</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ formatGala(userProfile.galaSpent) }}</div>
            <div class="text-sm text-gray-500">GALA Spent</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ userProfile.submissionsCreated }}</div>
            <div class="text-sm text-gray-500">Posts Created</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{{ userProfile.votesReceived || 0 }}</div>
            <div class="text-sm text-gray-500">Votes Received</div>
          </div>
        </div>
      </div>

      <!-- Voting History Chart -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Voting Activity</h3>
        <UserVotingChart :data="votingHistory" />
      </div>

      <!-- Content Performance -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Your Top Posts</h3>
          <UserContentList :submissions="topSubmissions" />
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Voting Preferences</h3>
          <VotingPreferences :preferences="votingPreferences" />
        </div>
      </div>

      <!-- Activity Insights -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Activity Insights</h3>
        <UserActivityInsights :insights="activityInsights" />
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-error-50 border border-error-200 rounded-lg p-6">
      <div class="flex items-center gap-3">
        <ExclamationTriangleIcon class="h-6 w-6 text-error-500" />
        <div>
          <h3 class="font-medium text-error-900">Failed to load user insights</h3>
          <p class="text-error-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAnalyticsStore, useUserStore } from "@/stores";
import { ArrowPathIcon, ExclamationTriangleIcon, UserIcon } from "@heroicons/vue/24/outline";
import { onMounted, ref } from "vue";

// Mock components for now
const UserVotingChart = {
  template: '<div class="text-center py-8 text-gray-500">Voting chart coming soon</div>'
};
const UserContentList = {
  template: '<div class="text-center py-8 text-gray-500">Content list coming soon</div>'
};
const VotingPreferences = {
  template: '<div class="text-center py-8 text-gray-500">Preferences coming soon</div>'
};
const UserActivityInsights = {
  template: '<div class="text-center py-8 text-gray-500">Activity insights coming soon</div>'
};

const userStore = useUserStore();
const analyticsStore = useAnalyticsStore();

// State
const selectedUser = ref("");
const isLoading = ref(false);
const error = ref("");
const isAdmin = ref(false); // Would be determined by user permissions

const userProfile = ref<any>(null);
const votingHistory = ref<any[]>([]);
const topSubmissions = ref<any[]>([]);
const votingPreferences = ref<any>(null);
const activityInsights = ref<any>(null);

// Methods
function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatGala(amount: number): string {
  return `${(amount / 100000000).toFixed(1)}`;
}

async function loadUserData() {
  const targetUser = selectedUser.value || userStore.address;
  if (!targetUser) {
    error.value = "No user address available";
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    // Fetch user profile and analytics
    const [profile, history] = await Promise.all([
      fetchUserProfile(targetUser),
      analyticsStore.fetchVoteHistory(targetUser, "90d")
    ]);

    userProfile.value = profile;
    votingHistory.value = history.votingHistory || [];
    topSubmissions.value = history.topSubmissions || [];
    votingPreferences.value = history.votingPreferences || {};
    activityInsights.value = history.activityInsights || {};
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load user data";
    console.error("User insights error:", err);

    // Load mock data for development
    if (import.meta.env.DEV) {
      loadMockUserData(targetUser);
    }
  } finally {
    isLoading.value = false;
  }
}

async function fetchUserProfile(address: string) {
  const apiBase = import.meta.env.VITE_PROJECT_API;
  const response = await fetch(`${apiBase}/api/users/${address}/profile`);

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return await response.json();
}

function loadMockUserData(address: string) {
  userProfile.value = {
    address,
    alias: address === userStore.address ? "You" : null,
    reputation: 85.3,
    votesGiven: 156,
    galaSpent: 78200000000, // 782 GALA
    submissionsCreated: 23,
    votesReceived: 87,
    joinedDate: "2024-01-15",
    lastActive: "2024-03-10"
  };

  votingHistory.value = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    votes: Math.floor(Math.random() * 10),
    galaSpent: Math.floor(Math.random() * 50) * 100000000
  }));

  topSubmissions.value = [
    { id: 1, name: "DeFi Innovation Proposal", votes: 45, galaReceived: 23400000000 },
    { id: 2, name: "Gaming Protocol Update", votes: 32, galaReceived: 18900000000 },
    { id: 3, name: "NFT Marketplace Feature", votes: 28, galaReceived: 14500000000 }
  ];

  votingPreferences.value = {
    favoriteCategories: [
      { fire: "defi", percentage: 45 },
      { fire: "gaming", percentage: 30 },
      { fire: "nft", percentage: 25 }
    ],
    avgVoteAmount: 5.2,
    votingDays: ["Monday", "Wednesday", "Friday"],
    peakHours: ["14:00", "16:00", "20:00"]
  };

  activityInsights.value = {
    streakDays: 12,
    totalEngagement: 89.4,
    growthRate: 15.7,
    communityRank: 47,
    badges: ["Early Adopter", "Top Contributor", "Verified Creator"]
  };
}

// Initialize
onMounted(() => {
  if (userStore.isAuthenticated) {
    loadUserData();
  }
});
</script>

<style scoped>
.user-insights-dashboard {
  min-height: 100vh;
}
</style>
