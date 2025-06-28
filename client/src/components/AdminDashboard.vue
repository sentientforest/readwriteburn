<template>
  <div class="admin-dashboard min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p class="text-gray-600 text-sm sm:text-base">
          System monitoring, user management, and platform administration
        </p>
      </div>

      <!-- Quick Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
            <div class="ml-3 w-0 flex-1">
              <dt class="text-sm font-medium text-gray-500 truncate">Total Fires</dt>
              <dd class="text-2xl font-semibold text-gray-900">{{ systemStats.totalFires }}</dd>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="ml-3 w-0 flex-1">
              <dt class="text-sm font-medium text-gray-500 truncate">Total Submissions</dt>
              <dd class="text-2xl font-semibold text-gray-900">{{ systemStats.totalSubmissions }}</dd>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-gala-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div class="ml-3 w-0 flex-1">
              <dt class="text-sm font-medium text-gray-500 truncate">Total Votes</dt>
              <dd class="text-2xl font-semibold text-gray-900">{{ systemStats.totalVotes }}</dd>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div class="ml-3 w-0 flex-1">
              <dt class="text-sm font-medium text-gray-500 truncate">GALA Burned</dt>
              <dd class="text-2xl font-semibold text-gray-900">{{ formatGalaAmount(systemStats.totalGalaBurned) }}</dd>
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Tabs -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex overflow-x-auto">
            <button
              v-for="tab in dashboardTabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- System Health Tab -->
          <div v-if="activeTab === 'health'" class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Server Health -->
              <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Server Health</h3>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">API Status</span>
                    <span :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      serverHealth.apiStatus === 'healthy' 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-error-100 text-error-800'
                    ]">
                      {{ serverHealth.apiStatus }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Database</span>
                    <span :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      serverHealth.databaseStatus === 'connected' 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-error-100 text-error-800'
                    ]">
                      {{ serverHealth.databaseStatus }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Uptime</span>
                    <span class="text-sm font-medium text-gray-900">{{ serverHealth.uptime }}</span>
                  </div>
                </div>
              </div>

              <!-- GalaChain Health -->
              <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">GalaChain Status</h3>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Network</span>
                    <span :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      chainHealth.networkStatus === 'connected' 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-error-100 text-error-800'
                    ]">
                      {{ chainHealth.networkStatus }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Last Block</span>
                    <span class="text-sm font-medium text-gray-900">{{ chainHealth.lastBlock }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Response Time</span>
                    <span class="text-sm font-medium text-gray-900">{{ chainHealth.responseTime }}ms</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Activity -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent System Activity</h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="space-y-2">
                  <div v-for="activity in recentActivity" :key="activity.id" class="flex items-center text-sm">
                    <span class="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                    <span class="text-gray-600">{{ activity.timestamp }}</span>
                    <span class="mx-2 text-gray-400">•</span>
                    <span class="text-gray-900">{{ activity.message }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- User Management Tab -->
          <div v-if="activeTab === 'users'" class="space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 class="text-lg font-semibold text-gray-900">User Management</h3>
              <div class="flex items-center gap-3">
                <input
                  v-model="userSearchQuery"
                  type="text"
                  placeholder="Search users..."
                  class="block w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <button
                  @click="refreshUsers"
                  :disabled="loadingUsers"
                  class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="user in filteredUsers" :key="user.address" class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="h-10 w-10 flex-shrink-0">
                            <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span class="text-sm font-medium text-gray-700">
                                {{ user.address.slice(0, 2).toUpperCase() }}
                              </span>
                            </div>
                          </div>
                          <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900 font-mono">
                              {{ formatAddress(user.address) }}
                            </div>
                            <div class="text-sm text-gray-500">
                              {{ user.role || 'User' }}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span :class="[
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          user.isActive 
                            ? 'bg-success-100 text-success-800' 
                            : 'bg-gray-100 text-gray-800'
                        ]">
                          {{ user.isActive ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ user.lastActivity || 'Never' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="text-primary-600 hover:text-primary-900 mr-3">View</button>
                        <button class="text-warning-600 hover:text-warning-900 mr-3">Edit</button>
                        <button class="text-error-600 hover:text-error-900">Ban</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Content Management Tab -->
          <div v-if="activeTab === 'content'" class="space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 class="text-lg font-semibold text-gray-900">Content Overview</h3>
              <RouterLink 
                to="/admin/moderation" 
                class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
              >
                Full Moderation Panel
              </RouterLink>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div class="bg-warning-50 border border-warning-200 rounded-lg p-4">
                <div class="flex items-center">
                  <svg class="h-6 w-6 text-warning-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 class="text-lg font-semibold text-warning-900">{{ contentStats.flagged }}</h4>
                    <p class="text-sm text-warning-700">Flagged Content</p>
                  </div>
                </div>
              </div>

              <div class="bg-error-50 border border-error-200 rounded-lg p-4">
                <div class="flex items-center">
                  <svg class="h-6 w-6 text-error-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                  <div>
                    <h4 class="text-lg font-semibold text-error-900">{{ contentStats.removed }}</h4>
                    <p class="text-sm text-error-700">Removed Content</p>
                  </div>
                </div>
              </div>

              <div class="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div class="flex items-center">
                  <svg class="h-6 w-6 text-primary-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div>
                    <h4 class="text-lg font-semibold text-primary-900">{{ contentStats.modified }}</h4>
                    <p class="text-sm text-primary-700">Modified Content</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuration Tab -->
          <div v-if="activeTab === 'config'" class="space-y-6">
            <h3 class="text-lg font-semibold text-gray-900">System Configuration</h3>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="text-md font-semibold text-gray-900 mb-4">Server Settings</h4>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Rate Limiting</span>
                    <span class="text-sm font-medium text-gray-900">100 req/min</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Max Upload Size</span>
                    <span class="text-sm font-medium text-gray-900">10MB</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Session Timeout</span>
                    <span class="text-sm font-medium text-gray-900">24 hours</span>
                  </div>
                </div>
              </div>

              <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="text-md font-semibold text-gray-900 mb-4">Chain Settings</h4>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Vote Fee</span>
                    <span class="text-sm font-medium text-gray-900">1 GALA</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Fire Creation Fee</span>
                    <span class="text-sm font-medium text-gray-900">10 GALA</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Network</span>
                    <span class="text-sm font-medium text-gray-900">Development</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFiresStore, useSubmissionsStore, useVotesStore } from '@/stores';

const firesStore = useFiresStore();
const submissionsStore = useSubmissionsStore();
const votesStore = useVotesStore();

// Tab management
const activeTab = ref('health');
const dashboardTabs = [
  { id: 'health', name: 'System Health' },
  { id: 'users', name: 'User Management' },
  { id: 'content', name: 'Content Overview' },
  { id: 'config', name: 'Configuration' }
];

// System stats
const systemStats = ref({
  totalFires: 0,
  totalSubmissions: 0,
  totalVotes: 0,
  totalGalaBurned: 0
});

// Health monitoring
const serverHealth = ref({
  apiStatus: 'healthy' as 'healthy' | 'unhealthy',
  databaseStatus: 'connected' as 'connected' | 'disconnected',
  uptime: '2d 14h 32m'
});

const chainHealth = ref({
  networkStatus: 'connected' as 'connected' | 'disconnected',
  lastBlock: '1,234,567',
  responseTime: 45
});

// Recent activity
const recentActivity = ref([
  { id: 1, timestamp: '2 min ago', message: 'New fire created: "Gaming Discussion"' },
  { id: 2, timestamp: '5 min ago', message: 'User banned for spam' },
  { id: 3, timestamp: '12 min ago', message: 'Content flagged for review' },
  { id: 4, timestamp: '23 min ago', message: 'Vote batch processed (245 votes)' },
  { id: 5, timestamp: '1 hour ago', message: 'System backup completed successfully' }
]);

// User management
const userSearchQuery = ref('');
const loadingUsers = ref(false);
const mockUsers = ref([
  { 
    address: '0x1234567890abcdef1234567890abcdef12345678',
    role: 'Admin',
    isActive: true,
    lastActivity: '2 min ago'
  },
  { 
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    role: 'User',
    isActive: true,
    lastActivity: '1 hour ago'
  },
  { 
    address: '0x567890abcdef1234567890abcdef1234567890ab',
    role: 'User',
    isActive: false,
    lastActivity: '2 days ago'
  }
]);

// Content stats
const contentStats = ref({
  flagged: 3,
  removed: 1,
  modified: 7
});

// Computed properties
const filteredUsers = computed(() => {
  if (!userSearchQuery.value) return mockUsers.value;
  return mockUsers.value.filter(user => 
    user.address.toLowerCase().includes(userSearchQuery.value.toLowerCase()) ||
    user.role.toLowerCase().includes(userSearchQuery.value.toLowerCase())
  );
});

// Methods
function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatGalaAmount(amount: number): string {
  return `${amount.toLocaleString()} GALA`;
}

async function refreshUsers() {
  loadingUsers.value = true;
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  loadingUsers.value = false;
}

async function loadSystemStats() {
  try {
    // Load data from stores
    await Promise.all([
      firesStore.fetchFires(),
      // Note: We'd need to add methods to fetch all submissions and votes
      // For now, using mock data
    ]);
    
    systemStats.value = {
      totalFires: firesStore.fires.length,
      totalSubmissions: submissionsStore.submissions.length,
      totalVotes: votesStore.votes.length,
      totalGalaBurned: votesStore.totalVoteAmount
    };
  } catch (error) {
    console.error('Error loading system stats:', error);
  }
}

async function checkSystemHealth() {
  try {
    // Check API health
    const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/health`);
    serverHealth.value.apiStatus = response.ok ? 'healthy' : 'unhealthy';
  } catch (error) {
    serverHealth.value.apiStatus = 'unhealthy';
    console.error('Health check failed:', error);
  }
}

// Watch for tab changes to load relevant data
watch(activeTab, (newTab) => {
  switch (newTab) {
    case 'health':
      checkSystemHealth();
      break;
    case 'users':
      // Load user data if needed
      break;
    case 'content':
      // Load content stats if needed
      break;
  }
});

onMounted(async () => {
  await loadSystemStats();
  await checkSystemHealth();
  
  // Set up periodic health checks
  setInterval(checkSystemHealth, 30000); // Check every 30 seconds
});
</script>

<style scoped>
/* Ensure table is scrollable on mobile */
@media (max-width: 768px) {
  .overflow-x-auto {
    scrollbar-width: thin;
  }
  
  table {
    min-width: 600px;
  }
}

/* Responsive tabs */
@media (max-width: 640px) {
  .tab-button {
    font-size: 0.875rem;
    padding: 0.75rem 1rem;
  }
}
</style>