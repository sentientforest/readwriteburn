<template>
  <div class="top-content-list">
    <div v-if="!submissions || submissions.length === 0" class="text-center py-8">
      <DocumentTextIcon class="h-12 w-12 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-500">No submissions found</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(submission, index) in submissions"
        :key="submission.id"
        class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <!-- Rank -->
        <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          <div
            v-if="index < 3"
            :class="[
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
            ]"
          >
            {{ index + 1 }}
          </div>
          <span v-else class="text-sm font-medium text-gray-500">{{ index + 1 }}</span>
        </div>

        <!-- Content Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <h4 class="text-sm font-medium text-gray-900 truncate">
                {{ submission.name }}
              </h4>
              <div class="flex items-center gap-2 mt-1">
                <router-link
                  :to="`/f/${submission.fire}`"
                  class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                >
                  <FolderIcon class="h-3 w-3" />
                  f/{{ submission.fire }}
                </router-link>
                <span class="text-xs text-gray-400">•</span>
                <span class="text-xs text-gray-500">{{ submission.engagement.toFixed(1) }}% engagement</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Metrics -->
        <div class="flex-shrink-0 text-right">
          <div class="flex items-center gap-4 text-sm">
            <div class="text-center">
              <div class="font-medium text-gray-900">{{ submission.votes }}</div>
              <div class="text-xs text-gray-500">votes</div>
            </div>
            <div class="text-center">
              <div class="font-medium text-green-600">{{ formatGala(submission.galaAmount) }}</div>
              <div class="text-xs text-gray-500">GALA</div>
            </div>
          </div>
        </div>

        <!-- Action -->
        <div class="flex-shrink-0">
          <router-link
            :to="`/submissions/${submission.id}/verify`"
            class="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            View
          </router-link>
        </div>
      </div>
    </div>

    <!-- Load More Button -->
    <div v-if="hasMore" class="mt-4 text-center">
      <button
        :disabled="isLoading"
        class="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
        @click="$emit('load-more')"
      >
        {{ isLoading ? "Loading..." : "Load More" }}
      </button>
    </div>

    <!-- Summary -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div class="font-medium text-gray-900">{{ totalVotes }}</div>
          <div class="text-gray-500">Total Votes</div>
        </div>
        <div>
          <div class="font-medium text-green-600">{{ formatGala(totalGala) }}</div>
          <div class="text-gray-500">Total GALA</div>
        </div>
        <div>
          <div class="font-medium text-purple-600">{{ avgEngagement.toFixed(1) }}%</div>
          <div class="text-gray-500">Avg Engagement</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DocumentTextIcon, FolderIcon } from "@heroicons/vue/24/outline";
import { computed } from "vue";

interface TopSubmission {
  id: number;
  name: string;
  fire: string;
  votes: number;
  galaAmount: number;
  engagement: number;
}

interface Props {
  submissions: TopSubmission[];
  hasMore?: boolean;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasMore: false,
  isLoading: false
});

defineEmits<{
  "load-more": [];
}>();

// Computed values
const totalVotes = computed(() => {
  return props.submissions?.reduce((sum, sub) => sum + sub.votes, 0) || 0;
});

const totalGala = computed(() => {
  return props.submissions?.reduce((sum, sub) => sum + sub.galaAmount, 0) || 0;
});

const avgEngagement = computed(() => {
  if (!props.submissions || props.submissions.length === 0) return 0;
  const total = props.submissions.reduce((sum, sub) => sum + sub.engagement, 0);
  return total / props.submissions.length;
});

// Methods
function formatGala(amount: number): string {
  if (amount >= 100000000000) {
    // 1000+ GALA
    return `${(amount / 100000000).toFixed(1)}K`;
  }
  if (amount >= 100000000) {
    // 1+ GALA
    return `${(amount / 100000000).toFixed(1)}`;
  }
  return `${(amount / 100000000).toFixed(2)}`;
}
</script>

<style scoped>
.top-content-list {
  max-height: 400px;
  overflow-y: auto;
}

.top-content-list::-webkit-scrollbar {
  width: 4px;
}

.top-content-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.top-content-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.top-content-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
