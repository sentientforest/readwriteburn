<template>
  <div class="list-by-votes">
    <div v-if="loading">
      <p><i>Fetching current pizza submissions...</i></p>
    </div>
    <div v-else-if="loadError">
      <p><i>Failed to fetch the pizza submissions from the server. Please try again later.</i></p>
    </div>
    <div v-else class="vote-list">
      <p>Burn $GALA to vote for your favorite submission(s). 
        Every 1 $GALA burned adds 1 vote. Burn more to vote more.
      </p>
      <div v-for="item in voteList" :key="item.id" class="list-item">
        <h2>{{ item.name }}</h2>
        <p>Total votes: {{ item.votes ?? 0 }}</p>
        <p>{{ item.summary }}</p>
        <p>{{ item.description }}</p>
        <div class="burn-form">
          <div class="input-group">
            <input 
              type="number" 
              v-model="item.userVoteQty" 
              :min="0"
              step="1"
              placeholder="Burn $GALA to Vote"
              :disabled="isProcessing"
            />
            <span class="currency">GALA</span>
          </div>
          <small class="fee-notice">Network fee: 1 GALA</small>

          <button 
            @click="submitVote(item)" 
            :disabled="!item.userVoteQty || isProcessing"
          >
            {{ isProcessing ? 'Processing...' : 'Burn Tokens' }}
          </button>

          <p v-if="submitError" class="error">{{ error }}</p>
          <p v-if="success" class="success">{{ success }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, ref, onMounted } from "vue";
import type { MetamaskConnectClient } from "@gala-chain/connect";

import {
  BurnGalaDto,
  BurnAndVoteDto,
  PizzaDisplay,
  pizzaSummary
} from "../types";

import BigNumber from "bignumber.js";

const apiBase = import.meta.env.VITE_PROJECT_API;
const burnCostVote = ref(new BigNumber(import.meta.env.VITE_BURN_COST_VOTE ?? 1));
const userEnteredBurnQtyForVote = ref<number | null>(null);

const selectedPizza = ref({});

const props = defineProps<{
  walletAddress: string,
  metamaskClient: MetamaskConnectClient
}>();

const voteList = ref([]);

const loading = ref(false);
const isProcessing = ref(false);
const loadError = ref(false);
const submitError = ref("");
const success = ref("");

async function fetchVoteList() {
  loading.value = true;
  loadError.value = false
  
  await fetch(`${apiBase}/pizzas`)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to fetch pizza list for voting`);

      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error(`Unexpected response format - ${data}`)
      }

      const displayList = data.map((elem) => {
        const summary = pizzaSummary(elem);

        const { id, name, contributor, description, votes } = elem;
        const userVoteQty = null;
        
        return {
          id, name, contributor, description, summary, votes, userVoteQty
        };
      });

      console.log(`formatted display list`);
      console.log(displayList);

      voteList.value = displayList;
      loading.value = false;
    })
    .catch((e) => {
      loading.value = false;
      loadError.value = true;
    });
}

onMounted(async () => {
  await fetchVoteList();
});

async function confirmBurn(fixedBurnAmount: string) {  
  const burnTokensDto = {
    owner: props.walletAddress,
    tokenInstances: [{
      quantity: fixedBurnAmount,
      tokenInstanceKey: {
        collection: "GALA",
        category: "Unit",
        type: "none",
        additionalKey: "none",
        instance: "0"
      }
    }],
    uniqueKey: `january-2025-event-${import.meta.env.VITE_PROJECT_ID}-${Date.now()}`
  }

  const signedBurnDto = await props.metamaskClient.sign("BurnTokens", burnTokensDto)
    .catch(() => undefined);
  
  return signedBurnDto;
}

async function submitVote(item) {
  console.log("Submitting vote...");
  console.log(item);

  const userVoteQty = item.userVoteQty;
  const pizzaId = item.id;

  console.log(userVoteQty);
  console.log(pizzaId);

  if (!userVoteQty || userVoteQty < 1 || !props.walletAddress) return;
  
  const dto = await confirmBurn(new BigNumber(userVoteQty).toFixed());

  submitError.value = "";
  success.value = "";
  isProcessing.value = true;

  try {
    const response = await fetch(`${apiBase}/pizzas/${pizzaId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto)
    });

    await fetchVoteList();
  } catch (err) {
    console.error(`Error submitting vote: ${err}`, err);
    submitError.value = err instanceof Error ? err.message : "Failed to submit vote";
  } finally {
    isProcessing.value = false;
  }
}
</script>

<style>

</style>