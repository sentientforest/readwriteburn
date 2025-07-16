import { signatures } from "@gala-chain/api";
import { defineStore } from "pinia";
import { computed, getCurrentInstance, ref } from "vue";

export const useUserStore = defineStore("user", () => {
  // Access global metamaskClient
  const instance = getCurrentInstance();
  const metamaskClient = computed(() => instance?.appContext.config.globalProperties.$metamaskClient);

  // State
  const address = ref("");
  const publicKey = ref("");
  const isConnected = ref(false);
  const isRegistered = ref(false);
  const balance = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => isConnected.value && isRegistered.value);
  const shortAddress = computed(() => {
    if (!address.value) return "";
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`;
  });

  // Actions - connectWallet uses the global client
  async function connectWallet() {
    if (!metamaskClient.value) {
      error.value = "MetaMask client not available";
      return false;
    }

    console.log("Starting GalaChain wallet connection...");

    loading.value = true;
    error.value = null;

    try {
      // Check if MetaMask is available
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask not detected. Please install MetaMask to use this application.");
      }

      // First, ensure MetaMask is connected at the browser level
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No MetaMask accounts available");
      }

      console.log("MetaMask accounts available:", accounts.length);

      // Connect the GalaChain client
      console.log("Attempting GalaChain connect...");
      const galaAddress = await metamaskClient.value.connect();
      console.log("GalaChain connect successful, address:", galaAddress);

      // Try to get public key for GalaChain operations
      console.log("Attempting to get public key...");
      const keyResult = await metamaskClient.value.getPublicKey();
      if (keyResult && keyResult.publicKey) {
        publicKey.value = keyResult.publicKey;
        console.log("Public key retrieved successfully");
      } else {
        throw new Error("Failed to retrieve public key from MetaMask");
      }

      // Set the address using the proper eth| format (without 0x prefix)
      const normalizedAddress = signatures.normalizeEthAddress(accounts[0]);
      address.value = `eth|${normalizedAddress}`;

      console.log("GalaChain wallet connection successful:", {
        address: address.value,
        hasPublicKey: !!publicKey.value
      });

      isConnected.value = true;

      // Check registration status
      await checkRegistration();

      return true;
    } catch (err) {
      console.error("GalaChain wallet connection error:", err);
      error.value = err instanceof Error ? err.message : "Failed to connect wallet via GalaChain";

      // Reset state on error
      address.value = "";
      publicKey.value = "";
      isConnected.value = false;

      return false;
    } finally {
      loading.value = false;
    }
  }

  async function checkRegistration() {
    if (!address.value) return false;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_PROJECT_API}/api/product/PublicKeyContract/GetPublicKey`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: address.value })
        }
      );

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
      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/identities/CreateHeadlessWallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: publicKey.value })
      });

      if (response.ok) {
        isRegistered.value = true;
        return true;
      } else {
        error.value = "Failed to register user";
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Registration failed";
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function disconnect() {
    address.value = "";
    publicKey.value = "";
    isConnected.value = false;
    isRegistered.value = false;
    balance.value = 0;
    error.value = null;
  }

  async function refreshBalance() {
    // TODO: Implement balance fetching from GalaChain
    // This would require calling a balance endpoint
    console.log("Balance refresh not yet implemented");
  }

  return {
    // State
    address,
    publicKey,
    isConnected,
    isRegistered,
    balance,
    loading,
    error,
    // Getters
    isAuthenticated,
    shortAddress,
    metamaskClient,
    // Actions
    connectWallet,
    checkRegistration,
    registerUser,
    disconnect,
    refreshBalance
  };
});
