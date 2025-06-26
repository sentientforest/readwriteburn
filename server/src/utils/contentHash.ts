import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Content that can be hashed for verification
 */
export interface HashableContent {
  title: string;
  description: string;
  url?: string;
  timestamp: number; // Unix timestamp as salt
}

/**
 * Result of content verification
 */
export interface VerificationResult {
  submissionId: number;
  sqliteHash: string;
  chainHash?: string;
  currentHash: string;
  verified: boolean;
  moderationStatus: string;
  lastModified?: string;
}

/**
 * Moderation action types
 */
export type ModerationAction = "flagged" | "removed" | "modified" | "restored";

/**
 * Moderation log entry
 */
export interface ModerationLogEntry {
  id: number;
  submissionId: number;
  action: ModerationAction;
  reason?: string;
  adminUser: string;
  originalHash?: string;
  newHash?: string;
  createdAt: string;
}

/**
 * Prepare content for hashing by normalizing and adding salt
 */
export function prepareContentForHashing(content: HashableContent): string {
  return JSON.stringify({
    title: content.title.trim(),
    description: content.description.trim(),
    url: content.url?.trim() || "",
    timestamp: content.timestamp
  });
}

/**
 * Generate SHA-256 hash of content using noble/hashes
 */
export function generateContentHash(content: HashableContent): string {
  const normalizedContent = prepareContentForHashing(content);
  const contentBytes = new TextEncoder().encode(normalizedContent);
  const hashBytes = sha256(contentBytes);
  const hash = bytesToHex(hashBytes);
  return `sha256:${hash}`;
}

/**
 * Verify that current content matches the stored hash
 */
export function verifyContentHash(content: HashableContent, expectedHash: string): boolean {
  const currentHash = generateContentHash(content);
  return constantTimeEqual(currentHash, expectedHash);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extract hash from hash string (removes sha256: prefix if present)
 */
export function extractHash(hashString: string): string {
  return hashString.startsWith("sha256:") ? hashString.slice(7) : hashString;
}

/**
 * Format hash with sha256: prefix
 */
export function formatHash(hash: string): string {
  return hash.startsWith("sha256:") ? hash : `sha256:${hash}`;
}

/**
 * Validate hash format
 */
export function isValidHashFormat(hash: string): boolean {
  const cleanHash = extractHash(hash);
  return /^[a-f0-9]{64}$/i.test(cleanHash);
}

/**
 * Generate a timestamp for content hashing
 */
export function generateTimestamp(): number {
  return Date.now();
}

/**
 * Create hashable content from submission data
 */
export function createHashableContent(
  title: string,
  description: string,
  url?: string,
  timestamp?: number
): HashableContent {
  return {
    title,
    description,
    url,
    timestamp: timestamp || generateTimestamp()
  };
}

/**
 * Hash submission content for storage
 */
export function hashSubmissionContent(
  title: string,
  description: string,
  url?: string,
  timestamp?: number
): { hash: string; timestamp: number } {
  const contentTimestamp = timestamp || generateTimestamp();
  const content = createHashableContent(title, description, url, contentTimestamp);
  const hash = generateContentHash(content);

  return {
    hash,
    timestamp: contentTimestamp
  };
}

/**
 * Bulk verify multiple content items
 */
export function bulkVerifyContent(
  items: Array<{
    id: number;
    content: HashableContent;
    expectedHash: string;
  }>
): Array<{
  id: number;
  verified: boolean;
  currentHash: string;
  expectedHash: string;
}> {
  return items.map((item) => ({
    id: item.id,
    verified: verifyContentHash(item.content, item.expectedHash),
    currentHash: generateContentHash(item.content),
    expectedHash: item.expectedHash
  }));
}

/**
 * Generate hash for modified content during moderation
 */
export function hashModifiedContent(originalContent: HashableContent, newDescription: string): string {
  const modifiedContent: HashableContent = {
    ...originalContent,
    description: newDescription
  };

  return generateContentHash(modifiedContent);
}
