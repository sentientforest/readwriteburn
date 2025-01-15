<template>
  <div class="list-by-name">
    <div v-if="loading">
      <p><i>Fetching pizza menu options...</i></p>
    </div>
    <div v-else-if="error">
      <p><i>Failed to fetch the pizza menu from the server. Please try again later.</i></p>
    </div>
    <div class="pizza-selection-form" v-else>
      <h1>Customize Your Pizza</h1>
      
      <h2>Choose Your Crust</h2>
      <select v-model="selectedCrust">
        <option v-for="crust in pizzaMenu.crusts" :key="crust.id" :value="crust.id">
          {{ crust.name }} - {{ crust.description }}
        </option>
      </select>

      <h2>Choose Your Sauce</h2>
      <select v-model="selectedSauce">
        <option v-for="sauce in pizzaMenu.sauces" :key="sauce.id" :value="sauce.id">
          {{ sauce.name }} - {{ sauce.description }}
        </option>
      </select>

      <h2>Choose Your Toppings</h2>
      <div v-for="topping in pizzaMenu.toppings" :key="topping.id" class="topping-selector">
        <span>{{ topping.name }} - {{ topping.description }}</span>
        <div class="topping-controls">
          <button 
            @click="decrementTopping(topping.id)" 
            :disabled="selectedToppings[topping.id] === 0">
            -
          </button>
          <span>{{ selectedToppings[topping.id] }}</span>
          <button 
            @click="incrementTopping(topping.id)" 
            :disabled="selectedToppings[topping.id] === 3">
            +
          </button>
        </div>
      </div>

      <button @click="submitSelection">Submit</button>
    </div>
  </div>
</template>


<script setup lang="ts">
import { defineProps, ref, onMounted } from "vue";
import type { MetamaskConnectClient } from "@gala-chain/connect";

import { 
  AssociativeId, 
  AssociativeEntity, 
  SavePizzaSelectionDto, 
  PizzaSelectionResDto, 
  BurnGalaDto,
  BurnAndSavePizzaSelectionDto
} from "../types";

const apiBase = import.meta.env.VITE_PROJECT_API;

const pizzaMenu = ref({ crusts: [], sauces: [], toppings: [] });
const selectedCrust = ref(null);
const selectedSauce = ref(null);
const selectedToppings = ref({});

const props = defineProps<{
  walletAddress: string
  metamaskClient: MetamaskConnectClient
}>()

const loading = ref(false);
const error = ref(false);

async function confirmBurn() {  
  const burnTokensDto = {
    owner: props.walletAddress,
    tokenInstances: [{
      quantity: "100",
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

async function fetchPizzaMenu() {
  loading.value = true;
  error.value = false;

  await fetch(`${apiBase}/pizza-menu`)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to fetch pizza menu`);

      return response.json()
    })
    .then((data) => {
      pizzaMenu.value = data;
      loading.value = false;
    })
    .catch((e) => {
      loading.value = false;
      error.value = true;
    });
}

onMounted(async () => {
  await fetchPizzaMenu();

  if (!Array.isArray(pizzaMenu.value.toppings)) return;

  pizzaMenu.value.toppings.forEach((topping) => {
    selectedToppings.value[topping.id] = 0;
  })
});

// Increment topping quantity
const incrementTopping = (id) => {
  if (selectedToppings.value[id] < 3) {
    selectedToppings.value[id]++;
  }
};

// Decrement topping quantity
const decrementTopping = (id) => {
  if (selectedToppings.value[id] > 0) {
    selectedToppings.value[id]--;
  }
};

async function submitSelection() {
  const selection: SavePizzaSelectionDto = {
    crust: selectedCrust.value,
    sauce: selectedSauce.value,
    toppings: selectedToppings.value,
  };
  console.log("Pizza Selection:", selection);

  const burnDto = await confirmBurn();

  const dto: BurnAndSavePizzaSelectionDto = {
    pizza: selection,
    burnDto: burnDto
  }

  console.log(dto);

}
</script>

<style>
.pizza-selection-form {
  max-width: 600px;
  margin: 0 auto;
  font-family: Arial, sans-serif;
}
.topping-checkbox {
  margin-bottom: 5px;
}
button {
  margin-top: 20px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}
</style>