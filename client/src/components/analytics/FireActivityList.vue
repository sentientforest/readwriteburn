<template>
  <div class="fire-activity-list">
    <div v-if="!fires || fires.length === 0" class="text-center py-8">
      <FolderIcon class="h-12 w-12 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-500">No fire activity data</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="fire in fires"
        :key="fire.slug"
        class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div class="flex items-center justify-between mb-2">
          <router-link :to="`/f/${fire.slug}`" class="font-medium text-gray-900 hover:text-primary-600">
            f/{{ fire.name }}
          </router-link>
          <div
            :class="[
              'text-xs px-2 py-1 rounded-full',
              fire.growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            ]"
          >
            {{ fire.growth >= 0 ? "+" : "" }}{{ fire.growth.toFixed(1) }}%
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="text-center">
            <div class="font-medium text-gray-900">{{ fire.submissions }}</div>
            <div class="text-gray-500">posts</div>
          </div>
          <div class="text-center">
            <div class="font-medium text-primary-600">{{ fire.totalVotes }}</div>
            <div class="text-gray-500">votes</div>
          </div>
          <div class="text-center">
            <div class="font-medium text-green-600">{{ formatGala(fire.totalGala) }}</div>
            <div class="text-gray-500">GALA</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderIcon } from "@heroicons/vue/24/outline";

interface FireActivity {
  slug: string;
  name: string;
  submissions: number;
  totalVotes: number;
  totalGala: number;
  growth: number;
}

interface Props {
  fires: FireActivity[];
}

defineProps<Props>();

function formatGala(amount: number): string {
  if (amount >= 100000000000) {
    return `${(amount / 100000000).toFixed(1)}K`;
  }
  return `${(amount / 100000000).toFixed(1)}`;
}
</script>
