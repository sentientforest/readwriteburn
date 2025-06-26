import { Request, Response } from "express";

import { CountVotesDto, FetchVotesDto, FetchVotesResDto } from "../types";

/**
 * Fetch votes from the chaincode
 * GET /api/votes
 */
export async function fetchVotes(req: Request, res: Response): Promise<void> {
  try {
    const { entryType, fire, submission, bookmark, limit } = req.query;

    // Build the DTO for chaincode call
    const dto = new FetchVotesDto();
    if (entryType) dto.entryType = entryType as string;
    if (fire) dto.fire = fire as string;
    if (submission) dto.submission = submission as string;
    if (bookmark) dto.bookmark = bookmark as string;
    if (limit) dto.limit = parseInt(limit as string, 10);

    // Make proxy call to chaincode
    const response = await fetch("http://localhost:4000/api/product/ReadWriteBurnContract/FetchVotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dto)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Chaincode error:", errorText);
      res.status(response.status).json({
        error: "Failed to fetch votes from chaincode",
        details: errorText
      });
      return;
    }

    const result: FetchVotesResDto = await response.json();
    res.json(result);
  } catch (error) {
    console.error("Error fetching votes:", error);
    res.status(500).json({
      error: "Internal server error while fetching votes",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Count votes by processing raw vote objects
 * POST /api/votes/count
 */
export async function countVotes(req: Request, res: Response): Promise<void> {
  try {
    const { fire, submission, votes, uniqueKey } = req.body;

    // Validate required fields
    if (!votes || !Array.isArray(votes) || votes.length === 0) {
      res.status(400).json({
        error: "Missing or invalid votes array"
      });
      return;
    }

    if (!uniqueKey) {
      res.status(400).json({
        error: "Missing uniqueKey parameter"
      });
      return;
    }

    // Limit votes array to 1000 items as per chaincode specification
    if (votes.length > 1000) {
      res.status(400).json({
        error: "Too many votes to process. Maximum 1000 votes per request."
      });
      return;
    }

    // Build the DTO for chaincode call
    const dto = new CountVotesDto();
    if (fire) dto.fire = fire;
    if (submission) dto.submission = submission;
    dto.votes = votes;
    dto.uniqueKey = uniqueKey;

    // Make proxy call to chaincode
    const response = await fetch("http://localhost:4000/api/product/ReadWriteBurnContract/CountVotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dto)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Chaincode error:", errorText);
      res.status(response.status).json({
        error: "Failed to count votes on chaincode",
        details: errorText
      });
      return;
    }

    // CountVotes returns void, so we just confirm success
    res.json({
      success: true,
      message: "Votes processed successfully",
      processedCount: votes.length
    });
  } catch (error) {
    console.error("Error counting votes:", error);
    res.status(500).json({
      error: "Internal server error while counting votes",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get aggregated vote counts for a specific submission or fire
 * GET /api/votes/counts
 */
export async function getVoteCounts(req: Request, res: Response): Promise<void> {
  try {
    const { fire, submission } = req.query;

    if (!fire && !submission) {
      res.status(400).json({
        error: "Either fire or submission parameter is required"
      });
      return;
    }

    // Build query for fetching VoteCount objects
    // Note: This assumes there's a separate method to fetch VoteCount objects
    // If not available in chaincode, we'll need to implement aggregation logic here

    // For now, return a placeholder response indicating this endpoint needs chaincode support
    res.status(501).json({
      error: "Vote count aggregation not yet implemented",
      message: "This endpoint requires additional chaincode methods to fetch VoteCount objects",
      suggestion: "Use /api/votes to fetch raw votes and aggregate on client side"
    });
  } catch (error) {
    console.error("Error getting vote counts:", error);
    res.status(500).json({
      error: "Internal server error while getting vote counts",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
