<template>
  <div class="account">
    <div>
      <h2>GalaChain Account/Wallet Details</h2>

      <div>
        <p class="wallet-address">Connected: {{ userStore.address }}</p>
        <BalanceDetails />
        <BurnGala />
        <TransferGala />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "../stores/user";

import BalanceDetails from "./BalanceDetails.vue";
import BurnGala from "./BurnGala.vue";
import TransferGala from "./TransferGala.vue";

const userStore = useUserStore();
</script>

<style>
.wallet-address {
  font-family: monospace;
  word-break: break-all;
}
</style>
