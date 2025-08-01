import { createValidDTO } from "@gala-chain/api";

import { getAdminPrivateKey, randomUniqueKey } from "../controllers/identities";
import { CountVotesDto, FetchVotesDto, FetchVotesResDto, VoteResult } from "../types";
import { evaluateChaincode, submitToChaincode } from "../utils/chaincode";

// Global state for vote processing
let isProcessing = false;
let voteCountingEnabled = process.env.VOTE_COUNTING_ENABLED !== "false";
let voteCountingInterval: NodeJS.Timeout | null = null;

// Configuration from environment variables
const VOTE_COUNTING_INTERVAL = parseInt(process.env.VOTE_COUNTING_INTERVAL_MS || "30000"); // 30 seconds default
const VOTE_BATCH_SIZE = parseInt(process.env.VOTE_BATCH_SIZE || "100");
const MAX_PAGES_PER_RUN = parseInt(process.env.VOTE_MAX_PAGES_PER_RUN || "10");

/**
 * Process uncounted votes in a single batch
 */
async function processSingleBatch(
  fire?: string,
  submission?: string,
  bookmark?: string
): Promise<{
  processed: number;
  nextBookmark?: string;
  hasMore: boolean;
}> {
  console.log("Processing vote batch", { fire: fire || "all", submission: submission || "all", bookmark });

  // Fetch uncounted votes
  const fetchDto = new FetchVotesDto();
  if (fire) fetchDto.fire = fire;
  if (submission) fetchDto.submission = submission;
  fetchDto.entryType = "RWBS"; // Focus on submission votes
  fetchDto.limit = VOTE_BATCH_SIZE;
  if (bookmark) fetchDto.bookmark = bookmark;

  const voteResponse = await evaluateChaincode<FetchVotesResDto>("FetchVotes", fetchDto);

  if (!voteResponse.success) {
    throw new Error(`Failed to fetch votes: ${voteResponse.error}`);
  }

  const result = voteResponse.data;
  const votes = result?.results || [];

  if (votes.length === 0) {
    console.log("No uncounted votes found");
    return { processed: 0, hasMore: false };
  }

  console.log(`Found ${votes.length} uncounted votes`);

  // Extract vote keys for processing
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

  console.log(`Successfully processed ${votes.length} votes`);

  return {
    processed: votes.length,
    nextBookmark: result?.nextPageBookmark,
    hasMore: !!result?.nextPageBookmark
  };
}

/**
 * Main vote counting function that runs on interval
 */
