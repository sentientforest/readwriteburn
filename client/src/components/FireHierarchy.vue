<template>
  <div class="fire-hierarchy">
    <!-- Breadcrumb Navigation -->
    <nav v-if="hierarchyPath.length > 0" class="breadcrumb-nav mb-6">
      <ol class="flex items-center space-x-2 text-sm">
        <li>
          <router-link to="/" class="text-primary-600 hover:text-primary-700 flex items-center">
            <HomeIcon class="h-4 w-4 mr-1" />
            Home
          </router-link>
        </li>
        <li v-for="(fire, index) in hierarchyPath" :key="fire.slug" class="flex items-center">
          <ChevronRightIcon class="h-4 w-4 mx-2 text-gray-400" />
          <router-link
            v-if="index < hierarchyPath.length - 1"
            :to="`/f/${fire.slug}`"
            class="text-primary-600 hover:text-primary-700"
          >
            {{ fire.name }}
          </router-link>
          <span v-else class="text-gray-900 font-medium">{{ fire.name }}</span>
        </li>
      </ol>
    </nav>

    <!-- Current Fire Info -->
    <div
      v-if="currentFire"
      class="current-fire-info bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-2xl font-bold text-gray-900">{{ currentFire.name }}</h1>
            <span
              v-if="hierarchyDepth > 0"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
            >
              Level {{ hierarchyDepth }}
            </span>
          </div>

          <p v-if="currentFire.description" class="text-gray-600 mb-4">{{ currentFire.description }}</p>

          <div class="flex items-center gap-4 text-sm text-gray-500">
            <div class="flex items-center gap-1">
              <UserIcon class="h-4 w-4" />
              <span>Started by {{ formatAddress(currentFire.starter) }}</span>
            </div>
            <div class="flex items-center gap-1">
              <CalendarIcon class="h-4 w-4" />
              <span>{{ formatDate(currentFire.created_at) }}</span>
            </div>
            <div v-if="childFires.length > 0" class="flex items-center gap-1">
              <FolderIcon class="h-4 w-4" />
              <span>{{ childFires.length }} subfires</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 ml-6">
          <router-link
            :to="`/f/${currentFire.slug}/submit`"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
          >
            <PlusIcon class="h-4 w-4" />
            New Submission
          </router-link>

          <router-link
            :to="`/f/${currentFire.slug}/subfire`"
            class="px-4 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 flex items-center gap-2"
          >
            <FolderPlusIcon class="h-4 w-4" />
            Create Subfire
          </router-link>
        </div>
      </div>
    </div>

    <!-- Child Fires (Subfires) -->
    <div v-if="childFires.length > 0" class="child-fires mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Subfires</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="childFire in childFires"
          :key="childFire.slug"
          class="child-fire-card bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          @click="navigateToFire(childFire.slug)"
        >
          <div class="flex items-start justify-between mb-3">
            <h3 class="font-semibold text-gray-900">{{ childFire.name }}</h3>
            <FolderIcon class="h-5 w-5 text-primary-500" />
          </div>

          <p v-if="childFire.description" class="text-sm text-gray-600 mb-3 line-clamp-2">
            {{ childFire.description }}
          </p>

          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>by {{ formatAddress(childFire.starter) }}</span>
            <span>{{ formatDate(childFire.created_at) }}</span>
          </div>

          <!-- Child Fire Stats -->
          <div v-if="getFireStats(childFire.slug)" class="mt-3 pt-3 border-t border-gray-100">
            <div class="flex items-center justify-between text-xs">
              <span class="flex items-center gap-1">
                <DocumentTextIcon class="h-3 w-3" />
                {{ getFireStats(childFire.slug).submissions }} submissions
              </span>
              <span class="flex items-center gap-1">
                <FireIcon class="h-3 w-3" />
                {{ formatGala(getFireStats(childFire.slug).totalVotes) }} GALA
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fire Tree Visualization (Collapsible) -->
    <div
      v-if="showTreeView && rootFires.length > 0"
      class="fire-tree bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900">Fire Hierarchy</h2>
        <button
          class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          @click="toggleTreeView"
        >
          <EyeSlashIcon v-if="treeExpanded" class="h-4 w-4" />
          <EyeIcon v-else class="h-4 w-4" />
          {{ treeExpanded ? "Collapse" : "Expand" }}
        </button>
      </div>

      <div v-if="treeExpanded" class="tree-container">
        <FireTreeNode
          v-for="rootFire in rootFires"
          :key="rootFire.slug"
          :fire="rootFire"
          :current-fire-slug="currentFire?.slug"
          :depth="0"
          @navigate="navigateToFire"
        />
      </div>
    </div>

    <!-- Parent Fire Link -->
    <div v-if="parentFire" class="parent-fire-link mt-6">
      <router-link
        :to="`/f/${parentFire.slug}`"
        class="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
      >
        <ArrowUpIcon class="h-4 w-4" />
        Back to {{ parentFire.name }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFiresStore, useSubmissionsStore, useVotesStore } from "@/stores";
