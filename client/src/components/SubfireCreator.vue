<template>
  <div class="subfire-creator max-w-2xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Create Subfire</h1>
      <p class="text-gray-600 mt-2">
        Create a new subfire under {{ parentFire?.name || 'Unknown Fire' }}
      </p>
    </div>

    <!-- Parent Fire Context -->
    <div v-if="parentFire" class="bg-gray-50 rounded-lg p-4 mb-6">
      <div class="flex items-center gap-3">
        <FolderIcon class="h-5 w-5 text-primary-500" />
        <div>
          <h3 class="font-medium text-gray-900">Parent Fire</h3>
          <p class="text-sm text-gray-600">{{ parentFire.name }}</p>
        </div>
      </div>
    </div>

    <form class="subfire-form bg-white rounded-lg shadow-sm border border-gray-200 p-6" @submit.prevent="handleSubmit">
      <div class="space-y-6">
        <!-- Basic Information -->
        <div class="form-section">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                Subfire Name
              </label>
              <input 
                id="name"
                v-model="formData.name" 
                type="text" 
                required 
                :disabled="isSubmitting"
                placeholder="Enter subfire name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div class="form-group">
              <label for="slug" class="block text-sm font-medium text-gray-700 mb-1">
                URL Slug
              </label>
              <input
                id="slug"
                v-model="formData.slug"
                type="text"
                required
                :disabled="isSubmitting"
                placeholder="unique-url-friendly-name"
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                title="Lowercase letters, numbers, and hyphens only"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              v-model="formData.description"
              rows="3"
              :disabled="isSubmitting"
              placeholder="Describe what this subfire is about..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            ></textarea>
          </div>
        </div>

        <!-- Hierarchy Information -->
        <div class="form-section">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Hierarchy</h3>
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <InformationCircleIcon class="h-5 w-5 text-blue-500 mt-0.5" />
              <div class="text-sm">
                <p class="font-medium text-blue-800">Subfire Structure</p>
                <p class="text-blue-700 mt-1">
                  This subfire will be created under <strong>{{ parentFire?.name }}</strong> and will inherit 
                  its permissions and moderation settings. You can create nested subfires up to any depth.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Permissions (Optional) -->
        <div class="form-section">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Additional Permissions (Optional)</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Additional Authorities
              </label>
              <div class="space-y-2">
                <div v-for="(authority, index) in formData.authorities" :key="`auth-${index}`" class="flex items-center gap-2">
                  <input
                    v-model="formData.authorities[index]"
                    type="text"
                    placeholder="eth|0x1234567890123456789012345678901234567890"
                    pattern="^eth\|0x[a-fA-F0-9]{40}$"
                    title="Format: eth|0x followed by 40 hex characters"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button 
                    type="button" 
                    @click="removeAuthority(index)"
                    class="px-3 py-2 text-sm bg-error-600 text-white rounded hover:bg-error-700"
                  >
                    Remove
                  </button>
                </div>
                <button 
                  type="button" 
                  @click="addAuthority"
                  class="px-3 py-2 text-sm bg-success-600 text-white rounded hover:bg-success-700"
                >
                  Add Authority
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Additional Moderators
              </label>
              <div class="space-y-2">
                <div v-for="(moderator, index) in formData.moderators" :key="`mod-${index}`" class="flex items-center gap-2">
                  <input
                    v-model="formData.moderators[index]"
                    type="text"
                    placeholder="eth|0x1234567890123456789012345678901234567890"
                    pattern="^eth\|0x[a-fA-F0-9]{40}$"
                    title="Format: eth|0x followed by 40 hex characters"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button 
                    type="button" 
                    @click="removeModerator(index)"
                    class="px-3 py-2 text-sm bg-error-600 text-white rounded hover:bg-error-700"
                  >
                    Remove
                  </button>
                </div>
                <button 
                  type="button" 
                  @click="addModerator"
                  class="px-3 py-2 text-sm bg-success-600 text-white rounded hover:bg-success-700"
                >
                  Add Moderator
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Fee Preview (if available) -->
        <div v-if="estimatedFees && estimatedFees.length > 0" class="form-section">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Transaction Fees</h3>
          
          <div class="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div v-for="fee in estimatedFees" :key="fee.feeCode" class="flex justify-between items-center">
              <span class="text-sm font-medium text-warning-800">{{ fee.feeCode }}:</span>
              <span class="text-sm font-bold text-warning-900">{{ formatFee(fee.quantity) }} GALA</span>
            </div>
            <div class="border-t border-warning-300 mt-2 pt-2 flex justify-between items-center">
              <span class="font-bold text-warning-800">Total:</span>
              <span class="font-bold text-warning-900">{{ formatFee(totalFee) }} GALA</span>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions flex items-center gap-3 pt-6 border-t border-gray-200">
          <button
            type="submit"
            :disabled="isSubmitting || showFeeConfirmation"
            class="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FolderPlusIcon v-if="!isSubmitting" class="h-4 w-4" />
            <ArrowPathIcon v-else class="h-4 w-4 animate-spin" />
            {{ isSubmitting ? "Creating..." : "Create Subfire" }}
          </button>
          
          <router-link 
            :to="`/f/${parentFireSlug}`"
            class="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cancel
          </router-link>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="error-message bg-error-50 border border-error-200 rounded-lg p-4">
          <div class="flex items-center gap-2">
            <ExclamationTriangleIcon class="h-5 w-5 text-error-500" />
            <span class="text-error-700">{{ error }}</span>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  FolderPlusIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline';
