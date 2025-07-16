<template>
  <div class="fire-starter">
    <h2>Fire Starter</h2>
    <div class="burn-notice">
      <p>🔥 Creating a new fire requires burning $GALA tokens</p>
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
          placeholder="What's this fire about?"
          rows="4"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="entryParent">Parent Fire (optional)</label>
        <input
          id="entryParent"
          v-model="formData.entryParent"
          type="text"
          placeholder="Leave empty for top-level fire"
        />
        <small class="help-text">Enter the slug of a parent fire to create a nested fire</small>
      </div>

      <div class="form-section">
        <h3>Additional Authorities (optional)</h3>
        <div class="user-list">
          <div v-for="(authority, index) in formData.authorities" :key="`auth-${index}`" class="user-item">
            <input
              v-model="formData.authorities[index]"
              type="text"
              placeholder="eth|0x1234567890123456789012345678901234567890"
              pattern="^eth\|0x[a-fA-F0-9]{40}$"
              title="Format: eth|0x followed by 40 hex characters"
            />
            <button type="button" class="remove-btn" @click="removeAuthority(index)">Remove</button>
          </div>
          <button type="button" class="add-btn" @click="addAuthority">Add Authority</button>
        </div>
      </div>

      <div class="form-section">
        <h3>Additional Moderators (optional)</h3>
        <div class="user-list">
          <div v-for="(moderator, index) in formData.moderators" :key="`mod-${index}`" class="user-item">
            <input
              v-model="formData.moderators[index]"
              type="text"
              placeholder="eth|0x1234567890123456789012345678901234567890"
              pattern="^eth\|0x[a-fA-F0-9]{40}$"
              title="Format: eth|0x followed by 40 hex characters"
            />
            <button type="button" class="remove-btn" @click="removeModerator(index)">Remove</button>
          </div>
          <button type="button" class="add-btn" @click="addModerator">Add Moderator</button>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" :disabled="isSubmitting || showFeeConfirmation">
          {{ isSubmitting ? "Calculating fees..." : "Preview Fire Creation 🔥" }}
        </button>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </form>

    <!-- Fee Confirmation Modal -->
    <div v-if="showFeeConfirmation" class="fee-confirmation-modal">
      <div class="modal-content">
        <h3>Confirm Fire Creation</h3>
        <div class="fire-preview">
          <h4>Fire Details:</h4>
          <p><strong>Name:</strong> {{ formData.name }}</p>
          <p><strong>Slug:</strong> {{ formData.slug }}</p>
          <p><strong>Description:</strong> {{ formData.description || "No description" }}</p>
          <p v-if="formData.entryParent"><strong>Parent Fire:</strong> {{ formData.entryParent }}</p>
        </div>

        <div class="fee-details">
          <h4>Transaction Fees:</h4>
          <div v-if="estimatedFees && estimatedFees.length > 0">
            <div v-for="fee in estimatedFees" :key="fee.feeCode" class="fee-item">
              <span class="fee-label">{{ fee.feeCode }}:</span>
              <span class="fee-amount">{{ fee.formattedQuantity }} GALA</span>
            </div>
            <div class="total-fee">
              <strong>Total: {{ formatFee(totalFee) }} GALA</strong>
            </div>
          </div>
          <div v-else class="no-fees">
            <p>✅ No fees required for this transaction</p>
          </div>
        </div>

        <div class="modal-actions">
          <button :disabled="isSubmitting" class="cancel-btn" @click="cancelFireCreation">Cancel</button>
          <button :disabled="isSubmitting" class="confirm-btn" @click="confirmFireCreation">
            {{ isSubmitting ? "Creating Fire..." : "Confirm & Create Fire 🔥" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DryRunResultDto,
  FeeVerificationDto,
  GalaChainResponse,
  asValidUserRef,
  createValidDTO
} from "@gala-chain/api";
import { SigningType } from "@gala-chain/connect";
import BigNumber from "bignumber.js";
import { ValidationError } from "class-validator";
import { computed, getCurrentInstance, ref } from "vue";
import { useRouter } from "vue-router";

import { useUserStore } from "../stores";
import { Fire, FireDto, FireStarterAuthorizationDto, FireStarterDto, IFireStarterDto } from "../types/fire";
import { randomUniqueKey } from "../utils";

const router = useRouter();
const userStore = useUserStore();

// Access global metamaskClient
const instance = getCurrentInstance();
const metamaskClient = computed(() => instance?.appContext.config.globalProperties.$metamaskClient);

const formData = ref({
  name: "",
  slug: "",
  description: "",
  entryParent: "",
  authorities: [] as string[],
  moderators: [] as string[]
});

interface IEstimatedFee {
  feeCode: string;
  quantity: BigNumber;
  formattedQuantity: string;
}

const isSubmitting = ref(false);
const error = ref("");
const showFeeConfirmation = ref(false);
const estimatedFees = ref<Array<IEstimatedFee>>([]);
const pendingFireDto = ref<any>(null);

const apiBase = import.meta.env.VITE_PROJECT_API;

const totalFee = computed(() => {
  return estimatedFees.value.reduce((total, fee) => total.plus(fee.quantity), new BigNumber(0));
});

function addAuthority() {
  formData.value.authorities.push("");
}

function removeAuthority(index: number) {
  formData.value.authorities.splice(index, 1);
}

function addModerator() {
  formData.value.moderators.push("");
}

function removeModerator(index: number) {
  formData.value.moderators.splice(index, 1);
}

function formatFee(amount: BigNumber): string {
  // Format BigNumber to readable GALA amount (assuming 8 decimals)
  return amount.dividedBy(new BigNumber(10).pow(8)).toFixed(2);
}

function cancelFireCreation() {
  showFeeConfirmation.value = false;
  estimatedFees.value = [];
  pendingFireDto.value = null;
  error.value = "";
}

// Helper function to format validation errors including nested ones
const formatValidationErrors = (errors: ValidationError[], prefix = ""): string[] => {
  const messages: string[] = [];
  for (const err of errors) {
    const property = prefix ? `${prefix}.${err.property}` : err.property;
    if (err.constraints) {
      messages.push(`${property}: ${Object.values(err.constraints).join(", ")}`);
    }
    if (err.children && err.children.length > 0) {
      messages.push(...formatValidationErrors(err.children, property));
    }
  }
  return messages;
};

// Step 1: Handle form submission - execute dry run
async function handleSubmit() {
  isSubmitting.value = true;
  error.value = "";

  try {
    // Debug: Check what we have in the store
    console.log("FireStarter debug:", {
      isConnected: userStore.isConnected,
      hasMetamaskClient: !!metamaskClient.value,
      address: userStore.address,
      isAuthenticated: userStore.isAuthenticated
    });

    // Check if wallet is connected using reactive boolean
    if (!userStore.isConnected || !metamaskClient.value) {
      throw new Error(
        `No account connected: isConnected? ${userStore.isConnected}, metamaskClient? ${!!metamaskClient.value}`
      );
    }

    console.log("Creating fire with wallet address:", userStore.address);

    // Create FireDto with all required fields using proper DTO class
    // For top-level fires, entryParent should reference the fire's own ID to avoid empty string issues
    // Since we can't have a perfect circular reference during creation, we'll use the slug as a self-reference
    const entryParent = formData.value.entryParent || formData.value.slug;
    
    const fireDto = new FireDto({
      entryParent: entryParent,
      slug: formData.value.slug,
      name: formData.value.name,
      starter: asValidUserRef(userStore.address),
      description: formData.value.description,
      authorities: formData.value.authorities
        .filter((auth) => auth.trim() !== "")
        .map((auth) => asValidUserRef(auth)),
      moderators: formData.value.moderators
        .filter((mod) => mod.trim() !== "")
        .map((mod) => asValidUserRef(mod)),
      uniqueKey: randomUniqueKey()
    });

    // Validate the FireDto
    const fireValidationErrors = await fireDto.validate();
    if (fireValidationErrors.length > 0) {
      const errorMessages = formatValidationErrors(fireValidationErrors);
      throw new Error(`Fire validation failed: ${errorMessages.join("; ")}`);
    }

    // Store the fire DTO for later use
    pendingFireDto.value = fireDto;

    // Create FireStarterDto for dry run
    const fireStarterDto = new FireStarterDto({
      fire: fireDto,
      uniqueKey: randomUniqueKey()
    });

    // Execute dry run to estimate fees
    console.log("Getting public key from MetaMask client...");
    const publicKey = userStore.publicKey;

    const dryRunDto = {
      callerPublicKey: publicKey,
      method: "FireStarter",
      dto: fireStarterDto
    };

    const dryRunResponse = await fetch(`${apiBase}/api/product/ReadWriteBurn/DryRun`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dryRunDto)
    });

    if (!dryRunResponse.ok) {
      const errorData = await dryRunResponse.json();
      throw new Error(errorData.message || "Failed to estimate fees");
    }

    const dryRunResult: GalaChainResponse<DryRunResultDto> = await dryRunResponse.json();
    console.log("Dry run result:", dryRunResult);

    // Parse fees from dry run response
    estimatedFees.value = parseFeeEstimation(dryRunResult);

    // Show fee confirmation modal
    showFeeConfirmation.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to estimate fees";
    console.error("Dry run error:", err);
  } finally {
    isSubmitting.value = false;
  }
}

