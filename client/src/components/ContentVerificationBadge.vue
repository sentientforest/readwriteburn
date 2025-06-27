<template>
  <div class="verification-badge">
    <div class="flex items-center gap-2">
      <!-- Verification Status Badge -->
      <span
        :class="[
          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
          verified
            ? 'bg-success-100 text-success-800 border border-success-200'
            : 'bg-warning-100 text-warning-800 border border-warning-200'
        ]"
      >
        <CheckCircleIcon v-if="verified" class="h-3 w-3" />
        <ExclamationTriangleIcon v-else class="h-3 w-3" />
        {{ verified ? 'Verified' : 'Unverified' }}
      </span>

      <!-- Moderation Status Badge -->
      <span
        v-if="moderationStatus && moderationStatus !== 'active'"
        :class="[
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
          getModerationStatusClass(moderationStatus)
        ]"
      >
        {{ formatModerationStatus(moderationStatus) }}
      </span>

      <!-- Verify Button -->
      <button
        v-if="showVerifyButton && !verified"
        @click="handleVerify"
        :disabled="verifying"
        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
      >
        <ArrowPathIcon v-if="verifying" class="h-3 w-3 animate-spin" />
        <ShieldCheckIcon v-else class="h-3 w-3" />
        {{ verifying ? 'Verifying...' : 'Verify' }}
      </button>
    </div>

    <!-- Verification Details (expandable) -->
    <div v-if="showDetails && verificationData" class="mt-2 text-xs text-gray-600">
      <div class="space-y-1">
        <div>
          <span class="font-medium">Content Hash:</span>
          <code class="ml-1 font-mono text-xs">{{ verificationData.currentHash?.slice(0, 16) }}...</code>
        </div>
        <div v-if="verificationData.sqliteHash !== verificationData.currentHash">
          <span class="font-medium text-warning-600">Hash Mismatch:</span>
          <div class="text-xs text-gray-500">Content may have been modified</div>
        </div>
        <div v-if="verificationData.lastModified">
          <span class="font-medium">Last Modified:</span>
          <span class="ml-1">{{ formatDate(verificationData.lastModified) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ShieldCheckIcon, 
  ArrowPathIcon 
} from '@heroicons/vue/24/outline';
import { ref, computed, onMounted, watch } from 'vue';
import { useSubmissionsStore } from '@/stores';
import type { ContentVerificationResponse } from '@/types/api';

interface Props {
  submissionId: number;
  initialVerified?: boolean;
  initialModerationStatus?: string;
  showVerifyButton?: boolean;
  showDetails?: boolean;
  autoVerify?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  initialVerified: true,
  showVerifyButton: true,
  showDetails: false,
  autoVerify: false
});

const emit = defineEmits<{
  verified: [result: ContentVerificationResponse];
  verificationFailed: [error: string];
}>();

const submissionsStore = useSubmissionsStore();

// Local state
const verified = ref(props.initialVerified);
const moderationStatus = ref(props.initialModerationStatus || 'active');
const verifying = ref(false);
const verificationData = ref<ContentVerificationResponse | null>(null);

// Get verification data from store if available
const storedVerification = computed(() => 
  submissionsStore.getVerificationStatus(props.submissionId)
);

// Update local state when store data changes
watch(storedVerification, (newVerification) => {
  if (newVerification) {
    verified.value = newVerification.verified;
    moderationStatus.value = newVerification.moderationStatus;
    verificationData.value = newVerification;
  }
});

async function handleVerify() {
  if (verifying.value) return;

  verifying.value = true;
  
  try {
    const result = await submissionsStore.verifyContent(props.submissionId);
    
    verified.value = result.verified;
    moderationStatus.value = result.moderationStatus;
    verificationData.value = result;
    
    emit('verified', result);
    
    if (!result.verified) {
      console.warn('Content verification failed:', result);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Verification failed';
    emit('verificationFailed', errorMessage);
    console.error('Verification error:', error);
  } finally {
    verifying.value = false;
  }
}

function getModerationStatusClass(status: string): string {
  switch (status) {
    case 'flagged':
      return 'bg-warning-100 text-warning-800 border border-warning-200';
    case 'removed':
      return 'bg-error-100 text-error-800 border border-error-200';
    case 'modified':
      return 'bg-primary-100 text-primary-800 border border-primary-200';
    case 'restored':
      return 'bg-success-100 text-success-800 border border-success-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
}

function formatModerationStatus(status: string): string {
  switch (status) {
    case 'flagged':
      return 'Flagged';
    case 'removed':
      return 'Removed';
    case 'modified':
      return 'Modified';
    case 'restored':
      return 'Restored';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

// Auto-verify on mount if requested
onMounted(async () => {
  if (props.autoVerify && !storedVerification.value) {
    await handleVerify();
  }
});
</script>

<style scoped>
.verification-badge {
  @apply inline-block;
}

code {
  @apply bg-gray-100 px-1 py-0.5 rounded text-xs;
}
</style>