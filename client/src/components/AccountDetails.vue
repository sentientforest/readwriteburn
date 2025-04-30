<template>
  <div class="account">
    <div>
      <h2>GalaChain Account/Wallet Details</h2>

      <div>
        <p class="wallet-address">Connected: {{ walletAddress }}</p>
        <BalanceDetails :wallet-address="walletAddress" />
        <BurnGala :wallet-address="walletAddress" :metamask-client="metamaskClient" />
        <TransferGala :wallet-address="walletAddress" :metamask-client="metamaskClient" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MetamaskConnectClient } from "@gala-chain/connect";
import { ref } from "vue";

import BalanceDetails from "./BalanceDetails.vue";
import BurnGala from "./BurnGala.vue";
import TransferGala from "./TransferGala.vue";

const props = defineProps<{
  walletAddress: string;
  metamaskClient: MetamaskConnectClient;
}>();

const walletAddress = ref(props.walletAddress);
</script>

<style>
.wallet-address {
  font-family: monospace;
  word-break: break-all;
}
</style>
