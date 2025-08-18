import BigNumber from "bignumber.js";
import { CastVoteAuthorizationDto, Fire, Submission, VoteDto } from "@/types/fire";
import { randomUniqueKey } from "@/utils";

export interface VoteTarget {
  type: 'fire' | 'submission';
  slug?: string;
  chainKey?: string;
  fireSlug?: string;
  entryParent?: string;
}

export interface VoteRequest {
  target: VoteTarget;
  quantity: number;
  userAddress: string;
}

export interface VoteResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Centralized vote service that handles DTO construction and submission
 * for both Fire and Submission votes with consistent logic
 */
export class VoteService {
  private apiBase: string;
  private metamaskClient: any;

  constructor(apiBase: string, metamaskClient: any) {
    this.apiBase = apiBase;
    this.metamaskClient = metamaskClient;
  }

  /**
   * Submit a vote for a fire
   */
  async voteOnFire(fireSlug: string, quantity: number): Promise<VoteResponse> {
    try {
      // Fetch fire chain key from server
      const chainKeyResponse = await fetch(`${this.apiBase}/api/fires/${fireSlug}/chain-key`);
      if (!chainKeyResponse.ok) {
        throw new Error("Failed to fetch fire chain key");
      }
      
      const chainKeyData = await chainKeyResponse.json();
      const voteDto = this.createFireVoteDto(chainKeyData.chainKey, quantity);
      return await this.submitVote(voteDto, `/api/fires/${fireSlug}/vote`);
    } catch (error) {
      return {
        success: false,
        message: "Failed to submit fire vote",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Submit a vote for a submission
   */
  async voteOnSubmission(
    submissionDatabaseId: number,
    quantity: number
  ): Promise<VoteResponse> {
    try {
      // Fetch submission chain key and metadata from server
      const chainKeyResponse = await fetch(`${this.apiBase}/api/submissions/${submissionDatabaseId}/chain-key`);
      if (!chainKeyResponse.ok) {
        throw new Error("Failed to fetch submission chain key");
      }
      
      const chainKeyData = await chainKeyResponse.json();
      const voteDto = this.createSubmissionVoteDto(
        chainKeyData.chainKey,
        chainKeyData.fireSlug,
        chainKeyData.isTopLevel,
        chainKeyData.entryParent,
        quantity
      );
      return await this.submitVote(voteDto, `/api/submissions/${submissionDatabaseId}/vote`);
    } catch (error) {
      return {
        success: false,
        message: "Failed to submit submission vote",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create a standardized VoteDto for fire voting
   */
  private createFireVoteDto(fireChainKey: string, quantity: number): VoteDto {
    return new VoteDto({
      entryType: Fire.INDEX_KEY, // "RWBF"
      entryParent: "", // Empty string for top-level content (fires have no parent)
      entry: fireChainKey, // Use server-provided chain key
      quantity: new BigNumber(quantity),
      uniqueKey: randomUniqueKey()
    });
  }

  /**
   * Create a standardized VoteDto for submission voting
   */
  private createSubmissionVoteDto(
    submissionChainKey: string,
    fireSlug: string,
    isTopLevel: boolean,
    entryParent: string | undefined,
    quantity: number
  ): VoteDto {
    // Determine the correct parent reference
    let actualParent: string;
    if (isTopLevel) {
      // Top-level submissions: parent is the fire chain key
      // Construct fire composite key with escaped format
      actualParent = `\\x00RWBF\\x00${fireSlug}\\x00`;
    } else {
      // Reply submissions: parent is the parent submission's chain key
      actualParent = entryParent || "";
    }

    return new VoteDto({
      entryType: Submission.INDEX_KEY, // "RWBS" 
      entryParent: actualParent,
      entry: submissionChainKey, // The submission we're voting on
      quantity: new BigNumber(quantity),
      uniqueKey: randomUniqueKey()
    });
  }

  /**
   * Sign and submit a vote DTO to the server
   */
  private async submitVote(voteDto: VoteDto, endpoint: string): Promise<VoteResponse> {
    if (!this.metamaskClient) {
      throw new Error("No client software connected");
    }

    console.log("Signing vote:", voteDto);

    // Sign the VoteDto
    const signedVote = await this.metamaskClient.signVote(voteDto);

    // Create authorization DTO for server
    const authDto = new CastVoteAuthorizationDto({
      vote: signedVote
    });

    console.log("Sending vote authorization to server:", authDto);

    // Send to server
    const response = await fetch(`${this.apiBase}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(authDto)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to submit vote");
    }

    return {
      success: true,
      message: "Vote submitted successfully!"
    };
  }

  /**
   * Validate vote request parameters
   */
  static validateVoteRequest(request: VoteRequest): string | null {
    if (!request.quantity || request.quantity <= 0) {
      return "Vote quantity must be greater than 0";
    }

    if (!request.userAddress) {
      return "User must be authenticated to vote";
    }

    if (request.target.type === 'fire' && !request.target.slug) {
      return "Fire slug is required for fire votes";
    }

    if (request.target.type === 'submission' && !request.target.chainKey) {
      return "Submission chain key is required for submission votes";
    }

    return null;
  }
}