import type { FireResponse } from "@/types/api";
import {
  ArrowUpIcon,
  CalendarIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  FireIcon,
  FolderIcon,
  FolderPlusIcon,
  HomeIcon,
  PlusIcon,
  UserIcon
} from "@heroicons/vue/24/outline";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import FireTreeNode from "./FireTreeNode.vue";
import { Fire } from "../types/fire";

const route = useRoute();
const router = useRouter();
const firesStore = useFiresStore();
const submissionsStore = useSubmissionsStore();
const votesStore = useVotesStore();

// Props
interface Props {
  fireSlug?: string;
  showTreeView?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showTreeView: true
});

// State
const treeExpanded = ref(false);
const fireStats = ref<Record<string, { submissions: number; totalVotes: number }>>({});

// Computed properties
const allFires = computed(() => firesStore.fires);
const currentFire = computed(() => {
  const slug = props.fireSlug || (route.params.slug as string);
  return allFires.value.find((fire) => fire.slug === slug) || null;
});

const parentFire = computed(() => {
  if (!currentFire.value?.entryParent) return null;
  
  // Find parent fire by matching its composite key with current fire's entryParent
  return allFires.value.find((fire) => {
    const fireCompositeKey = Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, [fire.slug, fire.slug]);
    return fireCompositeKey === currentFire.value!.entryParent;
  }) || null;
});

const childFires = computed(() => {
  if (!currentFire.value) return [];
  
  // Child fires have entryParent set to their parent's composite key
  const currentFireCompositeKey = Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, [currentFire.value.slug, currentFire.value.slug]);
  return allFires.value.filter((fire) => fire.entryParent === currentFireCompositeKey);
});

const rootFires = computed(() => {
  // Root fires are those where entryParent is their own composite key (self-referencing)
  return allFires.value.filter((fire) => {
    if (!fire.entryParent || fire.entryParent === "") return true; // legacy empty entryParent
    
    const selfCompositeKey = Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, [fire.slug, fire.slug]);
    return fire.entryParent === selfCompositeKey; // self-referencing top-level fire
  });
});

const hierarchyPath = computed(() => {
  if (!currentFire.value) return [];

  const path: FireResponse[] = [];
  let current: FireResponse | null = currentFire.value;

  // Build path from current fire up to root
  while (current) {
    path.unshift(current);
    if (!current.entryParent) break;
    
    // Check if this is a self-referencing top-level fire
    const selfCompositeKey = Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, [current.slug, current.slug]);
    if (current.entryParent === selfCompositeKey) break; // reached root
    
    // Find parent fire by matching its composite key with current's entryParent
    current = allFires.value.find((fire) => {
      const fireCompositeKey = Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, [fire.slug, fire.slug]);
      return fireCompositeKey === current!.entryParent;
    }) || null;
  }

  return path;
});

const hierarchyDepth = computed(() => hierarchyPath.value.length - 1);

// Methods
async function loadFireStats() {
  // Load stats for current fire and child fires
  const firesToLoad = [currentFire.value?.slug, ...childFires.value.map((f) => f.slug)].filter(
    Boolean
  ) as string[];

  for (const fireSlug of firesToLoad) {
    try {
      // Load submissions for this fire
      await submissionsStore.fetchSubmissions(fireSlug);
      const submissions = submissionsStore.submissionsByFire.get(fireSlug) || [];

      // Load votes for this fire
      await votesStore.fetchVotes({ fire: fireSlug });
      const votes = votesStore.getVotesForFire(fireSlug);
      const totalVotes = votes.reduce((sum, vote) => sum + parseFloat(vote.quantity), 0);

      fireStats.value[fireSlug] = {
        submissions: submissions.length,
        totalVotes
      };
    } catch (error) {
      console.error(`Error loading stats for fire ${fireSlug}:`, error);
    }
  }
}

function getFireStats(fireSlug: string) {
  return fireStats.value[fireSlug] || null;
}

function navigateToFire(fireSlug: string) {
  router.push(`/f/${fireSlug}`);
}

function toggleTreeView() {
  treeExpanded.value = !treeExpanded.value;
}

function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateString;
  }
}

function formatGala(amount: number): string {
  return (amount / 100000000).toFixed(2);
}

// Watch for route changes
watch(
  () => route.params.slug,
  async (newSlug) => {
    if (newSlug) {
      await loadFireStats();
    }
  }
);

// Load initial data
onMounted(async () => {
  await firesStore.fetchFires();
  if (currentFire.value) {
    await loadFireStats();
  }
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tree-container {
  @apply space-y-2;
}

.child-fire-card:hover {
  @apply transform scale-105;
  transition: transform 0.2s ease-in-out;
}

.breadcrumb-nav {
  @apply bg-gray-50 rounded-lg px-4 py-2;
}
</style>
