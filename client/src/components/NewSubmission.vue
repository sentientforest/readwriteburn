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

      <div class="form-actions">
        <button type="submit" :disabled="isSubmitting || !props.walletAddress">
          {{ isSubmitting ? "Submitting..." : "Submit" }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { MetamaskConnectClient } from "@gala-chain/connect";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import type { SubmissionDto } from "../types";

const apiBase = import.meta.env.VITE_PROJECT_API;

const props = defineProps<{
  walletAddress: string;
  metamaskClient: MetamaskConnectClient;
}>();

const route = useRoute();
const router = useRouter();
const subfireSlug = route.params.slug as string;

const form = ref<SubmissionDto>({
  name: "",
  description: "",
  url: "",
  subfire: subfireSlug,
  contributor: props.walletAddress
});

const isSubmitting = ref(false);
const error = ref("");
const success = ref("");

async function submitForm() {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  error.value = "";
  success.value = "";

  try {
    const response = await fetch(`${apiBase}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form.value)
    });

    if (!response.ok) {
      throw new Error("Failed to create submission");
    }

    success.value = "Submission created successfully!";
    // Reset form
    form.value = {
      name: "",
      description: "",
      url: "",
      subfire: subfireSlug,
      contributor: props.walletAddress
    };

    // Redirect back to subfire page
    router.push(`/subfires/${subfireSlug}`);
  } catch (err: unknown) {
    console.error("Error creating submission:", err);
    error.value = "Failed to create submission. Please try again.";
  } finally {
    isSubmitting.value = false;
  }
}
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
