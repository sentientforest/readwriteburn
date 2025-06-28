import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { FireResponse, FireCreateRequest, AsyncState, ApiResponse } from '@/types/api';

export const useFiresStore = defineStore('fires', () => {
  // State
  const fires = ref<FireResponse[]>([]);
  const currentFire = ref<FireResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastFetch = ref<number | null>(null);

  // Getters
  const firesById = computed(() => {
    const map = new Map<string, FireResponse>();
    fires.value.forEach(fire => map.set(fire.slug, fire));
    return map;
  });

  const isStale = computed(() => {
    if (!lastFetch.value) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastFetch.value > fiveMinutes;
  });

  // Actions
  async function fetchFires(force = false) {
    if (loading.value) return;
    if (!force && !isStale.value && fires.value.length > 0) return;

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/fires`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch fires: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      fires.value = data;
      lastFetch.value = Date.now();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch fires';
      console.error('Error fetching fires:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchFireBySlug(slug: string, force = false) {
    const existing = firesById.value.get(slug);
    if (!force && existing) {
      currentFire.value = existing;
      return existing;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/fires/${slug}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch fire: ${response.status}`);
      }

      const fire = await response.json();
      currentFire.value = fire;

      // Update fires array if fire exists there
      const index = fires.value.findIndex(f => f.slug === slug);
      if (index !== -1) {
        fires.value[index] = fire;
      } else {
        fires.value.push(fire);
      }

      return fire;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch fire';
      console.error('Error fetching fire:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createFire(fireData: FireCreateRequest, metamaskClient: any) {
    loading.value = true;
    error.value = null;

    try {
      // Create placeholder fee for dry run
      const placeholderFee = {
        feeCode: 'FIRE_CREATION_FEE',
        uniqueKey: fireData.uniqueKey + '_fee'
      };

      // Create FireStarterDto for the request
      const fireStarterDto = {
        fire: fireData,
        fee: placeholderFee,
        uniqueKey: fireData.uniqueKey + '_starter'
      };

      // Sign the transaction
      const signedDto = await metamaskClient.sign(fireStarterDto);

      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/fires`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signedDto)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create fire');
      }

      const result = await response.json();
      
      // Refresh fires list to include new fire
      await fetchFires(true);
      
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create fire';
      console.error('Error creating fire:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function estimateFireCreationFees(fireData: FireCreateRequest, callerPublicKey: string) {
    try {
      // Create placeholder fee for dry run
      const placeholderFee = {
        feeCode: 'FIRE_CREATION_FEE',
        uniqueKey: fireData.uniqueKey + '_fee'
      };

      // Create FireStarterDto for dry run
      const fireStarterDto = {
        fire: fireData,
        fee: placeholderFee,
        uniqueKey: fireData.uniqueKey + '_starter'
      };

      const dryRunDto = {
        callerPublicKey,
        method: 'FireStarter',
        dto: fireStarterDto
      };

      const response = await fetch(`${import.meta.env.VITE_GALASWAP_API}/api/product/ReadWriteBurn/DryRun`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dryRunDto)
      });

      if (!response.ok) {
        throw new Error('Failed to estimate fees');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error estimating fees:', err);
      throw err;
    }
  }

  function clearCurrentFire() {
    currentFire.value = null;
  }

  function clearError() {
    error.value = null;
  }

  function addFire(fire: FireResponse) {
    const existingIndex = fires.value.findIndex(f => f.slug === fire.slug);
    if (existingIndex !== -1) {
      fires.value[existingIndex] = fire;
    } else {
      fires.value.push(fire);
    }
  }

  function removeFire(slug: string) {
    const index = fires.value.findIndex(f => f.slug === slug);
    if (index !== -1) {
      fires.value.splice(index, 1);
    }
    if (currentFire.value?.slug === slug) {
      currentFire.value = null;
    }
  }

  return {
    // State
    fires,
    currentFire,
    loading,
    error,
    lastFetch,
    // Getters
    firesById,
    isStale,
    // Actions
    fetchFires,
    fetchFireBySlug,
    createFire,
    estimateFireCreationFees,
    clearCurrentFire,
    clearError,
    addFire,
    removeFire,
  };
});