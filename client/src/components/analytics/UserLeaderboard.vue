<template>
  <div class="user-leaderboard">
    <div v-if="!users || users.length === 0" class="text-center py-8">
      <UsersIcon class="h-12 w-12 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-500">No user data available</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(user, index) in users"
        :key="user.address"
        class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <!-- Rank -->
        <div class="flex-shrink-0 w-8 text-center">
          <div
            v-if="index < 3"
            :class="[
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mx-auto',
              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
            ]"
          >
            {{ index + 1 }}
          </div>
          <span v-else class="text-sm font-medium text-gray-500">{{ index + 1 }}</span>
        </div>

        <!-- User Info -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate">
            {{ user.alias || formatAddress(user.address) }}
          </div>
          <div class="text-xs text-gray-500">
            {{ formatAddress(user.address) }}
          </div>

          <!-- Reputation Bar -->
          <div class="mt-1 flex items-center gap-2">
            <div class="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                class="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                :style="{ width: `${user.reputation}%` }"
              ></div>
            </div>
            <span class="text-xs text-gray-500">{{ user.reputation.toFixed(0) }}%</span>
          </div>
        </div>

        <!-- Stats -->
        <div class="flex-shrink-0 text-right text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div class="text-center">
              <div class="font-medium text-primary-600">{{ user.votesGiven }}</div>
              <div class="text-gray-500">votes</div>
            </div>
            <div class="text-center">
              <div class="font-medium text-green-600">{{ formatGala(user.galaSpent) }}</div>
              <div class="text-gray-500">GALA</div>
            </div>
          </div>
          <div class="mt-1 text-gray-500">{{ user.submissionsCreated }} posts</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon } from "@heroicons/vue/24/outline";

interface LeaderboardUser {
  address: string;
  alias?: string;
  votesGiven: number;
  galaSpent: number;
  submissionsCreated: number;
  reputation: number;
}

interface Props {
  users: LeaderboardUser[];
}

defineProps<Props>();

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatGala(amount: number): string {
  if (amount >= 100000000000) {
    return `${(amount / 100000000).toFixed(0)}K`;
  }
  return `${(amount / 100000000).toFixed(0)}`;
}
</script>
