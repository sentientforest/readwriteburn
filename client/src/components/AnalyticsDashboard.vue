<template>
  <div class="analytics-dashboard max-w-7xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
      <p class="text-gray-600 mt-2">
        Insights into voting patterns, user engagement, and content performance
      </p>
    </div>

    <!-- Time Range Selector -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Time Range</h2>
        <div class="flex items-center gap-2">
          <select 
            v-model="selectedTimeRange" 
            @change="refreshData"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            @click="refreshData"
            :disabled="isLoading"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <ArrowPathIcon :class="['h-4 w-4', isLoading && 'animate-spin']" />
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="flex items-center gap-3">
        <ArrowPathIcon class="h-6 w-6 animate-spin text-primary-600" />
        <span class="text-gray-600">Loading analytics data...</span>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="space-y-6">
      <!-- Key Metrics Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Votes"
          :value="formatNumber(overview.totalVotes)"
          :change="overview.votesChange"
          icon="fire"
          :trend-data="trendData.votes"
        />
        <MetricCard
          title="GALA Burned"
          :value="formatGala(overview.totalGalaBurned)"
          :change="overview.galaChange"
          icon="currency"
          :trend-data="trendData.gala"
        />
        <MetricCard
          title="Active Users"
          :value="formatNumber(overview.activeUsers)"
          :change="overview.usersChange"
          icon="users"
          :trend-data="trendData.users"
        />
        <MetricCard
          title="Submissions"
          :value="formatNumber(overview.totalSubmissions)"
          :change="overview.submissionsChange"
          icon="document"
          :trend-data="trendData.submissions"
        />
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Vote Trends Chart -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Vote Trends</h3>
          <VoteTrendsChart :data="chartData.voteTrends" :time-range="selectedTimeRange" />
        </div>

        <!-- Top Performing Content -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Performing Content</h3>
          <TopContentList :submissions="topContent.submissions" />
        </div>
      </div>

      <!-- User Engagement Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- User Voting Patterns -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Voting Patterns</h3>
          <VotingPatternsChart :data="chartData.votingPatterns" />
        </div>

        <!-- Fire Activity -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Fire Activity</h3>
          <FireActivityList :fires="topContent.fires" />
        </div>

        <!-- User Leaderboard -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h3>
          <UserLeaderboard :users="leaderboard.users" />
        </div>
      </div>

      <!-- Advanced Analytics -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Engagement Heatmap -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Engagement Heatmap</h3>
          <EngagementHeatmap :data="chartData.heatmap" />
        </div>

        <!-- Content Performance Insights -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Content Insights</h3>
          <ContentInsights :insights="insights" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-error-50 border border-error-200 rounded-lg p-6">
      <div class="flex items-center gap-3">
        <ExclamationTriangleIcon class="h-6 w-6 text-error-500" />
        <div>
          <h3 class="font-medium text-error-900">Failed to load analytics data</h3>
          <p class="text-error-700 mt-1">{{ error }}</p>
          <button
            @click="refreshData"
            class="mt-3 px-4 py-2 bg-error-600 text-white rounded-md hover:bg-error-700"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline';
import { ref, onMounted } from 'vue';
import { useAnalyticsStore } from '@/stores';
import MetricCard from './analytics/MetricCard.vue';
import VoteTrendsChart from './analytics/VoteTrendsChart.vue';
import TopContentList from './analytics/TopContentList.vue';
import VotingPatternsChart from './analytics/VotingPatternsChart.vue';
import FireActivityList from './analytics/FireActivityList.vue';
import UserLeaderboard from './analytics/UserLeaderboard.vue';
import EngagementHeatmap from './analytics/EngagementHeatmap.vue';
import ContentInsights from './analytics/ContentInsights.vue';

const analyticsStore = useAnalyticsStore();

// State
const selectedTimeRange = ref('7d');
const isLoading = ref(false);
const error = ref('');

// Computed data from store
const overview = ref({
  totalVotes: 0,
  votesChange: 0,
  totalGalaBurned: 0,
  galaChange: 0,
  activeUsers: 0,
  usersChange: 0,
  totalSubmissions: 0,
  submissionsChange: 0
});

const trendData = ref({
  votes: [],
  gala: [],
  users: [],
  submissions: []
});

const chartData = ref({
  voteTrends: [],
  votingPatterns: [],
  heatmap: []
});

const topContent = ref({
  submissions: [],
  fires: []
});

const leaderboard = ref({
  users: []
});

const insights = ref({
  avgVotesPerSubmission: 0,
  avgGalaPerVote: 0,
  topVotingTime: '',
  contentVerificationRate: 0,
  engagementGrowth: 0
});

// Methods
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatGala(amount: number): string {
  return `${(amount / 100000000).toFixed(1)}`;
}

async function refreshData() {
  isLoading.value = true;
  error.value = '';

  try {
    await analyticsStore.fetchAnalytics(selectedTimeRange.value);
    
    // Update reactive data from store
    overview.value = analyticsStore.overview;
    trendData.value = analyticsStore.trendData;
    chartData.value = analyticsStore.chartData;
    topContent.value = analyticsStore.topContent;
    leaderboard.value = analyticsStore.leaderboard;
    insights.value = analyticsStore.insights;

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load analytics data';
    console.error('Analytics error:', err);
  } finally {
    isLoading.value = false;
  }
}

// Initialize data
onMounted(() => {
  refreshData();
});
</script>

<style scoped>
.analytics-dashboard {
  min-height: 100vh;
}
</style>