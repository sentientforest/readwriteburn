<template>
  <div class="fire-starter">
    <h2>Fire Starter</h2>
    <div class="burn-notice">
      <p>🔥 Creating a new fire requires burning 100 $GALA</p>
    </div>

    <form class="fire-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="name">Fire Name</label>
        <input id="name" v-model="formData.name" type="text" required placeholder="Give your fire a name" />
      </div>

      <div class="form-group">
        <label for="slug">URL Slug</label>
        <input
          id="slug"
          v-model="formData.slug"
          type="text"
          required
          placeholder="unique-url-friendly-name"
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          title="Lowercase letters, numbers, and hyphens only"
        />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          v-model="formData.description"
          required
          placeholder="What's this fire about?"
          rows="4"
        ></textarea>
      </div>

      <div class="form-actions">
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? "Creating..." : "Start Fire 🔥" }}
        </button>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const formData = ref({
  name: "",
  slug: "",
  description: ""
});

const isSubmitting = ref(false);
const error = ref("");

const apiBase = import.meta.env.VITE_PROJECT_API;

async function handleSubmit() {
  isSubmitting.value = true;
  error.value = "";

  try {
    const response = await fetch(`${apiBase}/api/subfires`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData.value)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create fire");
    }

    const newFire = await response.json();
    router.push(`/subfires/${newFire.slug}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "An unexpected error occurred";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.fire-starter {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.burn-notice {
  background: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
}

.fire-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #333;
}

input,
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

textarea {
  resize: vertical;
}

.form-actions {
  margin-top: 2rem;
}

button {
  width: 100%;
  padding: 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background: #c82333;
}

button:disabled {
  background: #e9ecef;
  cursor: not-allowed;
}

.error-message {
  margin-top: 1rem;
  color: #dc3545;
  text-align: center;
}
</style>
]]>