import { asValidUserRef } from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFiresStore, useUserStore } from '@/stores';
import { randomUniqueKey } from '../utils';

const route = useRoute();
const router = useRouter();
const firesStore = useFiresStore();
const userStore = useUserStore();

// Get parent fire slug from route
const parentFireSlug = route.params.slug as string;

// State
const formData = ref({
  name: "",
  slug: "",
  description: "",
  authorities: [] as string[],
  moderators: [] as string[]
});

const isSubmitting = ref(false);
const error = ref("");
const showFeeConfirmation = ref(false);
const estimatedFees = ref<Array<{ feeCode: string; quantity: BigNumber }>>([]);

// Computed properties
const parentFire = computed(() => {
  return firesStore.firesById.get(parentFireSlug) || null;
});

const totalFee = computed(() => {
  return estimatedFees.value.reduce((total, fee) => total.plus(fee.quantity), new BigNumber(0));
});

// Methods
function addAuthority() {
  formData.value.authorities.push("");
}

function removeAuthority(index: number) {
  formData.value.authorities.splice(index, 1);
}

function addModerator() {
  formData.value.moderators.push("");
}

function removeModerator(index: number) {
  formData.value.moderators.splice(index, 1);
}

function formatFee(amount: BigNumber): string {
  return amount.dividedBy(new BigNumber(10).pow(8)).toFixed(2);
}

async function handleSubmit() {
  if (!userStore.isAuthenticated || !userStore.metamaskClient) {
    error.value = "Please connect your wallet first";
    return;
  }

  isSubmitting.value = true;
  error.value = "";

  try {
    // Create subfire DTO
    const subfireDto = {
      entryParent: parentFireSlug, // This is the key for hierarchy
      slug: formData.value.slug,
      name: formData.value.name,
      starter: asValidUserRef(userStore.address),
      description: formData.value.description,
      authorities: formData.value.authorities.filter(auth => auth.trim() !== ""),
      moderators: formData.value.moderators.filter(mod => mod.trim() !== ""),
      uniqueKey: randomUniqueKey()
    };

    // Create the subfire using fires store
    const result = await firesStore.createFire(subfireDto, userStore.metamaskClient);
    
    console.log("Subfire created successfully:", result);
    
    // Navigate to the new subfire
    router.push(`/f/${formData.value.slug}`);

  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to create subfire";
    console.error("Subfire creation error:", err);
  } finally {
    isSubmitting.value = false;
  }
}

// Load initial data
onMounted(async () => {
  await firesStore.fetchFires();
  
  if (!parentFire.value) {
    error.value = "Parent fire not found";
  }
});
</script>

<style scoped>
.form-section {
  @apply space-y-4;
}

.form-group {
  @apply space-y-1;
}
</style>