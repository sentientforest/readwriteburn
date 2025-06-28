import { BrowserConnectClient } from '@gala-chain/connect';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  // State
  const address = ref('');
  const publicKey = ref('');
  const isConnected = ref(false);
  const isRegistered = ref(false);
  const balance = ref(0);
  const metamaskClient = ref<BrowserConnectClient | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => isConnected.value && isRegistered.value);
  const shortAddress = computed(() => {
    if (!address.value) return '';
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`;
  });

  // Actions
  async function initializeMetamask() {
    try {
      metamaskClient.value = new BrowserConnectClient();
      return true;
    } catch (e) {
      error.value = 'MetaMask not available';
      return false;
    }
  }

  async function connectWallet() {
    if (!metamaskClient.value) {
      const initialized = await initializeMetamask();
      if (!initialized) return false;
    }

    loading.value = true;
    error.value = null;

    try {
      await metamaskClient.value!.connect();
      address.value = metamaskClient.value!.galaChainAddress;
      publicKey.value = (await metamaskClient.value!.getPublicKey()).publicKey;
      isConnected.value = true;

      // Check registration status
      await checkRegistration();
      
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to connect wallet';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function checkRegistration() {
    if (!address.value) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_BURN_GATEWAY_PUBLIC_KEY_API}/GetPublicKey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: address.value })
      });
      
      isRegistered.value = response.ok;
      return response.ok;
    } catch {
      isRegistered.value = false;
      return false;
    }
  }

  async function registerUser() {
    if (!metamaskClient.value || !publicKey.value) return false;

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${import.meta.env.VITE_GALASWAP_API}/CreateHeadlessWallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: publicKey.value })
      });

      if (response.ok) {
        isRegistered.value = true;
        return true;
      } else {
        error.value = 'Failed to register user';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Registration failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function disconnect() {
    address.value = '';
    publicKey.value = '';
    isConnected.value = false;
    isRegistered.value = false;
    balance.value = 0;
    metamaskClient.value = null;
    error.value = null;
  }

  async function refreshBalance() {
    // TODO: Implement balance fetching from GalaChain
    // This would require calling a balance endpoint
    console.log('Balance refresh not yet implemented');
  }

  return {
    // State
    address,
    publicKey,
    isConnected,
    isRegistered,
    balance,
    metamaskClient,
    loading,
    error,
    // Getters
    isAuthenticated,
    shortAddress,
    // Actions
    initializeMetamask,
    connectWallet,
    checkRegistration,
    registerUser,
    disconnect,
    refreshBalance,
  };
});