async function runVoteCounting(): Promise<void> {
  if (!voteCountingEnabled) {
    return;
  }

  if (isProcessing) {
    console.log("Vote counting already in progress, skipping this interval");
    return;
  }

  isProcessing = true;
  const startTime = Date.now();

  try {
    console.log("Starting vote counting run");

    let totalProcessed = 0;
    let pagesProcessed = 0;
    let bookmark: string | undefined;

    // Process pages until we hit the limit or run out of votes
    while (pagesProcessed < MAX_PAGES_PER_RUN) {
      try {
        const batchResult = await processSingleBatch(undefined, undefined, bookmark);

        totalProcessed += batchResult.processed;
        pagesProcessed++;

        // If no votes were processed or no more pages, we're done
        if (batchResult.processed === 0 || !batchResult.hasMore) {
          break;
        }

        bookmark = batchResult.nextBookmark;

        // If there's no bookmark, we've reached the end
        if (!bookmark) {
          break;
        }
      } catch (batchError) {
        console.error(`Error processing vote batch ${pagesProcessed + 1}:`, batchError);
        // Continue to next page on error
        break;
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `Vote counting completed: processed ${totalProcessed} votes in ${pagesProcessed} pages (${duration}ms)`
    );
  } catch (error) {
    console.error("Error in vote counting run:", error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the vote counting service
 */
export function startVoteCounting(): void {
  if (voteCountingInterval) {
    console.log("Vote counting already started");
    return;
  }

  console.log(`Starting vote counting service with ${VOTE_COUNTING_INTERVAL}ms interval`);

  // Run immediately once, then on interval
  if (voteCountingEnabled) {
    runVoteCounting().catch((error) => {
      console.error("Error in initial vote counting run:", error);
    });
  }

  voteCountingInterval = setInterval(() => {
    runVoteCounting().catch((error) => {
      console.error("Error in vote counting interval:", error);
    });
  }, VOTE_COUNTING_INTERVAL);
}

/**
 * Stop the vote counting service
 */
export function stopVoteCounting(): void {
  if (voteCountingInterval) {
    clearInterval(voteCountingInterval);
    voteCountingInterval = null;
    console.log("Vote counting service stopped");
  }
}

/**
 * Enable or disable vote counting
 */
export function setVoteCountingEnabled(enabled: boolean): void {
  voteCountingEnabled = enabled;
  console.log(`Vote counting ${enabled ? "enabled" : "disabled"}`);
}

/**
 * Get current vote counting status
 */
export function getVoteCountingStatus(): {
  enabled: boolean;
  running: boolean;
  isProcessing: boolean;
  interval: number;
  batchSize: number;
  maxPages: number;
} {
  return {
    enabled: voteCountingEnabled,
    running: !!voteCountingInterval,
    isProcessing,
    interval: VOTE_COUNTING_INTERVAL,
    batchSize: VOTE_BATCH_SIZE,
    maxPages: MAX_PAGES_PER_RUN
  };
}

/**
 * Manual vote processing for API endpoint (processes all pages)
 */
export async function processAllVotes(
  fire?: string,
  submission?: string
): Promise<{
  success: boolean;
  totalProcessed: number;
  pagesProcessed: number;
  error?: string;
}> {
  if (isProcessing) {
    return {
      success: false,
      totalProcessed: 0,
      pagesProcessed: 0,
      error: "Vote processing already in progress"
    };
  }

  isProcessing = true;

  try {
    console.log("Starting manual vote processing", { fire: fire || "all", submission: submission || "all" });

    let totalProcessed = 0;
    let pagesProcessed = 0;
    let bookmark: string | undefined;

    // Process all pages until no more votes
    while (true) {
      try {
        const batchResult = await processSingleBatch(fire, submission, bookmark);

        totalProcessed += batchResult.processed;
        pagesProcessed++;

        // If no votes were processed, we're done
        if (batchResult.processed === 0) {
          break;
        }

        // If there are more pages, continue with the bookmark
        if (batchResult.hasMore && batchResult.nextBookmark) {
          bookmark = batchResult.nextBookmark;
        } else {
          // No more pages
          break;
        }
      } catch (batchError) {
        console.error(`Error processing vote batch ${pagesProcessed + 1}:`, batchError);

        // Stop on error for manual processing
        if (pagesProcessed === 0) {
          throw batchError;
        }
        break;
      }
    }

    console.log(`Manual vote processing completed: ${totalProcessed} votes in ${pagesProcessed} pages`);

    return {
      success: true,
      totalProcessed,
      pagesProcessed
    };
  } catch (error) {
    console.error("Error in manual vote processing:", error);
    return {
      success: false,
      totalProcessed: 0,
      pagesProcessed: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  } finally {
    isProcessing = false;
  }
}

/**
 * Get statistics about uncounted votes
 */
export async function getVoteStats(
  fire?: string,
  submission?: string
): Promise<{
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

  const result = voteResponse.data;
  const votes = result?.results || [];

  return {
    uncountedVotes: votes.length,
    hasMoreVotes: !!result?.nextPageBookmark,
    estimatedTotal: result?.nextPageBookmark ? "1000+" : votes.length,
    sampleEntries: votes.slice(0, 5).map((vote: VoteResult) => ({
      entry: vote.value.entry,
      voter: vote.value.voter,
      quantity: vote.value.quantity
    }))
  };
}
