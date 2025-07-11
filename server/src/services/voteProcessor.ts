import { createValidDTO } from "@gala-chain/api";

import { CountVotesDto, FetchVotesDto, FetchVotesResDto, VoteResult } from "../types";
import { evaluateChaincode, submitToChaincode } from "../utils/chaincode";
import { getAdminPrivateKey, randomUniqueKey } from "../controllers/identities";

export interface VoteProcessorOptions {
  fire?: string;
  submission?: string;
  batchSize?: number;
  maxBatches?: number;
  delayBetweenBatches?: number;
}

export interface VoteProcessorResult {
  success: boolean;
  totalProcessed: number;
  batchCount: number;
  error?: string;
}

/**
 * Automated vote processing service that fetches and counts uncounted votes
 */
export class VoteProcessor {
  private static instance: VoteProcessor;
  private isProcessing = false;

  static getInstance(): VoteProcessor {
    if (!VoteProcessor.instance) {
      VoteProcessor.instance = new VoteProcessor();
    }
    return VoteProcessor.instance;
  }

  /**
   * Process all uncounted votes with configurable options
   */
  async processVotes(options: VoteProcessorOptions = {}): Promise<VoteProcessorResult> {
    if (this.isProcessing) {
      return {
        success: false,
        totalProcessed: 0,
        batchCount: 0,
        error: "Vote processing already in progress"
      };
    }

    this.isProcessing = true;

    try {
      const {
        fire,
        submission,
        batchSize = 100,
        maxBatches = 50,
        delayBetweenBatches = 100
      } = options;

      const validBatchSize = Math.min(Math.max(batchSize, 1), 1000);

      console.log("VoteProcessor: Starting automated vote processing", {
        fire: fire || "all",
        submission: submission || "all",
        batchSize: validBatchSize,
        maxBatches
      });

      let totalProcessed = 0;
      let batchCount = 0;
      let hasMoreVotes = true;

      while (hasMoreVotes && batchCount < maxBatches) {
        try {
          // Fetch uncounted votes
          const fetchDto = new FetchVotesDto();
          if (fire) fetchDto.fire = fire;
          if (submission) fetchDto.submission = submission;
          fetchDto.entryType = "RWBS"; // Focus on submission votes
          fetchDto.limit = validBatchSize;

          console.log(`VoteProcessor: Fetching batch ${batchCount + 1}/${maxBatches}`);

          const voteResponse = await evaluateChaincode<FetchVotesResDto>("FetchVotes", fetchDto);

          if (!voteResponse.success) {
            throw new Error(`Failed to fetch votes: ${voteResponse.error}`);
          }

          const votes = voteResponse.data?.results || [];

          if (votes.length === 0) {
            console.log("VoteProcessor: No more uncounted votes found");
            hasMoreVotes = false;
            break;
          }

          console.log(`VoteProcessor: Found ${votes.length} uncounted votes`);

          // Extract vote keys
          const voteKeys = votes.map((vote: VoteResult) => vote.key);

          // Create and submit CountVotes DTO
          const countDto = await createValidDTO(CountVotesDto, {
            fire: fire || undefined,
            submission: submission || undefined,
            votes: voteKeys,
            uniqueKey: randomUniqueKey()
          });

          const signedCountDto = countDto.signed(getAdminPrivateKey());
          const countResponse = await submitToChaincode("CountVotes", signedCountDto);

          if (!countResponse.success) {
            throw new Error(`Failed to count votes: ${countResponse.error}`);
          }

          totalProcessed += votes.length;
          batchCount++;

          console.log(`VoteProcessor: Batch ${batchCount} completed. Total: ${totalProcessed}`);

          // Stop if we got less than batch size (no more votes)
          if (votes.length < validBatchSize) {
            hasMoreVotes = false;
          }

          // Delay between batches if specified
          if (delayBetweenBatches > 0 && hasMoreVotes && batchCount < maxBatches) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }

        } catch (batchError) {
          console.error(`VoteProcessor: Error in batch ${batchCount + 1}:`, batchError);
          
          // Stop processing on first batch error, continue on subsequent batch errors
          if (batchCount === 0) {
            throw batchError;
          }
          hasMoreVotes = false;
        }
      }

      const result: VoteProcessorResult = {
        success: true,
        totalProcessed,
        batchCount
      };

      console.log("VoteProcessor: Processing completed", result);
      return result;

    } catch (error) {
      const result: VoteProcessorResult = {
        success: false,
        totalProcessed: 0,
        batchCount: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      };

      console.error("VoteProcessor: Processing failed", result);
      return result;

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if vote processing is currently running
   */
  isProcessingVotes(): boolean {
    return this.isProcessing;
  }

  /**
   * Get statistics about uncounted votes
   */
  async getVoteStats(fire?: string, submission?: string): Promise<{
    uncountedVotes: number;
    hasMoreVotes: boolean;
    estimatedTotal: string | number;
    sampleEntries: Array<{
      entry: string;
      voter: string;
      quantity: string;
    }>;
  }> {
    const fetchDto = new FetchVotesDto();
    if (fire) fetchDto.fire = fire;
    if (submission) fetchDto.submission = submission;
    fetchDto.entryType = "RWBS";
    fetchDto.limit = 1000;

    const voteResponse = await evaluateChaincode<FetchVotesResDto>("FetchVotes", fetchDto);

    if (!voteResponse.success) {
      throw new Error(`Failed to fetch votes: ${voteResponse.error}`);
    }

    const votes = voteResponse.data?.results || [];

    return {
      uncountedVotes: votes.length,
      hasMoreVotes: votes.length === 1000,
      estimatedTotal: votes.length === 1000 ? "1000+" : votes.length,
      sampleEntries: votes.slice(0, 5).map((vote: VoteResult) => ({
        entry: vote.value.entry,
        voter: vote.value.voter,
        quantity: vote.value.quantity
      }))
    };
  }
}

/**
 * Convenience function to process votes with default settings
 */
export async function processAllVotes(options?: VoteProcessorOptions): Promise<VoteProcessorResult> {
  const processor = VoteProcessor.getInstance();
  return processor.processVotes(options);
}

/**
 * Convenience function to get vote statistics
 */
export async function getVoteStats(fire?: string, submission?: string) {
  const processor = VoteProcessor.getInstance();
  return processor.getVoteStats(fire, submission);
}