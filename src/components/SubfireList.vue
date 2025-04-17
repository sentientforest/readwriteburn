<template>
  <div class="subfire-list">
    <h2>Subfires</h2>
    <div v-if="loading">
      <p><i>Loading subfires...</i></p>
    </div>
    <div v-else-if="loadError">
      <p><i>Failed to fetch subfires from the server. Please try again later.</i></p>
    </div>
    <div v-else class="subfire-board">
      <div v-for="subfire in subfires" :key="subfire.slug" class="subfire-item" @click="selectSubfire(subfire)">
        <h3 class="subfire-title">{{ subfire.name }}</h3>
        <p class="subfire-description">{{ subfire.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { SubfireResDto } from "../types";

const apiBase = import.meta.env.VITE_PROJECT_API;

const subfires = ref<SubfireResDto[]>([]);
const loading = ref(false);
const loadError = ref(false);

async function fetchSubfires() {
  loading.value = true;
  loadError.value = false;
  
  try {
    const response = await fetch(`${apiBase}/api/subfires`);
    if (!response.ok) throw new Error(`Failed to fetch subfires`);
    
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    subfires.value = data;
  } catch (error) {
    console.error('Error fetching subfires:', error);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function selectSubfire(subfire: SubfireResDto) {
  window.location.href = `/subfires/${subfire.slug}`;
}

onMounted(async () => {
  await fetchSubfires();
});
</script>

<style>
.subfire-board {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.subfire-item {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.subfire-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.subfire-title {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.subfire-description {
  margin: 0.5rem 0 0;
  color: #666;
}
</style>
