<template>
  <div class="vote-trends-chart">
    <!-- Chart Controls -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-primary-500 rounded"></div>
          <span class="text-sm text-gray-600">Votes</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-green-500 rounded"></div>
          <span class="text-sm text-gray-600">GALA Burned</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <select v-model="selectedMetric" class="text-sm border border-gray-300 rounded px-2 py-1">
          <option value="both">Both Metrics</option>
          <option value="votes">Votes Only</option>
          <option value="gala">GALA Only</option>
        </select>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="chart-container relative" style="height: 300px">
      <div v-if="!data || data.length === 0" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <ChartBarIcon class="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p class="text-gray-500">No data available</p>
        </div>
      </div>

      <svg v-else class="w-full h-full" viewBox="0 0 800 300">
        <!-- Grid Lines -->
        <defs>
          <pattern id="grid" width="50" height="30" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 30" fill="none" stroke="#f3f4f6" stroke-width="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Y-Axis Labels (Votes) -->
        <g v-if="selectedMetric !== 'gala'">
          <text
            v-for="(tick, index) in votesYTicks"
            :key="`votes-y-${index}`"
            :x="30"
            :y="280 - tick.position * 240"
            class="text-xs fill-gray-500"
            text-anchor="end"
          >
            {{ tick.label }}
          </text>
        </g>

        <!-- Y-Axis Labels (GALA) - Right side -->
        <g v-if="selectedMetric !== 'votes'">
          <text
            v-for="(tick, index) in galaYTicks"
            :key="`gala-y-${index}`"
            :x="770"
            :y="280 - tick.position * 240"
            class="text-xs fill-green-600"
            text-anchor="start"
          >
            {{ tick.label }}
          </text>
        </g>

        <!-- Chart Lines -->
        <g class="chart-lines">
          <!-- Votes Line -->
          <path
            v-if="selectedMetric !== 'gala'"
            :d="votesPath"
            fill="none"
            stroke="#3b82f6"
            stroke-width="2"
            class="transition-all duration-300"
          />

          <!-- GALA Line -->
          <path
            v-if="selectedMetric !== 'votes'"
            :d="galaPath"
            fill="none"
            stroke="#10b981"
            stroke-width="2"
            class="transition-all duration-300"
          />
        </g>

        <!-- Data Points -->
        <g class="data-points">
          <!-- Votes Points -->
          <circle
            v-for="(point, index) in votesPoints"
            v-if="selectedMetric !== 'gala'"
            :key="`votes-point-${index}`"
            :cx="point.x"
            :cy="point.y"
            r="4"
            fill="#3b82f6"
            class="hover:r-6 transition-all duration-200 cursor-pointer"
            @mouseenter="showTooltip($event, data[index], 'votes')"
            @mouseleave="hideTooltip"
          />

          <!-- GALA Points -->
          <circle
            v-for="(point, index) in galaPoints"
            v-if="selectedMetric !== 'votes'"
            :key="`gala-point-${index}`"
            :cx="point.x"
            :cy="point.y"
            r="4"
            fill="#10b981"
            class="hover:r-6 transition-all duration-200 cursor-pointer"
            @mouseenter="showTooltip($event, data[index], 'gala')"
            @mouseleave="hideTooltip"
          />
        </g>

        <!-- X-Axis Labels -->
        <g class="x-axis-labels">
          <text
            v-for="(point, index) in xAxisPoints"
            :key="`x-axis-${index}`"
            :x="point.x"
            y="295"
            class="text-xs fill-gray-500"
            text-anchor="middle"
          >
            {{ formatDate(data[index].date) }}
          </text>
        </g>
      </svg>

      <!-- Tooltip -->
      <div
        v-if="tooltip.show"
        :style="{
          left: tooltip.x + 'px',
          top: tooltip.y + 'px'
        }"
        class="absolute z-10 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 pointer-events-none transform -translate-x-1/2 -translate-y-full"
      >
        <div class="font-medium">{{ tooltip.date }}</div>
        <div v-if="tooltip.votes !== undefined" class="text-blue-300">Votes: {{ tooltip.votes }}</div>
        <div v-if="tooltip.gala !== undefined" class="text-green-300">
          GALA: {{ formatGala(tooltip.gala) }}
        </div>
        <!-- Tooltip arrow -->
        <div
          class="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"
        ></div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div class="text-center">
        <div class="font-medium text-gray-900">{{ totalVotes }}</div>
        <div class="text-gray-500">Total Votes</div>
      </div>
      <div class="text-center">
        <div class="font-medium text-gray-900">{{ formatGala(totalGala) }}</div>
        <div class="text-gray-500">Total GALA</div>
      </div>
      <div class="text-center">
        <div class="font-medium text-gray-900">{{ avgVotesPerDay.toFixed(1) }}</div>
        <div class="text-gray-500">Avg Votes/Day</div>
      </div>
      <div class="text-center">
        <div class="font-medium text-gray-900">{{ formatGala(avgGalaPerDay) }}</div>
        <div class="text-gray-500">Avg GALA/Day</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChartBarIcon } from "@heroicons/vue/24/outline";
