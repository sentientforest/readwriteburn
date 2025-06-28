<template>
  <div class="voting-patterns-chart">
    <div v-if="!data || data.length === 0" class="text-center py-8">
      <ChartBarIcon class="h-12 w-12 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-500">No voting pattern data</p>
    </div>
    
    <div v-else>
      <!-- Hour-by-hour activity -->
      <div class="space-y-2">
        <div 
          v-for="hourData in data" 
          :key="hourData.hour"
          class="flex items-center gap-3"
        >
          <div class="w-12 text-xs text-gray-500 text-right">
            {{ formatHour(hourData.hour) }}
          </div>
          <div class="flex-1 bg-gray-200 rounded h-4 relative overflow-hidden">
            <div 
              class="bg-primary-500 h-full rounded transition-all duration-500"
              :style="{ width: `${(hourData.votes / maxVotes) * 100}%` }"
            ></div>
            <div class="absolute inset-0 flex items-center px-2">
              <span class="text-xs text-gray-700 font-medium">
                {{ hourData.votes }} votes
              </span>
            </div>
          </div>
          <div class="w-16 text-xs text-gray-500 text-right">
            {{ hourData.avgAmount.toFixed(1) }} avg
          </div>
        </div>
      </div>
      
      <!-- Peak hours summary -->
      <div class="mt-4 pt-4 border-t border-gray-200">
        <h4 class="text-sm font-medium text-gray-900 mb-2">Peak Activity</h4>
        <div class="text-sm text-gray-600">
          <p>Most active: {{ formatHour(peakHour.hour) }} ({{ peakHour.votes }} votes)</p>
          <p>Highest avg amount: {{ formatHour(highestAvgHour.hour) }} ({{ highestAvgHour.avgAmount.toFixed(1) }} GALA)</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChartBarIcon } from '@heroicons/vue/24/outline';
import { computed } from 'vue';

interface VotingPatternData {
  hour: number;
  votes: number;
  avgAmount: number;
}

interface Props {
  data: VotingPatternData[];
}

const props = defineProps<Props>();

const maxVotes = computed(() => {
  return props.data?.length ? Math.max(...props.data.map(d => d.votes)) : 1;
});

const peakHour = computed(() => {
  return props.data?.reduce((max, current) => 
    current.votes > max.votes ? current : max, 
    props.data[0]
  ) || { hour: 0, votes: 0, avgAmount: 0 };
});

const highestAvgHour = computed(() => {
  return props.data?.reduce((max, current) => 
    current.avgAmount > max.avgAmount ? current : max, 
    props.data[0]
  ) || { hour: 0, votes: 0, avgAmount: 0 };
});

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}${period}`;
}
</script>