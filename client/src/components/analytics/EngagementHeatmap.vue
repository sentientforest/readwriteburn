<template>
  <div class="engagement-heatmap">
    <div v-if="!data || data.length === 0" class="text-center py-8">
      <CalendarDaysIcon class="h-12 w-12 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-500">No heatmap data available</p>
    </div>
    
    <div v-else>
      <!-- Day Labels -->
      <div class="flex items-center mb-2">
        <div class="w-8"></div> <!-- Spacer for hour labels -->
        <div class="flex-1 grid grid-cols-7 gap-1 text-xs text-center text-gray-500">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
      </div>

      <!-- Heatmap Grid -->
      <div class="space-y-1">
        <div 
          v-for="hour in 24" 
          :key="hour - 1"
          class="flex items-center gap-1"
        >
          <!-- Hour Label -->
          <div class="w-8 text-xs text-gray-500 text-right">
            {{ formatHour(hour - 1) }}
          </div>
          
          <!-- Day Cells -->
          <div class="flex-1 grid grid-cols-7 gap-1">
            <div
              v-for="day in 7"
              :key="`${day}-${hour}`"
              :class="[
                'aspect-square rounded-sm transition-all duration-200 cursor-pointer',
                getActivityClass(getActivityLevel(day - 1, hour - 1))
              ]"
              :title="getTooltipText(day - 1, hour - 1)"
              @mouseenter="showTooltip($event, day - 1, hour - 1)"
              @mouseleave="hideTooltip"
            ></div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-4 flex items-center justify-between text-xs">
        <span class="text-gray-500">Less activity</span>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 bg-gray-100 rounded-sm"></div>
          <div class="w-3 h-3 bg-green-200 rounded-sm"></div>
          <div class="w-3 h-3 bg-green-400 rounded-sm"></div>
          <div class="w-3 h-3 bg-green-600 rounded-sm"></div>
          <div class="w-3 h-3 bg-green-800 rounded-sm"></div>
        </div>
        <span class="text-gray-500">More activity</span>
      </div>

      <!-- Tooltip -->
      <div
        v-if="tooltip.show"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        class="absolute z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none transform -translate-x-1/2 -translate-y-full"
      >
        {{ tooltip.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarDaysIcon } from '@heroicons/vue/24/outline';
import { ref, computed } from 'vue';

interface HeatmapData {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  activity: number; // 0-100
}

interface Props {
  data: HeatmapData[];
}

const props = defineProps<Props>();

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  text: ''
});

const maxActivity = computed(() => {
  return props.data?.length ? Math.max(...props.data.map(d => d.activity)) : 100;
});

const activityMap = computed(() => {
  const map = new Map<string, number>();
  props.data?.forEach(item => {
    map.set(`${item.day}-${item.hour}`, item.activity);
  });
  return map;
});

function getActivityLevel(day: number, hour: number): number {
  const key = `${day}-${hour}`;
  return activityMap.value.get(key) || 0;
}

function getActivityClass(level: number): string {
  const normalized = level / maxActivity.value;
  
  if (normalized === 0) return 'bg-gray-100';
  if (normalized < 0.2) return 'bg-green-200';
  if (normalized < 0.4) return 'bg-green-400';
  if (normalized < 0.6) return 'bg-green-600';
  return 'bg-green-800';
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}${period}`;
}

function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
}

function getTooltipText(day: number, hour: number): string {
  const activity = getActivityLevel(day, hour);
  return `${getDayName(day)} ${formatHour(hour)}: ${activity.toFixed(0)} activity`;
}

function showTooltip(event: MouseEvent, day: number, hour: number) {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  tooltip.value = {
    show: true,
    x: rect.left + rect.width / 2,
    y: rect.top,
    text: getTooltipText(day, hour)
  };
}

function hideTooltip() {
  tooltip.value.show = false;
}
</script>

<style scoped>
.engagement-heatmap {
  position: relative;
}
</style>