import { computed, ref } from "vue";

interface ChartDataPoint {
  date: string;
  votes: number;
  gala: number;
}

interface Props {
  data: ChartDataPoint[];
  timeRange: string;
}

const props = defineProps<Props>();

// State
const selectedMetric = ref("both");
const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  date: "",
  votes: undefined as number | undefined,
  gala: undefined as number | undefined
});

// Computed values
const votesExtent = computed(() => {
  if (!props.data || props.data.length === 0) return [0, 100];
  const values = props.data.map((d) => d.votes);
  return [0, Math.max(...values) * 1.1];
});

const galaExtent = computed(() => {
  if (!props.data || props.data.length === 0) return [0, 1000];
  const values = props.data.map((d) => d.gala);
  return [0, Math.max(...values) * 1.1];
});

const votesYTicks = computed(() => {
  const [min, max] = votesExtent.value;
  const ticks = [];
  const step = max / 5;
  for (let i = 0; i <= 5; i++) {
    const value = min + step * i;
    ticks.push({
      position: i / 5,
      label: Math.floor(value).toString()
    });
  }
  return ticks;
});

const galaYTicks = computed(() => {
  const [min, max] = galaExtent.value;
  const ticks = [];
  const step = max / 5;
  for (let i = 0; i <= 5; i++) {
    const value = min + step * i;
    ticks.push({
      position: i / 5,
      label: formatGala(value)
    });
  }
  return ticks;
});

const votesPoints = computed(() => {
  if (!props.data || props.data.length === 0) return [];
  const [min, max] = votesExtent.value;
  const range = max - min || 1;

  return props.data.map((point, index) => ({
    x: 50 + (index / (props.data.length - 1)) * 700,
    y: 280 - ((point.votes - min) / range) * 240
  }));
});

const galaPoints = computed(() => {
  if (!props.data || props.data.length === 0) return [];
  const [min, max] = galaExtent.value;
  const range = max - min || 1;

  return props.data.map((point, index) => ({
    x: 50 + (index / (props.data.length - 1)) * 700,
    y: 280 - ((point.gala - min) / range) * 240
  }));
});

const xAxisPoints = computed(() => {
  if (!props.data || props.data.length === 0) return [];

  // Show every nth point based on data density
  const step = Math.max(1, Math.floor(props.data.length / 6));

  return props.data
    .filter((_, index) => index % step === 0 || index === props.data.length - 1)
    .map((_, i) => ({
      x: 50 + ((i * step) / (props.data.length - 1)) * 700
    }));
});

const votesPath = computed(() => {
  if (votesPoints.value.length === 0) return "";

  const pathData = votesPoints.value
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return pathData;
});

const galaPath = computed(() => {
  if (galaPoints.value.length === 0) return "";

  const pathData = galaPoints.value
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return pathData;
});

// Summary statistics
const totalVotes = computed(() => {
  return props.data?.reduce((sum, point) => sum + point.votes, 0) || 0;
});

const totalGala = computed(() => {
  return props.data?.reduce((sum, point) => sum + point.gala, 0) || 0;
});

const avgVotesPerDay = computed(() => {
  return props.data?.length ? totalVotes.value / props.data.length : 0;
});

const avgGalaPerDay = computed(() => {
  return props.data?.length ? totalGala.value / props.data.length : 0;
});

// Methods
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (props.timeRange === "24h") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatGala(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toFixed(1);
}

function showTooltip(event: MouseEvent, dataPoint: ChartDataPoint, type: "votes" | "gala") {
  const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
  const container = (event.currentTarget as SVGElement).closest(".chart-container")?.getBoundingClientRect();

  if (container) {
    tooltip.value = {
      show: true,
      x: rect.left - container.left + rect.width / 2,
      y: rect.top - container.top,
      date: formatDate(dataPoint.date),
      votes: type === "votes" || selectedMetric.value === "both" ? dataPoint.votes : undefined,
      gala: type === "gala" || selectedMetric.value === "both" ? dataPoint.gala : undefined
    };
  }
}

function hideTooltip() {
  tooltip.value.show = false;
}
</script>

<style scoped>
.chart-container {
  @apply relative overflow-hidden;
}

.chart-lines path {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.data-points circle {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}
</style>
