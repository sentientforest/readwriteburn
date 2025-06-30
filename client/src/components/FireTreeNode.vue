<template>
  <div class="fire-tree-node" :style="{ marginLeft: `${depth * 20}px` }">
    <div
      :class="[
        'flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer',
        isCurrentFire ? 'bg-primary-100 border border-primary-200' : 'hover:bg-gray-50'
      ]"
      @click="handleClick"
    >
      <!-- Expand/Collapse Button -->
      <button
        v-if="childFires.length > 0"
        class="flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-600"
        @click.stop="toggleExpanded"
      >
        <ChevronRightIcon :class="['h-3 w-3 transition-transform', expanded && 'rotate-90']" />
      </button>
      <div v-else class="w-5"></div>

      <!-- Fire Icon -->
      <FolderIcon :class="['h-4 w-4', isCurrentFire ? 'text-primary-600' : 'text-gray-400']" />

      <!-- Fire Name -->
      <span
        :class="['flex-1 text-sm truncate', isCurrentFire ? 'text-primary-900 font-medium' : 'text-gray-700']"
      >
        {{ fire.name }}
      </span>

      <!-- Fire Stats (if available) -->
      <div v-if="fireStats" class="flex items-center gap-2 text-xs text-gray-500">
        <span class="flex items-center gap-1">
          <DocumentTextIcon class="h-3 w-3" />
          {{ fireStats.submissions }}
        </span>
        <span class="flex items-center gap-1">
          <FireIcon class="h-3 w-3" />
          {{ formatGala(fireStats.totalVotes) }}
        </span>
      </div>

      <!-- Depth Indicator -->
      <span v-if="depth > 0" class="text-xs text-gray-400"> L{{ depth }} </span>
    </div>

    <!-- Child Fires (Recursive) -->
    <div v-if="expanded && childFires.length > 0" class="mt-1">
      <FireTreeNode
        v-for="childFire in childFires"
        :key="childFire.slug"
        :fire="childFire"
        :current-fire-slug="currentFireSlug"
        :depth="depth + 1"
        :all-fires="allFires"
        :fire-stats-map="fireStatsMap"
        @navigate="$emit('navigate', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FireResponse } from "@/types/api";
import { ChevronRightIcon, DocumentTextIcon, FireIcon, FolderIcon } from "@heroicons/vue/24/outline";
import { computed, onMounted, ref } from "vue";

interface Props {
  fire: FireResponse;
  currentFireSlug?: string;
  depth: number;
  allFires?: FireResponse[];
  fireStatsMap?: Record<string, { submissions: number; totalVotes: number }>;
}

const props = withDefaults(defineProps<Props>(), {
  allFires: () => [],
  fireStatsMap: () => ({})
});

const emit = defineEmits<{
  navigate: [fireSlug: string];
}>();

// State
const expanded = ref(false);

// Computed properties
const isCurrentFire = computed(() => props.fire.slug === props.currentFireSlug);

const childFires = computed(() => {
  return props.allFires.filter((fire) => fire.entryParent === props.fire.slug);
});

const fireStats = computed(() => {
  return props.fireStatsMap[props.fire.slug] || null;
});

// Methods
function toggleExpanded() {
  expanded.value = !expanded.value;
}

function handleClick() {
  emit("navigate", props.fire.slug);
}

function formatGala(amount: number): string {
  return (amount / 100000000).toFixed(1);
}

// Auto-expand if this is in the path to current fire
onMounted(() => {
  if (props.currentFireSlug) {
    // Check if current fire is a descendant of this fire
    const isInPath = checkIfInPath(props.currentFireSlug, props.fire.slug, props.allFires);
    if (isInPath) {
      expanded.value = true;
    }
  }
});

function checkIfInPath(targetSlug: string, parentSlug: string, allFires: FireResponse[]): boolean {
  let current = allFires.find((fire) => fire.slug === targetSlug);

  while (current && current.entryParent) {
    if (current.entryParent === parentSlug) {
      return true;
    }
    current = allFires.find((fire) => fire.slug === current!.entryParent);
  }

  return false;
}
</script>

<style scoped>
.fire-tree-node {
  @apply select-none;
}
</style>
