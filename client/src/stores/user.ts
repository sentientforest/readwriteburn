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
      // Check if MetaMask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not detected');
      }
      
      // Try to initialize the GalaChain client
      try {
        metamaskClient.value = new BrowserConnectClient();
        console.log('BrowserConnectClient initialized successfully');
        return true;
      } catch (initError) {
        console.error('Failed to initialize BrowserConnectClient:', initError);
        // Don't throw - we can still proceed with basic MetaMask functionality
        return false;
      }
    } catch (e) {
      console.error('MetaMask initialization error:', e);
      error.value = e instanceof Error ? e.message : 'MetaMask not available';
      return false;
    }
  }

  // Fallback wallet connection that bypasses GalaChain client
  async function connectWalletBasic() {
    loading.value = true;
    error.value = null;

    try {
      console.log('Starting basic wallet connection...');
      
      // Check if MetaMask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not detected');
      }
      
      // Connect to MetaMask directly
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No MetaMask accounts available');
      }
      
      console.log('MetaMask connected successfully');
      
      // Set the address using the eth| format
      address.value = `eth|${accounts[0]}`;
      
      // Mark as connected (but without GalaChain client)
      isConnected.value = true;
      
      console.log('Basic wallet connection successful:', {
        address: address.value
      });
      
      // Check registration status
      await checkRegistration();
      
      return true;
    } catch (err) {
      console.error('Basic wallet connection error:', err);
      error.value = err instanceof Error ? err.message : 'Failed to connect wallet';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function connectWallet() {
    console.log('Starting wallet connection...');
    
    // Try full GalaChain connection first
    try {
      loading.value = true;
      error.value = null;
      
      // First, ensure MetaMask is connected at the browser level
      const accounts = await window.ethereum?.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No MetaMask accounts available');
      }
      
      console.log('MetaMask accounts available:', accounts.length);
      
      // Set the address immediately from MetaMask
      address.value = `eth|${accounts[0]}`;
      
      // Initialize the GalaChain client if not already done
      if (!metamaskClient.value) {
        const initialized = await initializeMetamask();
        if (!initialized) {
          console.warn('GalaChain client initialization failed, falling back to basic connection');
          throw new Error('GalaChain client initialization failed');
        }
      }
      
      // Try to connect the GalaChain client - this is where the private field error occurs
      console.log('Attempting GalaChain connect...');
      await metamaskClient.value.connect();
      console.log('GalaChain connect successful');
      
      // Try to get public key for GalaChain operations
      console.log('Attempting to get public key...');
      const keyResult = await metamaskClient.value.getPublicKey();
      if (keyResult && keyResult.publicKey) {
        publicKey.value = keyResult.publicKey;
        console.log('Public key retrieved successfully');
      } else {
        console.warn('Public key not available in expected format');
      }
      
      console.log('Full GalaChain wallet connection successful:', {
        address: address.value,
        hasPublicKey: !!publicKey.value
      });
      
      isConnected.value = true;
      await checkRegistration();
      
      return true;
      
    } catch (galaChainError) {
      console.warn('GalaChain connection failed, attempting basic MetaMask connection:', galaChainError);
      
      // Reset state and try basic connection
      loading.value = false;
      return await connectWalletBasic();
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
    connectWalletBasic,
    checkRegistration,
    registerUser,
    disconnect,
    refreshBalance,
  };
});