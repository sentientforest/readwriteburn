<template>
  <div class="metric-card bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-600">{{ title }}</p>
        <p class="text-2xl font-bold text-gray-900">{{ value }}</p>
      </div>
      <div :class="['p-3 rounded-full', iconClass]">
        <component :is="iconComponent" class="h-6 w-6" />
      </div>
    </div>

    <div class="mt-4 flex items-center">
      <div :class="['flex items-center gap-1 text-sm font-medium', changeColor]">
        <component :is="changeIcon" class="h-4 w-4" />
        <span>{{ Math.abs(change).toFixed(1) }}%</span>
      </div>
      <span class="text-sm text-gray-500 ml-2">vs previous period</span>
    </div>

    <!-- Mini Trend Chart -->
    <div v-if="trendData && trendData.length > 0" class="mt-4">
      <div class="h-8 flex items-end gap-1">
        <div
          v-for="(point, index) in normalizedTrend"
          :key="index"
          :class="['bg-primary-300 rounded-sm transition-all duration-300', 'hover:bg-primary-500']"
          :style="{
            height: `${point}%`,
            width: `${100 / normalizedTrend.length}%`
          }"
          :title="`Value: ${trendData[index]?.value || 0}`"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">{{ trendData.length }} data points</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  FireIcon,
  UsersIcon
} from "@heroicons/vue/24/outline";
import { computed } from "vue";

interface TrendDataPoint {
  timestamp: number;
  value: number;
}

interface Props {
  title: string;
  value: string;
  change: number;
  icon: "fire" | "currency" | "users" | "document";
  trendData?: TrendDataPoint[];
}

const props = withDefaults(defineProps<Props>(), {
  trendData: () => []
});

// Icon mapping
const iconComponent = computed(() => {
  switch (props.icon) {
    case "fire":
      return FireIcon;
    case "currency":
      return CurrencyDollarIcon;
    case "users":
      return UsersIcon;
    case "document":
      return DocumentTextIcon;
    default:
      return FireIcon;
  }
});

const iconClass = computed(() => {
  switch (props.icon) {
    case "fire":
      return "bg-orange-100 text-orange-600";
    case "currency":
      return "bg-green-100 text-green-600";
    case "users":
      return "bg-blue-100 text-blue-600";
    case "document":
      return "bg-purple-100 text-purple-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
});

// Change indicators
const changeIcon = computed(() => {
  return props.change >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
});

const changeColor = computed(() => {
  return props.change >= 0 ? "text-green-600" : "text-red-600";
});

// Trend chart normalization
const normalizedTrend = computed(() => {
  if (!props.trendData || props.trendData.length === 0) return [];

  const values = props.trendData.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // Avoid division by zero

  return values.map((value) => Math.max(10, ((value - min) / range) * 80 + 10));
});
</script>

<style scoped>
.metric-card {
  transition: all 0.2s ease;
}

.metric-card:hover {
  @apply shadow-md transform scale-[1.01];
}
</style>
