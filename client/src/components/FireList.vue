<template>
  <div class="fire-list">
    <div class="mb-6">
      <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Fires</h2>
      <p class="text-gray-600 text-sm sm:text-base">
        Discover communities and join the conversation
      </p>
    </div>
    
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
      <p class="text-gray-600 text-sm">Loading fires...</p>
    </div>
    
    <div v-else-if="loadError" class="bg-error-50 border border-error-200 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="h-5 w-5 text-error-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-error-800 font-medium mb-1">Failed to Load Fires</h3>
          <p class="text-error-700 text-sm">
            Unable to fetch fires from the server. Please try again later.
          </p>
        </div>
      </div>
    </div>
    
    <div v-else>
      <div v-if="fires.length === 0" class="text-center py-12">
        <svg class="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No fires created yet</h3>
        <p class="text-gray-600 text-sm mb-4">
          Be the first to create a fire and start the conversation!
        </p>
        <RouterLink to="/firestarter" class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Fire
        </RouterLink>
      </div>
      
      <div v-else class="grid gap-4 sm:gap-6">
        <div 
          v-for="fire in fires" 
          :key="fire.slug" 
          class="fire-item bg-white rounded-lg border border-gray-200 p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:border-primary-300 transition-all duration-200 touch-manipulation"
          @click="selectFire(fire)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2 truncate">
                {{ fire.name }}
              </h3>
              <p class="text-gray-600 text-sm sm:text-base line-clamp-3">
                {{ fire.description }}
              </p>
            </div>
            <svg class="h-5 w-5 text-gray-400 ml-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          
          <!-- Mobile-friendly fire stats -->
          <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs sm:text-sm text-gray-500">
            <span>Fire: {{ fire.slug }}</span>
            <span class="text-primary-600 font-medium">Tap to explore</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useFiresStore } from "@/stores";

const firesStore = useFiresStore();
const router = useRouter();

// Computed properties from store
const fires = computed(() => firesStore.fires);
const loading = computed(() => firesStore.loading);
const loadError = computed(() => !!firesStore.error);

function selectFire(fire: any) {
  router.push(`/f/${fire.slug}`);
}

onMounted(async () => {
  await firesStore.fetchFires();
});
</script>

<style scoped>
/* Line clamp utility for description text */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Touch-friendly interactions */
.touch-manipulation {
  touch-action: manipulation;
}

/* Mobile-specific hover states */
@media (hover: hover) {
  .fire-item:hover {
    transform: translateY(-1px);
  }
}

/* Mobile tap states */
@media (hover: none) {
  .fire-item:active {
    transform: scale(0.98);
    transition: transform 0.1s;
  }
}

/* Ensure proper touch targets on mobile */
@media (max-width: 768px) {
  .fire-item {
    min-height: 80px;
  }
}
</style>
