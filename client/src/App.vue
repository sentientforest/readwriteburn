<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile-friendly navigation -->
    <nav class="bg-primary-600 shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Desktop navigation -->
          <div class="hidden md:flex space-x-1">
            <RouterLink to="/" class="nav-link">Find Fires</RouterLink>
            <RouterLink to="/firestarter" class="nav-link">Let's Burn</RouterLink>
            <RouterLink to="/votes" class="nav-link">Vote Explorer</RouterLink>
            <RouterLink to="/votes/leaderboard" class="nav-link">Leaderboard</RouterLink>
            <RouterLink to="/verify" class="nav-link">Verify Content</RouterLink>
            <RouterLink to="/admin" class="nav-link">Admin</RouterLink>
            <RouterLink to="/account" class="nav-link">Account</RouterLink>
            <RouterLink to="/about" class="nav-link">About</RouterLink>
          </div>
          
          <!-- Mobile hamburger menu -->
          <div class="md:hidden">
            <button @click="toggleMobileMenu" class="p-2 text-white hover:bg-primary-700 rounded-md">
              <svg v-if="!mobileMenuOpen" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Mobile menu dropdown -->
        <div v-if="mobileMenuOpen" class="md:hidden py-2 space-y-1">
          <RouterLink to="/" @click="closeMobileMenu" class="mobile-nav-link">Find Fires</RouterLink>
          <RouterLink to="/firestarter" @click="closeMobileMenu" class="mobile-nav-link">Let's Burn</RouterLink>
          <RouterLink to="/votes" @click="closeMobileMenu" class="mobile-nav-link">Vote Explorer</RouterLink>
          <RouterLink to="/votes/leaderboard" @click="closeMobileMenu" class="mobile-nav-link">Leaderboard</RouterLink>
          <RouterLink to="/verify" @click="closeMobileMenu" class="mobile-nav-link">Verify Content</RouterLink>
          <RouterLink to="/admin" @click="closeMobileMenu" class="mobile-nav-link">Admin</RouterLink>
          <RouterLink to="/account" @click="closeMobileMenu" class="mobile-nav-link">Account</RouterLink>
          <RouterLink to="/about" @click="closeMobileMenu" class="mobile-nav-link">About</RouterLink>
        </div>
      </div>
    </nav>
    
    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="text-center mb-8">
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          GalaChain Burn and Vote dApp
        </h1>
        <p class="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl mx-auto">
          Let's burn! Browse subfires, submit content, and burn $GALA to upvote submissions you like.
        </p>
      </div>

      <div v-if="!metamaskSupport" class="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6">
        <div class="flex items-start gap-3">
          <svg class="h-5 w-5 text-warning-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 class="text-warning-800 font-medium mb-2">MetaMask Required</h3>
            <p class="text-warning-700 text-sm mb-2">
              This application uses the GalaConnect API via MetaMask to sign transactions and interact with GalaChain.
            </p>
            <p class="text-warning-700 text-sm">
              Visit this site using a browser with the MetaMask web extension installed to use the application.
            </p>
          </div>
        </div>
      </div>
      
      <div v-else-if="!isConnected" class="text-center py-8">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md mx-auto">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Connect Your Wallet</h3>
          <p class="text-gray-600 text-sm mb-6">
            Connect your MetaMask wallet to start burning $GALA and voting on content.
          </p>
          <div class="space-y-3">
            <button @click="connectWallet" class="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
              Connect Wallet
            </button>
            <button @click="connectBasic" class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
              Connect Basic (Debug)
            </button>
          </div>
        </div>
      </div>
      
      <div v-else>
        <div class="bg-success-50 border border-success-200 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-success-800 font-medium">Wallet Connected</p>
              <p class="text-success-700 text-sm font-mono">{{ walletAddress }}</p>
            </div>
          </div>
        </div>
        <RouterView :wallet-address="walletAddress" :metamask-client="userStore.metamaskClient" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "@/stores";

const userStore = useUserStore();

// Mobile menu state
const mobileMenuOpen = ref(false);

// Computed properties from store
const metamaskSupport = computed(() => !!userStore.metamaskClient);
const isConnected = computed(() => userStore.isConnected);
const walletAddress = computed(() => userStore.address);
const isAuthenticated = computed(() => userStore.isAuthenticated);

// Mobile menu functions
function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

async function connectWallet() {
  const success = await userStore.connectWallet();
  if (!success && userStore.error) {
    console.error("Connection failed:", userStore.error);
  }
  
  // If connected but not registered, attempt registration
  if (userStore.isConnected && !userStore.isRegistered) {
    await userStore.registerUser();
  }
}

async function connectBasic() {
  const success = await userStore.connectWalletBasic();
  if (!success && userStore.error) {
    console.error("Basic connection failed:", userStore.error);
  }
  
  // If connected but not registered, attempt registration
  if (userStore.isConnected && !userStore.isRegistered) {
    await userStore.registerUser();
  }
}

onMounted(async () => {
  // Initialize MetaMask support check
  await userStore.initializeMetamask();
});
</script>

<style scoped>
/* Navigation link styles */
.nav-link {
  @apply px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-primary-700 hover:text-white transition-colors duration-200;
}

.nav-link.router-link-active {
  @apply bg-primary-800 text-white font-semibold;
}

.mobile-nav-link {
  @apply block px-3 py-2 text-base font-medium text-white rounded-md hover:bg-primary-700 hover:text-white transition-colors duration-200;
}

.mobile-nav-link.router-link-active {
  @apply bg-primary-800 text-white font-semibold;
}

/* Responsive typography */
@media (max-width: 640px) {
  .wallet-address {
    word-break: break-all;
    font-size: 0.75rem;
  }
}

/* Touch-friendly buttons on mobile */
@media (max-width: 768px) {
  button {
    min-height: 44px; /* iOS recommended touch target size */
  }
  
  .nav-link,
  .mobile-nav-link {
    min-height: 44px;
    display: flex;
    align-items: center;
  }
}

/* Smooth mobile menu transition */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