// Step 2: Confirm and submit the actual transaction
async function confirmFireCreation() {
  if (!pendingFireDto.value) {
    error.value = "No pending fire data found";
    return;
  }

  isSubmitting.value = true;
  error.value = "";

  try {
    // Create actual fee verification DTOs based on estimated fees
    const feeVerifications = estimatedFees.value.map((fee) => {
      const feeDto = new FeeVerificationDto();
      feeDto.authorization = "";
      feeDto.authority = asValidUserRef(userStore.address);
      feeDto.created = Date.now();
      feeDto.txId = "";
      feeDto.quantity = new BigNumber(fee.quantity);
      feeDto.feeAuthorizationKey = "";
      feeDto.uniqueKey = randomUniqueKey();
      return feeDto;
    });

    // Use first fee or create zero-fee placeholder if no fees
    let feeAuthorization;
    if (feeVerifications.length > 0) {
      // todo: create feeAuthorizationDto
    }

    const fireStarterParams: IFireStarterDto = {
      fire: pendingFireDto.value,
      uniqueKey: randomUniqueKey()
    };

    // Metamask @gala-chain/connect integration fails on empty arrays
    if (fireStarterParams.fire.authorities.length < 1) {
      fireStarterParams.fire.authorities.push(fireStarterParams.fire.starter);
    }

    if (fireStarterParams.fire.moderators.length < 1) {
      fireStarterParams.fire.moderators.push(fireStarterParams.fire.starter);
    }

    if (feeAuthorization) {
      fireStarterParams.fee = feeAuthorization;
    }

    const fireStarterDto = new FireStarterDto(fireStarterParams);

    // Validate the FireStarterDto
    const validationErrors = await fireStarterDto.validate();
    if (validationErrors.length > 0) {
      const errorMessages = formatValidationErrors(validationErrors);
      error.value = `FireStarter validation failed: ${errorMessages.join("; ")}`;
      console.error("FireStarter validation errors:", validationErrors);
      return;
    }

    console.log("FireStarterDto before signing:", JSON.stringify(fireStarterDto, null, 2));
    console.log(`UserRef typeof: ${typeof fireStarterParams.fire.starter}`);

    // Sign and submit the transaction using our strongly-typed method
    let signedFire, dto: FireStarterAuthorizationDto;
    try {
      console.log("About to call signFireStarter method...");
      console.log(`DTO: ${fireStarterDto.serialize()}`);
      signedFire = await metamaskClient?.value?.signFire(fireStarterParams.fire, SigningType.SIGN_TYPED_DATA);
      console.log("signFireStarter method completed successfully");
      dto = await createValidDTO(FireStarterAuthorizationDto, {
        fire: signedFire as FireDto
      });
      // todo: add signed `FeeAuthorizationDto` as dto.fee if user needs to authorize fee here
    } catch (signError) {
      console.error("signFireStarter method failed:", signError);
      throw signError;
    }

    const response = await fetch(`${apiBase}/api/fires`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dto)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create fire");
    }

    const result = await response.json();
    console.log("Fire created successfully:", result);

    // Navigate to the new fire
    router.push(`/f/${pendingFireDto.value.slug}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to create fire";
    console.error("Fire creation error:", err);
  } finally {
    isSubmitting.value = false;
    showFeeConfirmation.value = false;
  }
}

// Parse fee estimation from dry run response
function parseFeeEstimation(dryRunResult: GalaChainResponse<DryRunResultDto>): Array<IEstimatedFee> {
  const fees: Array<IEstimatedFee> = [];

  // todo: parse DryRunResponse
  console.log("parseFeeEstimate with DryRunResult:");
  console.log(dryRunResult);

  // fees.push({
  //   feeCode: "ReadWriteBurn",
  //   quantity: new BigNumber("0"),
  //   formattedQuantity: formatFee(new BigNumber("0"))
  // });

  return fees;
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

.help-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #6c757d;
}

.form-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e9ecef;
}

.form-section h3 {
  margin-bottom: 1rem;
  font-size: 1.125rem;
  color: #495057;
}

.user-list {
  space-y: 0.75rem;
}

.user-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.user-item input {
  flex: 1;
  margin-bottom: 0;
}

.remove-btn {
  width: auto;
  padding: 0.5rem 1rem;
  background: #6c757d;
  font-size: 0.875rem;
}

.remove-btn:hover {
  background: #5a6268;
}

.add-btn {
  width: auto;
  padding: 0.5rem 1rem;
  background: #28a745;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.add-btn:hover {
  background: #218838;
}

.fee-confirmation-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  margin-bottom: 1.5rem;
  color: #333;
  text-align: center;
}

.fire-preview {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.fire-preview h4 {
  margin-bottom: 0.75rem;
  color: #495057;
  font-size: 1rem;
}

.fire-preview p {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.fee-details {
  margin-bottom: 1.5rem;
}

.fee-details h4 {
  margin-bottom: 0.75rem;
  color: #495057;
  font-size: 1rem;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
}

.fee-label {
  font-weight: 500;
  color: #495057;
}

.fee-amount {
  font-weight: 600;
  color: #dc3545;
}

.total-fee {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 2px solid #dee2e6;
  text-align: right;
  font-size: 1.125rem;
  color: #dc3545;
}

.no-fees {
  text-align: center;
  color: #28a745;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.modal-actions button {
  width: auto;
  min-width: 120px;
  padding: 0.75rem 1.5rem;
}

.cancel-btn {
  background: #6c757d;
}

.cancel-btn:hover {
  background: #5a6268;
}

.confirm-btn {
  background: #dc3545;
}

.confirm-btn:hover {
  background: #c82333;
}
</style>
]]>
