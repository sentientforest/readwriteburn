<template>
  <form class="quick-reply-form space-y-3" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label for="reply-title" class="block text-sm font-medium text-gray-700 mb-1"> Reply Title </label>
      <input
        id="reply-title"
        v-model="formData.name"
        type="text"
        required
        :disabled="isSubmitting"
        placeholder="Enter a title for your reply..."
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
    </div>

    <div class="form-group">
      <label for="reply-content" class="block text-sm font-medium text-gray-700 mb-1"> Reply Content </label>
      <textarea
        id="reply-content"
        v-model="formData.description"
        rows="3"
        required
        :disabled="isSubmitting"
        placeholder="Write your reply..."
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      ></textarea>
    </div>

    <div class="form-group">
      <label for="reply-url" class="block text-sm font-medium text-gray-700 mb-1">
        Source URL (Optional)
      </label>
      <input
        id="reply-url"
        v-model="formData.url"
        type="url"
        :disabled="isSubmitting"
        placeholder="https://example.com/source"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
    </div>

    <!-- Live Hash Preview -->
    <div v-if="liveHash" class="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2">
        <ShieldCheckIcon class="h-4 w-4 text-green-600" />
        <span class="text-sm font-medium text-gray-700">Content Hash Preview</span>
      </div>
      <div class="space-y-1">
        <div class="text-xs text-gray-600">
          <span class="font-medium">Algorithm:</span> {{ liveHash.algorithm }}
        </div>
        <div class="text-xs text-gray-600">
          <span class="font-medium">Timestamp:</span> {{ new Date(liveHash.timestamp).toLocaleString() }}
        </div>
        <div class="text-xs text-gray-600 break-all">
          <span class="font-medium">Hash:</span> {{ liveHash.hash }}
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex items-center gap-3 pt-2">
      <button
        type="submit"
        :disabled="isSubmitting || !isFormValid"
        class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
      >
        <PaperAirplaneIcon v-if="!isSubmitting" class="h-4 w-4" />
        <ArrowPathIcon v-else class="h-4 w-4 animate-spin" />
        {{ isSubmitting ? "Posting..." : "Post Reply" }}
      </button>

      <button
        type="button"
        class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message bg-error-50 border border-error-200 rounded-lg p-3">
      <div class="flex items-center gap-2">
        <ExclamationTriangleIcon class="h-4 w-4 text-error-500" />
        <span class="text-sm text-error-700">{{ error }}</span>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { useSubmissionsStore, useUserStore } from "@/stores";
import type { ContentHashResult } from "@/types/api";
import { generateContentHash } from "@/utils/contentHash";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon
} from "@heroicons/vue/24/outline";
import { computed, getCurrentInstance, ref, watch } from "vue";

interface Props {
  parentSubmissionId: string;
  fireSlug: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "reply-posted": [];
  cancel: [];
}>();

const userStore = useUserStore();
const submissionsStore = useSubmissionsStore();

// State
const formData = ref({
  name: "",
  description: "",
  url: ""
});

const isSubmitting = ref(false);
const error = ref("");
const liveHash = ref<ContentHashResult | null>(null);

// Computed properties
const isFormValid = computed(() => {
  return formData.value.name.trim() !== "" && formData.value.description.trim() !== "";
});

// Methods
async function updateLiveHash() {
  if (!isFormValid.value) {
    liveHash.value = null;
    return;
  }

  try {
    const hashResult = await generateContentHash({
      title: formData.value.name,
      description: formData.value.description,
      url: formData.value.url || undefined,
      timestamp: Date.now()
    });
    liveHash.value = hashResult;
  } catch (err) {
    console.error("Error generating live hash:", err);
    liveHash.value = null;
  }
}

async function handleSubmit() {
  if (!userStore.isAuthenticated || !isFormValid.value || !userStore.metamaskClient) {
    error.value = "Please fill in all required fields and connect your wallet";
    return;
  }

  isSubmitting.value = true;
  error.value = "";

  try {
    // Import the required types
    const { ContributeSubmissionAuthorizationDto, Fire, SubmissionDto } = await import("../types/fire");
    const { randomUniqueKey } = await import("../utils");

    // Generate a unique slug for the reply submission
    const replySlug = `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create SubmissionDto with structure matching chaincode
    // This is a reply to a submission, so entryParentKey is the parent submission's chain key
    const submissionDto = new SubmissionDto({
      slug: replySlug,
      uniqueKey: randomUniqueKey(),
      entryParentKey: props.parentSubmissionId, // Parent submission chain key for threading
      fire: props.fireSlug, // Target fire slug
      name: formData.value.name.trim(),
      contributor: userStore.address,
      description: formData.value.description.trim() || "",
      url: formData.value.url.trim() || ""
    });

    console.log("Signing reply submission:", submissionDto);

    // Sign the submission DTO
    const signedSubmission = await userStore.metamaskClient.signSubmission(submissionDto);

    // Create authorization DTO (no fee for now)
    const authDto = new ContributeSubmissionAuthorizationDto({
      submission: signedSubmission
    });

    console.log("Sending reply authorization:", authDto);

    const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(authDto)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create reply");
    }

    // Reset form
    formData.value = {
      name: "",
      description: "",
      url: ""
    };

    emit("reply-posted");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to post reply";
    console.error("Reply submission error:", err);
  } finally {
    isSubmitting.value = false;
  }
}

// Watch for form changes to update live hash
watch(
  () => [formData.value.name, formData.value.description, formData.value.url],
  () => {
    updateLiveHash();
  },
  { deep: true }
);
</script>

<style scoped>
.quick-reply-form {
  @apply bg-gray-50 border border-gray-200 rounded-lg p-4;
}

.form-group {
  @apply space-y-1;
}
</style>
