import { Request, Response } from "express";

import { dbService } from "../db";
import {
  BulkVerificationRequestDto,
  BulkVerificationResultDto,
  ContentVerificationDto,
  ModerationRequestDto,
  ModerationResponseDto
} from "../types";
import {
  type HashableContent,
  bulkVerifyContent,
  generateContentHash,
  verifyContentHash
} from "../utils/contentHash";

/**
 * Verify content hash for a specific submission
 * GET /api/submissions/:id/verify
 */
export async function verifySubmissionContent(req: Request, res: Response) {
  try {
    const submissionId = parseInt(req.params.id);

    if (isNaN(submissionId)) {
      return res.status(400).json({ error: "Invalid submission ID" });
    }

    // Get submission from database
    const submission = dbService.getSubmission(submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Get content for verification
    const content = dbService.getSubmissionForVerification(submissionId);
    if (!content) {
      return res.status(404).json({ error: "Submission content not found" });
    }

    // Calculate current hash
    const currentHash = generateContentHash(content);
    const storedHash = submission.content_hash || "";

    // Verify hash
    const verified = verifyContentHash(content, storedHash);

    const result: ContentVerificationDto = {
      submissionId,
      sqliteHash: storedHash,
      currentHash,
      verified,
      moderationStatus: submission.moderation_status || "active",
      lastModified: submission.created_at
    };

    res.json(result);
  } catch (error) {
    console.error("Content verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Bulk verify content hashes for multiple submissions
 * POST /api/admin/verify-bulk
 */
export async function bulkVerifyContent_endpoint(req: Request, res: Response) {
  try {
    const { submissionIds }: BulkVerificationRequestDto = req.body;

    if (!Array.isArray(submissionIds)) {
      return res.status(400).json({ error: "submissionIds must be an array" });
    }

    if (submissionIds.length === 0) {
      return res.status(400).json({ error: "submissionIds cannot be empty" });
    }

    if (submissionIds.length > 1000) {
      return res.status(400).json({ error: "Maximum 1000 submissions per request" });
    }

    // Get submissions for verification
    const submissions = dbService.bulkGetSubmissionsForVerification(submissionIds);

    // Prepare verification items
    const verificationItems = submissions.map((sub) => ({
      id: sub.id,
      content: sub.content,
      expectedHash: sub.storedHash
    }));

    // Perform bulk verification
    const verificationResults = bulkVerifyContent(verificationItems);

    // Format results
    const results: BulkVerificationResultDto["results"] = verificationResults.map((result) => ({
      id: result.id,
      status: result.verified ? ("verified" as const) : ("hash_mismatch" as const),
      sqliteHash: result.expectedHash,
      currentHash: result.currentHash
    }));

    // Add not found entries
    const foundIds = new Set(submissions.map((s) => s.id));
    const notFoundIds = submissionIds.filter((id) => !foundIds.has(id));
    for (const id of notFoundIds) {
      results.push({
        id,
        status: "not_found" as const
      });
    }

    const response: BulkVerificationResultDto = { results };
    res.json(response);
  } catch (error) {
    console.error("Bulk verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Moderate submission content
 * POST /api/admin/submissions/:id/moderate
 */
export async function moderateSubmission(req: Request, res: Response) {
  try {
    const submissionId = parseInt(req.params.id);

    if (isNaN(submissionId)) {
      return res.status(400).json({ error: "Invalid submission ID" });
    }

    const { action, reason, newContent }: ModerationRequestDto = req.body;

    if (!action) {
      return res.status(400).json({ error: "Action is required" });
    }

    if (!["flagged", "removed", "modified", "restored"].includes(action)) {
      return res.status(400).json({
        error: "Invalid action. Must be one of: flagged, removed, modified, restored"
      });
    }

    if (action === "modified" && !newContent) {
      return res.status(400).json({ error: "New content is required for modify action" });
    }

    // For now, use a placeholder admin user. In production, this would come from authentication
    const adminUser = (req.headers["admin-user"] as string) || "admin";

    // Perform moderation
    const result = dbService.moderateSubmission(submissionId, action, reason, adminUser, newContent);

    if (!result.success) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const response: ModerationResponseDto = {
      success: true,
      action,
      originalHash: result.originalHash,
      newHash: result.newHash
    };

    res.json(response);
  } catch (error) {
    console.error("Moderation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get moderation history for a submission
 * GET /api/admin/submissions/:id/moderation-history
 */
export async function getModerationHistory(req: Request, res: Response) {
  try {
    const submissionId = parseInt(req.params.id);

    if (isNaN(submissionId)) {
      return res.status(400).json({ error: "Invalid submission ID" });
    }

    const history = dbService.getModerationHistory(submissionId);
    res.json(history);
  } catch (error) {
    console.error("Moderation history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get content verification statistics
 * GET /api/admin/verification-stats
 */
export async function getVerificationStats(req: Request, res: Response) {
  try {
    // This would be implemented with aggregate queries
    // For now, return placeholder data
    const stats = {
      totalSubmissions: 0,
      verifiedSubmissions: 0,
      flaggedSubmissions: 0,
      removedSubmissions: 0,
      modifiedSubmissions: 0,
      lastVerificationRun: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    console.error("Verification stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
