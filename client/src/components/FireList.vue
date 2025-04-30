<template>
  <div class="fire-list">
    <h2>Fires</h2>
    <div v-if="loading">
      <p><i>Loading fires...</i></p>
    </div>
    <div v-else-if="loadError">
      <p><i>Failed to fetch fires from the server. Please try again later.</i></p>
    </div>
    <div v-else>
      <div v-if="fires.length === 0" class="no-fires">
        <p>No fires created yet</p>
      </div>
      <div v-else class="fire-board">
        <div v-for="fire in fires" :key="fire.slug" class="fire-item" @click="selectFire(fire)">
          <h3 class="fire-title">{{ fire.name }}</h3>
          <p class="fire-description">{{ fire.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import type { FireDto } from "../types";

const apiBase = import.meta.env.VITE_PROJECT_API;

const fires = ref<FireDto[]>([]);
const loading = ref(false);
const loadError = ref(false);

async function fetchFires() {
  loading.value = true;
  loadError.value = false;

  try {
    const response = await fetch(`${apiBase}/api/fires`);
    if (!response.ok) throw new Error(`Failed to fetch fires`);

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid response format");
    }

    fires.value = data;
  } catch (error) {
    console.error("Error fetching fires:", error);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function selectFire(fire: FireDto) {
  window.location.href = `/f/${fire.slug}`;
}

onMounted(async () => {
  await fetchFires();
});
</script>

<style>
.fire-board {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.fire-item {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.fire-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.fire-title {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.fire-description {
  margin: 0.5rem 0 0;
  color: #666;
}

.no-fires {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
}
</style>
