<template>
  <div class="balance-container">
    <h2>GALA Balance</h2>
    <div class="balance-info">
      <p>Available: {{ formatBalance(availableBalance) }} GALA</p>
      <p v-if="lockedBalance > 0">Locked: {{ formatBalance(lockedBalance) }} GALA</p>
    </div>
    <button @click="refreshBalance">Refresh</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useUserStore } from "../stores/user";

const userStore = useUserStore();

const availableBalance = ref(0);
const lockedBalance = ref(0);

async function fetchBalance() {
  if (!userStore.address) return;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_PROJECT_API}/api/product/GalaChainToken/FetchBalances`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: userStore.address,
          collection: "GALA",
          category: "Unit",
          type: "none",
          additionalKey: "none",
          instance: "0"
        })
      }
    );

    const data = await response.json();
    if (data.Data.length > 0) {
      const total = parseFloat(data.Data[0].quantity);
      lockedBalance.value = data.Data[0].lockedHolds.reduce(
        (acc: number, hold: any) => acc + parseFloat(hold.quantity),
        0
      );
      availableBalance.value = total - lockedBalance.value;
    }
  } catch (err) {
    console.error("Error fetching balance:", err);
  }
}

function formatBalance(balance: number): string {
  return balance.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const refreshBalance = () => fetchBalance();

watch(() => userStore.address, fetchBalance);
onMounted(fetchBalance);
</script>

<style scoped>
.balance-container {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.balance-info {
  margin: 15px 0;
}
</style>
