import "dotenv/config";

import { FeeAuthorizationDto } from "@gala-chain/api";
import cors from "cors";
import express from "express";

import { registerEthUser, registerRandomEthUser } from "./controllers/identities";
import { proxy } from "./controllers/proxy";
import { dbService } from "./db";
import type { CastVoteDto, ContributeSubmissionDto, FireDto } from "./types";

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Helper function to verify burn DTO
function verifyBurnDto(fee: FeeAuthorizationDto, burnCost: number): number {
  // todo: execute a dry run query to retrive actual fee amount from chain
  if (fee.quantity.isLessThan(burnCost)) {
    throw new Error(`Insufficient $GALA burn quantity: ${fee.quantity}, required: ${burnCost}`);
  }

  return fee.quantity.toNumber();
}

// Identity routes
app.get("/api/identities/new-random-user", registerRandomEthUser);
app.post("/api/identities/register", registerEthUser);
app.post("/identities/CreateHeadlessWallet", registerEthUser);
app.post("/api/:channel/:contract/:method", proxy);

// Subfire routes
app.post("/api/subfires", async (req, res, next) => {
  try {
    const subfire = req.body as FireDto;
    const created = dbService.createSubfire(subfire);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.get("/api/subfires", async (req, res, next) => {
  try {
    const subfires = dbService.getAllSubfires();
    res.json(subfires);
  } catch (error) {
    next(error);
  }
});

app.get("/api/subfires/:slug", async (req, res, next) => {
  try {
    const subfire = dbService.getSubfire(req.params.slug);
    if (!subfire) {
      return res.status(404).json({ error: "Subfire not found" });
    }
    res.json(subfire);
  } catch (error) {
    next(error);
  }
});

app.put("/api/subfires/:slug", async (req, res, next) => {
  try {
    const subfire = req.body as FireDto;
    const updated = dbService.updateSubfire(req.params.slug, subfire);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/subfires/:slug", async (req, res, next) => {
  try {
    const success = dbService.deleteSubfire(req.params.slug);
    if (!success) {
      return res.status(404).json({ error: "Subfire not found" });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Submission routes
app.get("/api/submissions", async (req, res, next) => {
  try {
    const submissions = dbService.getAllSubmissions();
    res.json(submissions);
  } catch (error) {
    next(error);
  }
});

app.get("/api/submissions/:id", async (req, res, next) => {
  try {
    const submission = dbService.getSubmission(parseInt(req.params.id));
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.json(submission);
  } catch (error) {
    next(error);
  }
});

app.post("/api/submissions", async (req, res, next) => {
  try {
    const dto = req.body as ContributeSubmissionDto;

    verifyBurnDto(dto.fee, 10);

    const saved = dbService.saveSubmission(dto.submission);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

app.post("/api/submissions/:id/vote", async (req, res, next) => {
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
});

app.get("/api/subfires/:slug/submissions", async (req, res, next) => {
  try {
    const submissions = dbService.getSubmissionsBySubfire(req.params.slug);
    res.json(submissions);
  } catch (error) {
    next(error);
  }
});

app.listen(port, () => {
  console.log(`${process.env.PROJECT_ID ?? "Server"} is running on port ${port}`);
});
