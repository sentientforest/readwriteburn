<template>
  <div class="new-submission">
    <h2>New Submission</h2>
    <form class="submission-form" @submit.prevent="submitForm">
      <div class="form-group">
        <label for="name">Title</label>
        <input id="name" v-model="form.name" type="text" required :disabled="isSubmitting" />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" v-model="form.description" rows="4" :disabled="isSubmitting"></textarea>
      </div>

      <div class="form-group">
        <label for="url">URL (optional)</label>
        <input id="url" v-model="form.url" type="url" :disabled="isSubmitting" />
      </div>

      <!-- Reply Context -->
      <div v-if="replyToSubmission" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 class="text-sm font-medium text-blue-900 mb-2">Replying to:</h3>
        <div class="text-sm text-blue-800">
          <strong>{{ replyToSubmission.name }}</strong>
          <p class="text-blue-700 mt-1">{{ replyToSubmission.description }}</p>
        </div>
      </div>

      <!-- Content Hash Preview -->
      <div v-if="contentHash" class="bg-gray-50 rounded-lg p-4 mb-4">
        <h3 class="text-sm font-medium text-gray-900 mb-2">Content Hash Preview</h3>
        <div class="space-y-2 text-xs">
          <div>
            <span class="font-medium text-gray-700">Hash:</span>
            <code class="ml-1 font-mono bg-white px-1 py-0.5 rounded">{{ contentHash }}</code>
          </div>
          <div>
            <span class="font-medium text-gray-700">Timestamp:</span>
            <span class="ml-1">{{ formatTimestamp(contentTimestamp) }}</span>
          </div>
          <div class="text-gray-600">
            This hash will be stored on the blockchain to verify content integrity.
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" :disabled="isSubmitting || !userStore.address || !userStore.isConnected">
          {{ isSubmitting ? "Submitting..." : "Submit" }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ChainObject } from "@gala-chain/api";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { computed, getCurrentInstance, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useFiresStore } from "../stores/fires";
import { useUserStore } from "../stores/user";
import type { SubmissionCreateRequest, SubmissionResponse } from "../types/api";
import { ContributeSubmissionAuthorizationDto, Fire, SubmissionDto } from "../types/fire";
import { randomUniqueKey } from "../utils";

const apiBase = import.meta.env.VITE_PROJECT_API;

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const subfireSlug = route.params.slug as string;
const replyToId = route.query.replyTo as string | undefined;

// Access global metamaskClient
const instance = getCurrentInstance();
const metamaskClient = computed(() => instance?.appContext.config.globalProperties.$metamaskClient);

const fireKey = ChainObject.getCompositeKeyFromParts(Fire.INDEX_KEY, [subfireSlug]);

const form = ref<SubmissionCreateRequest>({
  name: "",
  description: "",
  url: "",
  fire: fireKey,
  contributor: userStore.address || "",
  entryParent: replyToId
});

const replyToSubmission = ref<SubmissionResponse | null>(null);

const isSubmitting = ref(false);
const error = ref("");
const success = ref("");
const contentTimestamp = ref(Date.now());

// Computed hash preview
const contentHash = computed(() => {
  if (!form.value.name.trim() && !form.value.description?.trim()) {
    return "";
  }

  try {
    const hashableContent = {
      title: form.value.name.trim(),
      description: form.value.description?.trim(),
      url: form.value.url?.trim() || "",
      timestamp: contentTimestamp.value
    };

    const contentString = JSON.stringify(hashableContent);
    const contentBytes = new TextEncoder().encode(contentString);
    const hashBytes = sha256(contentBytes);
    return `sha256:${bytesToHex(hashBytes)}`;
  } catch {
    return "";
  }
});

// Update contributor when wallet address changes
watch(
  () => userStore.address,
  (newAddress) => {
    if (newAddress) {
      form.value.contributor = newAddress;
    }
  }
);

// Update timestamp when content changes (debounced)
let timestampTimeout: any = null;
watch([() => form.value.name, () => form.value.description, () => form.value.url], () => {
  if (timestampTimeout) clearTimeout(timestampTimeout);
  timestampTimeout = setTimeout(() => {
    contentTimestamp.value = Date.now();
  }, 1000); // Update hash after 1 second of no changes
});

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

async function submitForm() {
  console.log("submitForm called", {
    isSubmitting: isSubmitting.value,
    address: userStore.address,
    hasMetamaskClient: !!metamaskClient.value,
    isConnected: userStore.isConnected
  });

  if (isSubmitting.value || !userStore.address || !metamaskClient.value) {
    console.log("Early return from submitForm", {
      isSubmitting: isSubmitting.value,
      noAddress: !userStore.address,
      noMetamaskClient: !metamaskClient.value
    });
    return;
  }

  isSubmitting.value = true;
  error.value = "";
  success.value = "";

  try {
    const fireSlug = subfireSlug;
    
    // Determine parent and parent type for new flat structure
    // If replying to a submission, parent is the submission slug and type is Submission.INDEX_KEY
    // If top-level submission, parent is the fire slug and type is Fire.INDEX_KEY
    const isReply = !!replyToId;
    const entryParent = isReply ? replyToId : fireSlug; // Parent slug (not composite key)
    const parentEntryType = isReply ? "RWBS" : "RWBF"; // Submission.INDEX_KEY or Fire.INDEX_KEY

    // Create SubmissionDto with new structure
    const submissionDto = new SubmissionDto({
      name: form.value.name,
      description: form.value.description || "",
      url: form.value.url || "",
      fire: fireSlug, // Just the fire slug, not composite key
      entryParent: entryParent, // Parent slug
      parentEntryType: parentEntryType, // Type of parent (Fire or Submission)
      contributor: userStore.address,
      uniqueKey: randomUniqueKey()
    });

    console.log("Signing submission:", submissionDto);

    // Sign the submission DTO
    const signedSubmission = await metamaskClient.value?.signSubmission(submissionDto);

    // Create authorization DTO (no fee for now)
    const authDto = new ContributeSubmissionAuthorizationDto({
      submission: signedSubmission
    });

    console.log("Sending submission authorization:", authDto);

    const response = await fetch(`${apiBase}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(authDto)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create submission");
    }

    success.value = "Submission created successfully!";
    // Reset form
    form.value = {
      name: "",
      description: "",
      url: "",
      fire: subfireSlug,
      contributor: userStore.address,
      entryParent: replyToId
    };

    // Redirect back to fire page
    router.push(`/f/${subfireSlug}`);
  } catch (err: unknown) {
    console.error("Error creating submission:", err);
    error.value = err instanceof Error ? err.message : "Failed to create submission. Please try again.";
  } finally {
    isSubmitting.value = false;
  }
}

// Fetch parent submission if replying
onMounted(async () => {
  if (replyToId) {
    try {
      const response = await fetch(`${apiBase}/api/submissions/${replyToId}`);
      if (response.ok) {
        replyToSubmission.value = await response.json();
      }
    } catch (error) {
      console.error("Error fetching parent submission:", error);
    }
  }
});
</script>

<style>
.submission-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
}

.form-actions {
  margin-top: 1rem;
}

.form-actions button {
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.form-actions button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #f44336;
  margin: 1rem 0;
}

.success {
  color: #4caf50;
  margin: 1rem 0;
}
</style>
