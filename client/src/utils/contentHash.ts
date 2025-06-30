import type { ContentHashResult, HashableContent } from "@/types/api";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

/**
 * Generate a cryptographic hash for content verification
 * Uses SHA-256 with timestamp salting to prevent rainbow table attacks
 */
export async function generateContentHash(content: HashableContent): Promise<ContentHashResult> {
  try {
    // Create normalized content object
    const normalizedContent = {
      title: content.title.trim(),
      description: content.description.trim(),
      url: content.url?.trim() || "",
      timestamp: content.timestamp
    };

    // Serialize to deterministic JSON string
    const contentString = JSON.stringify(normalizedContent);

    // Convert to bytes and hash
    const contentBytes = new TextEncoder().encode(contentString);
    const hashBytes = sha256(contentBytes);

    // Return structured result
    return {
      hash: bytesToHex(hashBytes),
      timestamp: content.timestamp,
      algorithm: "sha256"
    };
  } catch (error) {
    throw new Error(
      `Failed to generate content hash: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate hash for display purposes (with sha256: prefix)
 */
export async function generateDisplayHash(content: HashableContent): Promise<string> {
  const result = await generateContentHash(content);
  return `sha256:${result.hash}`;
}

/**
 * Verify if two content objects would produce the same hash
 */
export async function verifyContentHash(content: HashableContent, expectedHash: string): Promise<boolean> {
  try {
    const result = await generateContentHash(content);
    const computedHash = expectedHash.startsWith("sha256:") ? expectedHash : `sha256:${expectedHash}`;
    return `sha256:${result.hash}` === computedHash;
  } catch {
    return false;
  }
}
