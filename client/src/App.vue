<template>
  <ErrorBoundary>
    <div class="min-h-screen bg-gray-50">
      <!-- Mobile-friendly navigation -->
      <ErrorBoundary>
        <nav class="bg-primary-600 shadow-lg" role="navigation" aria-label="Main navigation">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
              <!-- Desktop navigation -->
              <div class="hidden md:flex space-x-1" role="menubar" aria-label="Main menu">
                <RouterLink to="/" class="nav-link" role="menuitem" aria-current="page"
                  >Find Fires</RouterLink
                >
                <RouterLink to="/firestarter" class="nav-link" role="menuitem">Let's Burn</RouterLink>
                <RouterLink to="/votes" class="nav-link" role="menuitem">Vote Explorer</RouterLink>
                <RouterLink to="/votes/leaderboard" class="nav-link" role="menuitem">Leaderboard</RouterLink>
                <RouterLink to="/verify" class="nav-link" role="menuitem">Verify Content</RouterLink>
                <RouterLink to="/admin" class="nav-link" role="menuitem">Admin</RouterLink>
                <RouterLink to="/account" class="nav-link" role="menuitem">Account</RouterLink>
                <RouterLink to="/about" class="nav-link" role="menuitem">About</RouterLink>
              </div>

              <!-- Mobile hamburger menu -->
              <div class="md:hidden">
                <button
                  class="p-2 text-white hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
                  :aria-expanded="mobileMenuOpen"
                  :aria-controls="mobileMenuId"
                  aria-label="Toggle main menu"
                  @click="toggleMobileMenu"
                  @keydown="handleMobileMenuKeydown"
                >
                  <svg
                    v-if="!mobileMenuOpen"
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  <svg
                    v-else
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Mobile menu dropdown -->
            <div
              v-if="mobileMenuOpen"
              :id="mobileMenuId"
              class="md:hidden py-2 space-y-1"
              role="menu"
              aria-label="Mobile navigation menu"
            >
              <RouterLink to="/" class="mobile-nav-link" role="menuitem" @click="closeMobileMenu"
                >Find Fires</RouterLink
              >
              <RouterLink to="/firestarter" class="mobile-nav-link" role="menuitem" @click="closeMobileMenu"
                >Let's Burn</RouterLink
              >
              <RouterLink to="/votes" class="mobile-nav-link" role="menuitem" @click="closeMobileMenu"
                >Vote Explorer</RouterLink
              >
              <RouterLink
                to="/votes/leaderboard"
                class="mobile-nav-link"
                role="menuitem"
                @click="closeMobileMenu"
                >Leaderboard</RouterLink
              >
              <RouterLink to="/verify" class="mobile-nav-link" role="menuitem" @click="closeMobileMenu"
                >Verify Content</RouterLink
              >
              <RouterLink to="/admin" class="mobile-nav-link" role="menuitem" @click="closeMobileMenu"
                >Admin</RouterLink
              >
              <RouterLink to="/account" class="mobile-nav-link" role="menuitem" @click="closeMobileMenu"
                >Account</RouterLink
              >
              <RouterLink to="/about" class="mobile-nav-link" role="menuitem" @click="closeMobileMenu"
                >About</RouterLink
              >
            </div>
          </div>
        </nav>
      </ErrorBoundary>

      <!-- Main content -->
      <ErrorBoundary>
        <main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" role="main" tabindex="-1">
          <div class="text-center mb-8">
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              GalaChain Burn and Vote dApp
            </h1>
            <p class="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl mx-auto">
              Let's burn! Browse subfires, submit content, and burn $GALA to upvote submissions you like.
            </p>
          </div>

          <div
            v-if="!metamaskSupport"
            class="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6"
            role="alert"
            aria-labelledby="metamask-warning-title"
            aria-describedby="metamask-warning-description"
          >
            <div class="flex items-start gap-3">
              <svg
                class="h-5 w-5 text-warning-500 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 id="metamask-warning-title" class="text-warning-800 font-medium mb-2">
                  MetaMask Required
                </h3>
                <div id="metamask-warning-description">
                  <p class="text-warning-700 text-sm mb-2">
                    This application uses the GalaConnect API via MetaMask to sign transactions and interact
                    with GalaChain.
                  </p>
                  <p class="text-warning-700 text-sm">
                    Visit this site using a browser with the MetaMask web extension installed to use the
                    application.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!isConnected" class="text-center py-8">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md mx-auto">
              <h3 id="wallet-connect-title" class="text-lg font-semibold text-gray-900 mb-4">
                Connect Your Wallet
              </h3>
              <p id="wallet-connect-description" class="text-gray-600 text-sm mb-6">
                Connect your MetaMask wallet to start burning $GALA and voting on content.
              </p>
              <button
                class="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors font-medium"
                :disabled="isConnecting"
                :aria-busy="isConnecting"
                aria-describedby="wallet-connect-description"
                @click="connectWallet"
              >
                <span v-if="isConnecting">Connecting...</span>
                <span v-else>Connect Wallet</span>
              </button>
            </div>
          </div>

          <div v-else>
            <div
              class="bg-success-50 border border-success-200 rounded-lg p-4 mb-6"
              role="status"
              aria-labelledby="wallet-connected-title"
              aria-describedby="wallet-connected-address"
            >
              <div class="flex items-center gap-3">
                <svg
                  class="h-5 w-5 text-success-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p id="wallet-connected-title" class="text-success-800 font-medium">Wallet Connected</p>
                  <p
                    id="wallet-connected-address"
                    class="text-success-700 text-sm font-mono"
                    :title="walletAddress"
                  >
                    {{ walletAddress }}
                  </p>
                </div>
              </div>
            </div>
            <RouterView />
          </div>
        </main>
      </ErrorBoundary>
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import ErrorBoundary from "@/components/ErrorBoundary.vue";
import { generateId, useAccessibility } from "@/composables/useAccessibility";
import { useUserStore } from "@/stores";
import { computed, nextTick, onMounted, ref } from "vue";

