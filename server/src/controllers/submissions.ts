import { createValidDTO, deserialize } from "@gala-chain/api";
import { NextFunction, Request, Response } from "express";

import { dbService } from "../db";
import { CastVoteDto, ContributeSubmissionAuthorizationDto, ContributeSubmissionDto, FireDto } from "../types";
import { submitToChaincode } from "../utils/chaincode";
import { getAdminPrivateKey, randomUniqueKey } from "./identities";

export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Parse authorization DTO from client
    const authDto: ContributeSubmissionAuthorizationDto = deserialize(
      ContributeSubmissionAuthorizationDto,
      req.body
    );

    console.log("Submission creation request:", JSON.stringify({
      name: authDto.submission.name,
      fire: authDto.submission.fire,
      contributor: authDto.submission.contributor,
      hasFee: !!authDto.fee
    }, null, 2));

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

    // 5. Extract Submission object from chaincode response
    const submissionResult = chainResponse.data as any; // Submission object
    
    // 6. Save to database with chain metadata
    const created = dbService.saveSubmission(submissionResult);
    
    console.log("Submission created successfully:", {
      id: submissionResult.id,
      name: submissionResult.name,
      chainKey: submissionResult.getCompositeKey ? submissionResult.getCompositeKey() : 'unknown'
    });

    res.status(201).json(created);
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
    res.json(submissions);
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
    res.json(submission);
  } catch (error) {
    next(error);
  }
}

export async function upvoteSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = req.body as CastVoteDto;

    // TODO: Implement fee verification
    // verifyBurnDto(dto.fee, 5);
    const success = dbService.voteSubmission(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
