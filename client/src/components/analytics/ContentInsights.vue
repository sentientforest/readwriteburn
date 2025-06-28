<template>
  <div class="content-insights space-y-4">
    <!-- Key Metrics -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-blue-50 rounded-lg p-3">
        <div class="text-lg font-bold text-blue-900">{{ insights.avgVotesPerSubmission.toFixed(1) }}</div>
        <div class="text-sm text-blue-700">Avg Votes per Post</div>
      </div>
      <div class="bg-green-50 rounded-lg p-3">
        <div class="text-lg font-bold text-green-900">{{ insights.avgGalaPerVote.toFixed(1) }}</div>
        <div class="text-sm text-green-700">Avg GALA per Vote</div>
      </div>
    </div>

    <!-- Peak Activity -->
    <div class="bg-purple-50 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2">
        <ClockIcon class="h-4 w-4 text-purple-600" />
        <span class="text-sm font-medium text-purple-900">Peak Activity</span>
      </div>
      <div class="text-sm text-purple-700">{{ insights.topVotingTime }}</div>
    </div>

    <!-- Content Quality -->
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-gray-900">Content Quality</h4>
      
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Verified Content</span>
          <span class="text-sm font-medium text-green-600">{{ insights.contentVerificationRate.toFixed(1) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-green-500 h-2 rounded-full transition-all duration-500"
            :style="{ width: `${insights.contentVerificationRate}%` }"
          ></div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Moderated Content</span>
          <span class="text-sm font-medium text-orange-600">{{ insights.contentQuality.moderatedPercentage.toFixed(1) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-orange-500 h-2 rounded-full transition-all duration-500"
            :style="{ width: `${insights.contentQuality.moderatedPercentage}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Popular Categories -->
    <div v-if="insights.popularCategories && insights.popularCategories.length > 0">
      <h4 class="text-sm font-medium text-gray-900 mb-2">Popular Categories</h4>
      <div class="space-y-2">
        <div 
          v-for="category in insights.popularCategories" 
          :key="category.fire"
          class="flex items-center justify-between"
        >
          <span class="text-sm text-gray-600">f/{{ category.fire }}</span>
          <span class="text-sm font-medium text-primary-600">{{ category.percentage.toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- User Retention -->
    <div>
      <h4 class="text-sm font-medium text-gray-900 mb-2">User Retention</h4>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div class="text-center bg-gray-50 rounded p-2">
          <div class="font-medium text-gray-900">{{ insights.userRetention.daily.toFixed(0) }}%</div>
          <div class="text-gray-500">Daily</div>
        </div>
        <div class="text-center bg-gray-50 rounded p-2">
          <div class="font-medium text-gray-900">{{ insights.userRetention.weekly.toFixed(0) }}%</div>
          <div class="text-gray-500">Weekly</div>
        </div>
        <div class="text-center bg-gray-50 rounded p-2">
          <div class="font-medium text-gray-900">{{ insights.userRetention.monthly.toFixed(0) }}%</div>
          <div class="text-gray-500">Monthly</div>
        </div>
      </div>
    </div>

    <!-- Growth Indicator -->
    <div class="bg-gradient-to-r from-primary-50 to-green-50 rounded-lg p-3">
      <div class="flex items-center gap-2">
        <ArrowTrendingUpIcon class="h-5 w-5 text-primary-600" />
        <div>
          <div class="text-sm font-medium text-gray-900">Engagement Growth</div>
          <div class="text-lg font-bold text-primary-600">+{{ insights.engagementGrowth.toFixed(1) }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClockIcon, ArrowTrendingUpIcon } from '@heroicons/vue/24/outline';

interface ContentInsights {
  avgVotesPerSubmission: number;
  avgGalaPerVote: number;
  topVotingTime: string;
  contentVerificationRate: number;
  engagementGrowth: number;
  popularCategories: Array<{
    fire: string;
    percentage: number;
  }>;
  userRetention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  contentQuality: {
    verifiedPercentage: number;
    moderatedPercentage: number;
    avgTimeToModeration: number;
  };
}

interface Props {
  insights: ContentInsights;
}

defineProps<Props>();
</script>