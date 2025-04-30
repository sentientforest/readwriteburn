import { NextFunction, Request, Response } from "express";

import { dbService } from "../db";
import { CastVoteDto, ContributeSubmissionDto, FireDto } from "../types";
import { verifyBurnDto } from "./fires";
import { getAdminPrivateKey, randomUniqueKey } from "./identities";

export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = req.body as ContributeSubmissionDto;

    verifyBurnDto(dto.fee, 10);

    const saved = dbService.saveSubmission(dto.submission);
    res.status(201).json(saved);
  } catch (error) {
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

    verifyBurnDto(dto.fee, 5);
    const success = dbService.voteSubmission(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
