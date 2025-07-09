import { BrowserConnectClient } from "@gala-chain/connect";
import { SigningType } from "@gala-chain/connect";
import { BrowserProvider, Eip1193Provider } from "ethers";
import { GalaChainProviderOptions } from "@gala-chain/connect";
import { serialize } from "@gala-chain/api";
import { signatures } from "@gala-chain/api";

import { FireStarterDto, CastVoteDto, ContributeSubmissionDto } from "../types/fire";

// Implement calculatePersonalSignPrefix locally
function calculatePersonalSignPrefix(payload: object): string {
  let payloadLength = signatures.getPayloadToSign(payload).length;
  let prefix = "\u0019Ethereum Signed Message:\n" + payloadLength;
  let previousLength = -1;

  while (payloadLength !== previousLength) {
    previousLength = payloadLength;
    prefix = "\u0019Ethereum Signed Message:\n" + payloadLength;
    const newPayload = { ...payload, prefix };
    payloadLength = signatures.getPayloadToSign(newPayload).length;
  }

  return prefix;
}

// Define static EIP712 types for FireStarterDto
// Note: fee is optional, so we'll handle it dynamically
const FIRE_STARTER_EIP712_TYPES_BASE = {
  FireStarter: [
    { name: "fire", type: "fire" },
    { name: "uniqueKey", type: "string" },
    { name: "prefix", type: "string" }
  ],
  fire: [
    { name: "entryParent", type: "string" },
    { name: "slug", type: "string" },
    { name: "name", type: "string" },
    { name: "starter", type: "string" },
    { name: "description", type: "string" },
    { name: "authorities", type: "string[]" },
    { name: "moderators", type: "string[]" },
    { name: "uniqueKey", type: "string" }
  ]
};

// EIP712 types when fee is present
const FIRE_STARTER_EIP712_TYPES_WITH_FEE = {
  ...FIRE_STARTER_EIP712_TYPES_BASE,
  FireStarter: [
    { name: "fire", type: "fire" },
    { name: "fee", type: "fee" },
    { name: "uniqueKey", type: "string" },
    { name: "prefix", type: "string" }
  ],
  fee: [
    { name: "authorization", type: "string" },
    { name: "authority", type: "string" },
    { name: "created", type: "uint256" },
    { name: "txId", type: "string" },
    { name: "quantity", type: "string" }, // BigNumber serializes to string
    { name: "feeAuthorizationKey", type: "string" },
    { name: "uniqueKey", type: "string" }
  ]
};

/**
 * Extended BrowserConnectClient with strongly-typed methods for ReadWriteBurn DTOs
 * 
 * This class extends the base BrowserConnectClient but REPLACES the problematic
 * generateEIP712Types function with static, properly-typed definitions for our DTOs.
 */
export class ReadWriteBurnConnectClient extends BrowserConnectClient {
  constructor(provider?: Eip1193Provider, options?: GalaChainProviderOptions) {
    super(provider, options);
  }

  /**
   * Signs a FireStarter transaction WITHOUT using the problematic generateEIP712Types
   * 
   * @param fireStarterDto - The fire starter DTO to sign
   * @param signingType - The signing method to use (defaults to SIGN_TYPED_DATA)
   * @returns Promise<FireStarterDto & { signature: string; prefix: string }>
   */
  async signFireStarter(
    fireStarterDto: FireStarterDto,
    signingType: SigningType = SigningType.SIGN_TYPED_DATA
  ): Promise<FireStarterDto & { signature: string; prefix: string }> {
    if (!this.provider) {
      throw new Error("Ethereum provider not found");
    }
    if (!this.address) {
      throw new Error("No account connected");
    }

    try {
      // Calculate prefix using our local implementation
      const prefix = calculatePersonalSignPrefix(fireStarterDto);
      const prefixedPayload = { ...fireStarterDto, prefix };

      const signer = await this.provider.getSigner();
      
      if (signingType === SigningType.SIGN_TYPED_DATA) {
        // Use our static EIP712 types instead of dynamic generation
        const domain = { name: "GalaChain" };
        
        // Choose the right type definition based on whether fee is present
        const types = fireStarterDto.fee 
          ? FIRE_STARTER_EIP712_TYPES_WITH_FEE 
          : FIRE_STARTER_EIP712_TYPES_BASE;
        
        // Prepare the message with proper structure
        const message: any = {
          fire: {
            entryParent: fireStarterDto.fire.entryParent || "",
            slug: fireStarterDto.fire.slug,
            name: fireStarterDto.fire.name,
            starter: fireStarterDto.fire.starter,
            description: fireStarterDto.fire.description || "",
            authorities: fireStarterDto.fire.authorities || [],
            moderators: fireStarterDto.fire.moderators || [],
            uniqueKey: fireStarterDto.fire.uniqueKey
          },
          uniqueKey: fireStarterDto.uniqueKey,
          prefix
        };

        // Add fee if present
        if (fireStarterDto.fee) {
          message.fee = {
            authorization: fireStarterDto.fee.authorization || "",
            authority: fireStarterDto.fee.authority,
            created: fireStarterDto.fee.created,
            txId: fireStarterDto.fee.txId || "",
            quantity: fireStarterDto.fee.quantity.toString(), // Convert BigNumber to string
            feeAuthorizationKey: fireStarterDto.fee.feeAuthorizationKey || "",
            uniqueKey: fireStarterDto.fee.uniqueKey
          };
        }

        console.log("EIP712 Signing - Domain:", domain);
        console.log("EIP712 Signing - Types:", types);
        console.log("EIP712 Signing - Message:", message);

        // Sign using ethers v6 signTypedData
        const signature = await signer.signTypedData(domain, types, message);
        
        return { 
          ...prefixedPayload, 
          signature,
          types,
          domain
        } as FireStarterDto & { signature: string; prefix: string; types: any; domain: any };
      } else if (signingType === SigningType.PERSONAL_SIGN) {
        // For personal sign, serialize and sign the message
        const signature = await signer.signMessage(serialize(prefixedPayload));
        return { ...prefixedPayload, signature };
      } else {
        throw new Error("Unsupported signing type");
      }
    } catch (error: unknown) {
      throw new Error(`FireStarter signing failed: ${(error as Error).message}`);
    }
  }

}