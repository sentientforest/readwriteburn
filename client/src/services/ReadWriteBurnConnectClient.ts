import { serialize } from "@gala-chain/api";
import { signatures } from "@gala-chain/api";
import { BrowserConnectClient } from "@gala-chain/connect";
import { SigningType } from "@gala-chain/connect";
import { GalaChainProviderOptions } from "@gala-chain/connect";
import { BrowserProvider, Eip1193Provider } from "ethers";

import {
  CastVoteDto,
  ContributeSubmissionDto,
  FireDto,
  FireStarterDto,
  SubmissionDto,
  VoteDto
} from "../types/fire";

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

const FIRE_EIP712_TYPES = {
  Fire: [
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

/**
 * Extended BrowserConnectClient with strongly-typed methods for ReadWriteBurn DTOs
 *
 * This class extends the base BrowserConnectClient to provide
 * EIP712 Types generation with static, properly-typed definitions for our DTOs.
 */
export class ReadWriteBurnConnectClient extends BrowserConnectClient {
  constructor(provider?: Eip1193Provider, options?: GalaChainProviderOptions) {
    super(provider, options);
  }

  /**
   * Signs a FireDto with statically generated EIP712 Types
   */
  async signFire(
    fireDto: FireDto,
    signingType: SigningType = SigningType.SIGN_TYPED_DATA
  ): Promise<FireDto & { signature: string; prefix: string }> {
    if (!this.provider) {
      throw new Error("Ethereum provider not found");
    }

    if (!this.address) {
      throw new Error("No account connected");
    }

    try {
      // Calculate prefix using our local implementation
      const prefix = calculatePersonalSignPrefix(fireDto);
      const prefixedPayload = { ...fireDto, prefix };

      const signer = await this.provider.getSigner();

      if (signingType === SigningType.SIGN_TYPED_DATA) {
        // Use our static EIP712 types instead of dynamic generation
        const domain = { name: "GalaChain" };

        // Choose the right type definition based on whether fee is present
        const types = FIRE_EIP712_TYPES;

        // Prepare the message with proper structure
        const message: any = {
          entryParent: fireDto.entryParent || "",
          slug: fireDto.slug,
          name: fireDto.name,
          starter: fireDto.starter,
          description: fireDto.description || "",
          authorities: fireDto.authorities || [],
          moderators: fireDto.moderators || [],
          uniqueKey: fireDto.uniqueKey
        };

        const signature = await signer.signTypedData(domain, types, message);

        return {
          ...prefixedPayload,
          signature,
          types,
          domain
        } as FireDto & { signature: string; prefix: string; types: any; domain: any };
      } else if (signingType === SigningType.PERSONAL_SIGN) {
        const signature = await signer.signMessage(serialize(prefixedPayload));
        return { ...prefixedPayload, signature };
      } else {
        throw new Error("Unsupported signing type");
      }
    } catch (error: unknown) {
      throw new Error(`Fire signing failed: ${(error as Error).message}`);
    }
  }
  /**
   * Signs a SubmissionDto with statically generated EIP712 Types
   */
  async signSubmission(
    submissionDto: SubmissionDto,
    signingType: SigningType = SigningType.SIGN_TYPED_DATA
  ): Promise<SubmissionDto & { signature: string; prefix: string }> {
    if (!this.provider) {
      throw new Error("Ethereum provider not found");
    }

    if (!this.address) {
      throw new Error("No account connected");
    }

    try {
      // Calculate prefix using our local implementation
      const prefix = calculatePersonalSignPrefix(submissionDto);
      const prefixedPayload = { ...submissionDto, prefix };

      const signer = await this.provider.getSigner();

      if (signingType === SigningType.SIGN_TYPED_DATA) {
        // Use our static EIP712 types instead of dynamic generation
        const domain = { name: "GalaChain" };

        // Define EIP712 types for Submission
        const types = {
          Submission: [
            { name: "name", type: "string" },
            { name: "fire", type: "string" },
            { name: "entryParent", type: "string" },
            { name: "contributor", type: "string" },
            { name: "description", type: "string" },
            { name: "url", type: "string" },
            { name: "uniqueKey", type: "string" }
          ]
        };

        // Prepare the message with proper structure
        const message: any = {
          name: submissionDto.name,
          fire: submissionDto.fire,
          entryParent: submissionDto.entryParent || "",
          contributor: submissionDto.contributor || "",
          description: submissionDto.description || "",
          url: submissionDto.url || "",
          uniqueKey: submissionDto.uniqueKey
        };

        const signature = await signer.signTypedData(domain, types, message);

        return {
          ...prefixedPayload,
          signature,
          types,
          domain
        } as SubmissionDto & { signature: string; prefix: string; types: any; domain: any };
      } else if (signingType === SigningType.PERSONAL_SIGN) {
        const signature = await signer.signMessage(serialize(prefixedPayload));
        return { ...prefixedPayload, signature };
      } else {
        throw new Error("Unsupported signing type");
      }
    } catch (error: unknown) {
      throw new Error(`Submission signing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Signs a FireStarter transaction with statically generated EIP712 Types
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

  /**
   * Signs a ContributeSubmission transaction with statically generated EIP712 types
   *
   * @param contributeSubmissionDto - The contribute submission DTO to sign
   * @param signingType - The signing method to use (defaults to SIGN_TYPED_DATA)
   * @returns Promise<ContributeSubmissionDto & { signature: string; prefix: string }>
   */
  async signContributeSubmission(
    contributeSubmissionDto: ContributeSubmissionDto,
    signingType: SigningType = SigningType.SIGN_TYPED_DATA
  ): Promise<ContributeSubmissionDto & { signature: string; prefix: string }> {
    if (!this.provider) {
      throw new Error("Ethereum provider not found");
    }
    if (!this.address) {
      throw new Error("No account connected");
    }

    try {
      // Calculate prefix using our local implementation
      const prefix = calculatePersonalSignPrefix(contributeSubmissionDto);
      const prefixedPayload = { ...contributeSubmissionDto, prefix };

      const signer = await this.provider.getSigner();

      if (signingType === SigningType.SIGN_TYPED_DATA) {
        // Define EIP712 types for ContributeSubmission
        const types: any = {
          ContributeSubmission: [
            { name: "submission", type: "submission" },
            { name: "uniqueKey", type: "string" },
            { name: "prefix", type: "string" }
          ],
          submission: [
            { name: "name", type: "string" },
            { name: "fire", type: "string" },
            { name: "entryParent", type: "string" },
            { name: "contributor", type: "string" },
            { name: "description", type: "string" },
            { name: "url", type: "string" },
            { name: "uniqueKey", type: "string" }
          ]
        };

        // Add fee type if present
        if (contributeSubmissionDto.fee) {
          types.ContributeSubmission = [
            { name: "submission", type: "submission" },
            { name: "fee", type: "fee" },
            { name: "uniqueKey", type: "string" },
            { name: "prefix", type: "string" }
          ];
          types.fee = [
            { name: "authorization", type: "string" },
            { name: "authority", type: "string" },
            { name: "created", type: "uint256" },
            { name: "txId", type: "string" },
            { name: "quantity", type: "string" },
            { name: "feeAuthorizationKey", type: "string" },
            { name: "uniqueKey", type: "string" }
          ];
        }

        const domain = { name: "GalaChain" };

        // Prepare the message with proper structure
        const message: any = {
          submission: {
            name: contributeSubmissionDto.submission.name,
            fire: contributeSubmissionDto.submission.fire,
            entryParent: contributeSubmissionDto.submission.entryParent || "",
            contributor: contributeSubmissionDto.submission.contributor || "",
            description: contributeSubmissionDto.submission.description || "",
            url: contributeSubmissionDto.submission.url || "",
            uniqueKey: contributeSubmissionDto.submission.uniqueKey
          },
          uniqueKey: contributeSubmissionDto.uniqueKey,
          prefix
        };

        // Add fee if present
        if (contributeSubmissionDto.fee) {
          message.fee = {
            authorization: contributeSubmissionDto.fee.authorization || "",
            authority: contributeSubmissionDto.fee.authority,
            created: contributeSubmissionDto.fee.created,
            txId: contributeSubmissionDto.fee.txId || "",
            quantity: contributeSubmissionDto.fee.quantity.toString(),
            feeAuthorizationKey: contributeSubmissionDto.fee.feeAuthorizationKey || "",
            uniqueKey: contributeSubmissionDto.fee.uniqueKey
          };
        }

        console.log("ContributeSubmission EIP712 - Domain:", domain);
        console.log("ContributeSubmission EIP712 - Types:", types);
        console.log("ContributeSubmission EIP712 - Message:", message);

        // Sign using ethers v6 signTypedData
        const signature = await signer.signTypedData(domain, types, message);

        return {
          ...prefixedPayload,
          signature,
          types,
          domain
        } as ContributeSubmissionDto & { signature: string; prefix: string; types: any; domain: any };
      } else if (signingType === SigningType.PERSONAL_SIGN) {
        // For personal sign, serialize and sign the message
        const signature = await signer.signMessage(serialize(prefixedPayload));
        return { ...prefixedPayload, signature };
      } else {
        throw new Error("Unsupported signing type");
      }
    } catch (error: unknown) {
      throw new Error(`ContributeSubmission signing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Signs a VoteDto with statically generated EIP712 Types
   */
  async signVote(
    voteDto: VoteDto,
    signingType: SigningType = SigningType.SIGN_TYPED_DATA
  ): Promise<VoteDto & { signature: string; prefix: string }> {
    if (!this.provider) {
      throw new Error("Ethereum provider not found");
    }

    if (!this.address) {
      throw new Error("No account connected");
    }

    try {
      // Calculate prefix using our local implementation
      const prefix = calculatePersonalSignPrefix(voteDto);
      const prefixedPayload = { ...voteDto, prefix };

      const signer = await this.provider.getSigner();

      if (signingType === SigningType.SIGN_TYPED_DATA) {
        // Use our static EIP712 types instead of dynamic generation
        const domain = { name: "GalaChain" };

        // Define EIP712 types for Vote
        const types = {
          Vote: [
            { name: "entryType", type: "string" },
            { name: "entryParent", type: "string" },
            { name: "entry", type: "string" },
            { name: "quantity", type: "string" },
            { name: "uniqueKey", type: "string" }
          ]
        };

        // Prepare the message with proper structure
        const message: any = {
          entryType: voteDto.entryType,
          entryParent: voteDto.entryParent || "",
          entry: voteDto.entry,
          quantity: voteDto.quantity.toString(), // Convert BigNumber to string
          uniqueKey: voteDto.uniqueKey
        };

        const signature = await signer.signTypedData(domain, types, message);

        return {
          ...prefixedPayload,
          signature,
          types,
          domain
        } as VoteDto & { signature: string; prefix: string; types: any; domain: any };
      } else if (signingType === SigningType.PERSONAL_SIGN) {
        const signature = await signer.signMessage(serialize(prefixedPayload));
        return { ...prefixedPayload, signature };
      } else {
        throw new Error("Unsupported signing type");
      }
    } catch (error: unknown) {
      throw new Error(`Vote signing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Signs a CastVote transaction with statically generated types
   *
   * @param castVoteDto - The cast vote DTO to sign
   * @param signingType - The signing method to use (defaults to SIGN_TYPED_DATA)
   * @returns Promise<CastVoteDto & { signature: string; prefix: string }>
   */
  async signCastVote(
    castVoteDto: CastVoteDto,
    signingType: SigningType = SigningType.SIGN_TYPED_DATA
  ): Promise<CastVoteDto & { signature: string; prefix: string }> {
    if (!this.provider) {
      throw new Error("Ethereum provider not found");
    }
    if (!this.address) {
      throw new Error("No account connected");
    }

    try {
      // Calculate prefix using our local implementation
      const prefix = calculatePersonalSignPrefix(castVoteDto);
      const prefixedPayload = { ...castVoteDto, prefix };

      const signer = await this.provider.getSigner();

      if (signingType === SigningType.SIGN_TYPED_DATA) {
        // Define EIP712 types for CastVote
        const types: any = {
          CastVote: [
            { name: "vote", type: "vote" },
            { name: "uniqueKey", type: "string" },
            { name: "prefix", type: "string" }
          ],
          vote: [
            { name: "entryType", type: "string" },
            { name: "entryParent", type: "string" },
            { name: "entry", type: "string" },
            { name: "quantity", type: "string" }, // BigNumber serializes to string
            { name: "uniqueKey", type: "string" }
          ]
        };

        // Add fee type if present
        if (castVoteDto.fee) {
          types.CastVote = [
            { name: "vote", type: "vote" },
            { name: "fee", type: "fee" },
            { name: "uniqueKey", type: "string" },
            { name: "prefix", type: "string" }
          ];
          types.fee = [
            { name: "authorization", type: "string" },
            { name: "authority", type: "string" },
            { name: "created", type: "uint256" },
            { name: "txId", type: "string" },
            { name: "quantity", type: "string" },
            { name: "feeAuthorizationKey", type: "string" },
            { name: "uniqueKey", type: "string" }
          ];
        }

        const domain = { name: "GalaChain" };

        // Prepare the message with proper structure
        const message: any = {
          vote: {
            entryType: castVoteDto.vote.entryType,
            entryParent: castVoteDto.vote.entryParent || "",
            entry: castVoteDto.vote.entry,
            quantity: castVoteDto.vote.quantity.toString(), // Convert BigNumber to string
            uniqueKey: castVoteDto.vote.uniqueKey
          },
          uniqueKey: castVoteDto.uniqueKey,
          prefix
        };

        // Add fee if present
        if (castVoteDto.fee) {
          message.fee = {
            authorization: castVoteDto.fee.authorization || "",
            authority: castVoteDto.fee.authority,
            created: castVoteDto.fee.created,
            txId: castVoteDto.fee.txId || "",
            quantity: castVoteDto.fee.quantity.toString(),
            feeAuthorizationKey: castVoteDto.fee.feeAuthorizationKey || "",
            uniqueKey: castVoteDto.fee.uniqueKey
          };
        }

        console.log("CastVote EIP712 - Domain:", domain);
        console.log("CastVote EIP712 - Types:", types);
        console.log("CastVote EIP712 - Message:", message);

        // Sign using ethers v6 signTypedData
        const signature = await signer.signTypedData(domain, types, message);

        return {
          ...prefixedPayload,
          signature,
          types,
          domain
        } as CastVoteDto & { signature: string; prefix: string; types: any; domain: any };
      } else if (signingType === SigningType.PERSONAL_SIGN) {
        // For personal sign, serialize and sign the message
        const signature = await signer.signMessage(serialize(prefixedPayload));
        return { ...prefixedPayload, signature };
      } else {
        throw new Error("Unsupported signing type");
      }
    } catch (error: unknown) {
      throw new Error(`CastVote signing failed: ${(error as Error).message}`);
    }
  }
}