const userStore = useUserStore();
const { announce, setupKeyboardNavigation, manageFocus } = useAccessibility();

// Mobile menu state
const mobileMenuOpen = ref(false);
const mobileMenuId = generateId("mobile-menu");
const isConnecting = ref(false);

// Computed properties from store
const metamaskSupport = computed(() => {
  // Check for MetaMask availability directly
  return typeof window !== "undefined" && !!window.ethereum;
});
const isConnected = computed(() => userStore.isConnected);
const walletAddress = computed(() => userStore.address);

// Mobile menu functions
function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;

  if (mobileMenuOpen.value) {
    nextTick(() => {
      // Focus first menu item when opening
      const firstMenuItem = document.querySelector(`#${mobileMenuId} [role="menuitem"]`) as HTMLElement;
      if (firstMenuItem) {
        manageFocus(firstMenuItem);
      }
    });
    announce("Mobile menu opened", "polite");
  } else {
    announce("Mobile menu closed", "polite");
  }
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
  announce("Mobile menu closed", "polite");
}

function handleMobileMenuKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeMobileMenu();
  }
}

async function connectWallet() {
  isConnecting.value = true;
  announce("Connecting to wallet...", "polite");

  try {
    const success = await userStore.connectWallet();
    if (!success && userStore.error) {
      console.error("Connection failed:", userStore.error);
      announce(`Wallet connection failed: ${userStore.error}`, "assertive");
    } else if (success) {
      announce("Wallet connected successfully", "polite");
    }

    // If connected but not registered, attempt registration
    if (userStore.isConnected && !userStore.isRegistered) {
      announce("Registering user...", "polite");
      await userStore.registerUser();
    }
  } finally {
    isConnecting.value = false;
  }
}

onMounted(async () => {
  // Initialize MetaMask support check
  await userStore.initializeMetamask();

  // Set up keyboard navigation for mobile menu
  const mobileMenuElement = document.getElementById(mobileMenuId);
  if (mobileMenuElement) {
    setupKeyboardNavigation(mobileMenuElement, {
      arrowKeys: true,
      enterSpace: true,
      escape: true
    });
  }

  // Close mobile menu on outside click
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const mobileMenuButton = target.closest('[aria-controls="' + mobileMenuId + '"]');
    const mobileMenu = target.closest("#" + mobileMenuId);

    if (!mobileMenuButton && !mobileMenu && mobileMenuOpen.value) {
      closeMobileMenu();
    }
  });
});
</script>

<style scoped>
/* Navigation link styles with enhanced focus indicators */
.nav-link {
  @apply px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-primary-700 hover:text-white transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600;
}

.nav-link.router-link-active {
  @apply bg-primary-800 text-white font-semibold;
}

.mobile-nav-link {
  @apply block px-3 py-2 text-base font-medium text-white rounded-md hover:bg-primary-700 hover:text-white transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600;
}

.mobile-nav-link.router-link-active {
  @apply bg-primary-800 text-white font-semibold;
}

/* High contrast mode support */
.high-contrast .nav-link,
.high-contrast .mobile-nav-link {
  border: 2px solid transparent;
}

.high-contrast .nav-link:focus,
.high-contrast .mobile-nav-link:focus {
  border-color: #ffffff;
  background-color: #000000;
}

.high-contrast .nav-link.router-link-active,
.high-contrast .mobile-nav-link.router-link-active {
  background-color: #000000;
  border-color: #ffffff;
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

/* Smooth mobile menu transition - respects reduced motion */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .mobile-menu-enter-active,
  .mobile-menu-leave-active,
  .nav-link,
  .mobile-nav-link,
  button {
    transition: none;
  }

  .mobile-menu-enter-from,
  .mobile-menu-leave-to {
    transform: none;
  }
}

/* Focus management */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only.focus:focus,
.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Skip links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 1000;
  border-radius: 4px;
}

.skip-link:focus {
  top: 6px;
}

/* Ensure sufficient color contrast for interactive elements */
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:disabled:hover {
  background-color: inherit;
}

/* Focus indicators for all interactive elements */
a:focus,
button:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Windows High Contrast Mode support */
@media (prefers-contrast: high) {
  .nav-link,
  .mobile-nav-link,
  button {
    border: 1px solid;
  }

  .nav-link:hover,
  .mobile-nav-link:hover,
  button:hover {
    background-color: Highlight;
    color: HighlightText;
  }

  .nav-link:focus,
  .mobile-nav-link:focus,
  button:focus {
    outline: 3px solid Highlight;
    outline-offset: 2px;
  }
}
</style>
