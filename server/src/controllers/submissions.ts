import { createValidDTO, deserialize } from "@gala-chain/api";
import { NextFunction, Request, Response } from "express";

import { dbService } from "../db";
import {
  CastVoteAuthorizationDto,
  CastVoteDto,
  ContributeSubmissionAuthorizationDto,
  ContributeSubmissionDto,
  ContributeSubmissionResDto,
  FireDto
} from "../types";
import { submitToChaincode } from "../utils/chaincode";
import { getAdminPrivateKey, randomUniqueKey } from "./identities";

export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    console.log("Raw request body:", JSON.stringify(req.body, null, 2));

    // 1. Parse authorization DTO from client
    const authDto: ContributeSubmissionAuthorizationDto = deserialize(
      ContributeSubmissionAuthorizationDto,
      req.body
    );

    console.log("Deserialized authDto:", JSON.stringify(authDto, null, 2));

    // Check if submission exists
    if (!authDto.submission) {
      return res.status(400).json({
        error: "Missing submission data in authorization DTO"
      });
    }

    console.log(
      "Submission creation request:",
      JSON.stringify(
        {
          name: authDto.submission.name,
          fire: authDto.submission.fire,
          contributor: authDto.submission.contributor,
          hasFee: !!authDto.fee
        },
        null,
        2
      )
    );

    // 2. Create server-signed ContributeSubmissionDto
    const serverDto = await createValidDTO(ContributeSubmissionDto, {
      submission: authDto.submission, // client-signed submission
      uniqueKey: `submission-${randomUniqueKey()}`
    });

    // 3. Sign with server key
    const signedDto = serverDto.signed(getAdminPrivateKey());

    // 4. Submit to chaincode
    console.log("Submitting submission to chaincode...");
    const chainResponse = await submitToChaincode("ContributeSubmission", signedDto);

    if (!chainResponse.success) {
      console.error("Chaincode submission failed:", chainResponse.error);
      return res.status(500).json({
        error: `Submission creation failed: ${chainResponse.error}`
      });
    }

    console.log("Chaincode submission successful:", chainResponse.data);

    // 5. Extract Submission object and chain key from chaincode response
    const submissionResult = chainResponse.data as ContributeSubmissionResDto;
    const chainKey = submissionResult.submissionKey;
    const submission = submissionResult.submission;

    // 6. Save to database with chain metadata
    const created = dbService.saveSubmission(submission, chainKey);

    console.log("Submission created successfully:", {
      id: created.id,
      name: created.name,
      chainKey: chainKey
    });

    // 7. Transform response to include chainKey field for client compatibility
    const response = {
      ...created,
      chainKey: created.chain_key || chainKey
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Submission creation error:", error);
    next(error);
  }
}

export async function listSubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const submissions = dbService.getAllSubmissions();
    res.json(submissions);
  } catch (error) {
    next(error);
  }
}

export async function listSubmissionsByFire(req: Request, res: Response, next: NextFunction) {
  try {
    const submissions = dbService.getSubmissionsBySubfire(req.params.slug);
    // Transform responses to include chainKey field for client compatibility
    const transformedSubmissions = submissions.map((sub) => ({
      ...sub,
      chainKey: sub.chain_key
    }));
    res.json(transformedSubmissions);
  } catch (error) {
    next(error);
  }
}

export async function readSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const submission = dbService.getSubmission(parseInt(req.params.id));
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    // Transform response to include chainKey field for client compatibility
    const response = {
      ...submission,
      chainKey: submission.chain_key
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function upvoteSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    console.log("Raw vote request body:", JSON.stringify(req.body, null, 2));

    // 1. Parse authorization DTO from client
    const authDto: CastVoteAuthorizationDto = deserialize(CastVoteAuthorizationDto, req.body);

    console.log("Deserialized authDto:", JSON.stringify(authDto, null, 2));

    // Check if vote exists and has required fields
    if (!authDto.vote) {
      return res.status(400).json({
        error: "Missing vote data in authorization DTO"
      });
    }

    if (!authDto.vote.entryType) {
      return res.status(400).json({
        error: "VoteDto missing entryType field",
        receivedVote: JSON.stringify(authDto.vote, null, 2)
      });
    }

    console.log(
      "Vote casting request:",
      JSON.stringify(
        {
          entry: authDto.vote.entry,
          entryType: authDto.vote.entryType,
          entryParent: authDto.vote.entryParent,
          quantity: authDto.vote.quantity.toString(),
          hasFee: !!authDto.fee
        },
        null,
        2
      )
    );

    // 2. Create server-signed CastVoteDto
    const serverDto = await createValidDTO(CastVoteDto, {
      vote: authDto.vote, // client-signed vote
      uniqueKey: `vote-${randomUniqueKey()}`
    });

    // 3. Sign with server key
    const signedDto = serverDto.signed(getAdminPrivateKey());

    // 4. Submit to chaincode
    console.log("Submitting vote to chaincode...");
    console.log("Vote DTO being submitted:", JSON.stringify(signedDto, null, 2));
    const chainResponse = await submitToChaincode("CastVote", signedDto);

    if (!chainResponse.success) {
      console.error("Chaincode vote submission failed:", chainResponse.error);
      return res.status(500).json({
        error: `Vote casting failed: ${chainResponse.error}`
      });
    }

    console.log("Chaincode vote submission successful");

    // 5. Update local database vote count (for caching)
    // Note: The submission ID from URL needs to map to chain key
    const submissionId = parseInt(req.params.id);
    await dbService.recordVoteCast(submissionId, authDto.vote.quantity);

    console.log("Vote cast successfully:", {
      entry: authDto.vote.entry,
      quantity: authDto.vote.quantity.toString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Vote casting error:", error);
    next(error);
  }
}

export async function getSubmissionChainKey(req: Request, res: Response, next: NextFunction) {
  try {
    const submissionId = parseInt(req.params.id);

    // Get submission from database
    const submission = dbService.getSubmissionById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Return the chain key that's already stored in the database
    // along with helpful metadata for client-side operations
    res.json({
      submissionId: submissionId,
      chainKey: submission.chainKey,
      indexKey: "RWBS", // Submission index key
      fireSlug: submission.fire_slug,
      entryParent: submission.entryParent,
      isTopLevel: !submission.entryParent
    });
  } catch (error) {
    console.error("Error getting submission chain key:", error);
    next(error);
  }
}
