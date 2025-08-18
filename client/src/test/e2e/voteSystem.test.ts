import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoteService } from '@/services/VoteService';
import { Fire, Submission } from '@/types/fire';

// Mock fetch globally
global.fetch = vi.fn();

describe('Vote System End-to-End Tests', () => {
  let voteService: VoteService;
  const apiBase = 'http://localhost:4000';
  const mockMetamaskClient = {
    signVote: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    voteService = new VoteService(apiBase, mockMetamaskClient);
  });

  describe('Fire Voting', () => {
    it('should successfully vote on a fire using chain key lookup', async () => {
      const fireSlug = 'test-fire';
      const quantity = 10;
      
      // Mock chain key lookup response
      const chainKeyResponse = {
        fireSlug: fireSlug,
        chainKey: `\x00RWBF\x00${fireSlug}\x00`,
        indexKey: 'RWBF'
      };

      // Mock successful vote submission
      const voteResponse = { success: true };

      // Setup fetch mocks
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => chainKeyResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => voteResponse
        });

      // Mock metamask signing
      mockMetamaskClient.signVote.mockResolvedValue({
        entryType: Fire.INDEX_KEY,
        entryParent: '',
        entry: chainKeyResponse.chainKey,
        quantity: { toString: () => quantity.toString() },
        uniqueKey: 'test-unique-key',
        signature: 'mock-signature'
      });

      // Execute vote
      const result = await voteService.voteOnFire(fireSlug, quantity);

      // Verify chain key lookup
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiBase}/api/fires/${fireSlug}/chain-key`
      );

      // Verify vote DTO construction
      expect(mockMetamaskClient.signVote).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: 'RWBF',
          entryParent: '',
          entry: chainKeyResponse.chainKey,
          quantity: expect.objectContaining({
            toString: expect.any(Function)
          })
        })
      );

      // Verify vote submission
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiBase}/api/fires/${fireSlug}/vote`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('vote')
        })
      );

      // Verify result
      expect(result).toEqual({
        success: true,
        message: 'Vote submitted successfully!'
      });
    });

    it('should handle fire chain key lookup failure', async () => {
      const fireSlug = 'nonexistent-fire';
      
      // Mock failed chain key lookup
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Fire not found' })
      });

      // Execute vote
      const result = await voteService.voteOnFire(fireSlug, 10);

      // Verify error handling
      expect(result).toEqual({
        success: false,
        message: 'Failed to submit fire vote',
        error: 'Failed to fetch fire chain key'
      });
    });
  });

  describe('Submission Voting', () => {
    it('should successfully vote on a top-level submission', async () => {
      const submissionId = 123;
      const quantity = 5;
      
      // Mock chain key lookup response for top-level submission
      const chainKeyResponse = {
        submissionId: submissionId,
        chainKey: `\x00RWBS\x00999\x00submission-123\x00unique-456\x00`,
        indexKey: 'RWBS',
        fireSlug: 'test-fire',
        entryParent: null,
        isTopLevel: true
      };

      // Mock successful vote submission
      const voteResponse = { success: true };

      // Setup fetch mocks
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => chainKeyResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => voteResponse
        });

      // Mock metamask signing
      mockMetamaskClient.signVote.mockResolvedValue({
        entryType: Submission.INDEX_KEY,
        entryParent: `\x00RWBF\x00${chainKeyResponse.fireSlug}\x00`,
        entry: chainKeyResponse.chainKey,
        quantity: { toString: () => quantity.toString() },
        uniqueKey: 'test-unique-key',
        signature: 'mock-signature'
      });

      // Execute vote
      const result = await voteService.voteOnSubmission(submissionId, quantity);

      // Verify chain key lookup
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiBase}/api/submissions/${submissionId}/chain-key`
      );

      // Verify vote DTO construction for top-level submission
      expect(mockMetamaskClient.signVote).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: 'RWBS',
          entryParent: `\\x00RWBF\\x00${chainKeyResponse.fireSlug}\\x00`, // Fire chain key (escaped format)
          entry: chainKeyResponse.chainKey
        })
      );

      // Verify result
      expect(result).toEqual({
        success: true,
        message: 'Vote submitted successfully!'
      });
    });

    it('should successfully vote on a reply submission', async () => {
      const submissionId = 456;
      const quantity = 3;
      const parentChainKey = `\x00RWBS\x00999\x00parent-sub\x00unique-123\x00`;
      
      // Mock chain key lookup response for reply
      const chainKeyResponse = {
        submissionId: submissionId,
        chainKey: `\x00RWBS\x00998\x00reply-sub\x00unique-789\x00`,
        indexKey: 'RWBS',
        fireSlug: 'test-fire',
        entryParent: parentChainKey,
        isTopLevel: false
      };

      // Setup fetch mocks
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => chainKeyResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      // Mock metamask signing
      mockMetamaskClient.signVote.mockResolvedValue({
        entryType: Submission.INDEX_KEY,
        entryParent: parentChainKey, // Parent submission chain key
        entry: chainKeyResponse.chainKey,
        quantity: { toString: () => quantity.toString() },
        uniqueKey: 'test-unique-key',
        signature: 'mock-signature'
      });

      // Execute vote
      const result = await voteService.voteOnSubmission(submissionId, quantity);

      // Verify vote DTO construction for reply
      expect(mockMetamaskClient.signVote).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: 'RWBS',
          entryParent: parentChainKey, // Parent submission's chain key
          entry: chainKeyResponse.chainKey
        })
      );

      expect(result.success).toBe(true);
    });

    it('should handle submission chain key lookup failure', async () => {
      const submissionId = 999;
      
      // Mock failed chain key lookup
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Submission not found' })
      });

      // Execute vote
      const result = await voteService.voteOnSubmission(submissionId, 5);

      // Verify error handling
      expect(result).toEqual({
        success: false,
        message: 'Failed to submit submission vote',
        error: 'Failed to fetch submission chain key'
      });
    });
  });

  describe('Vote DTO Validation', () => {
    it('should validate fire vote parameters', () => {
      const validRequest = {
        target: { type: 'fire' as const, slug: 'test-fire' },
        quantity: 10,
        userAddress: '0x123'
      };

      expect(VoteService.validateVoteRequest(validRequest)).toBeNull();
    });

    it('should reject invalid vote quantities', () => {
      const invalidRequest = {
        target: { type: 'fire' as const, slug: 'test-fire' },
        quantity: 0,
        userAddress: '0x123'
      };

      expect(VoteService.validateVoteRequest(invalidRequest))
        .toBe('Vote quantity must be greater than 0');
    });

    it('should reject missing user authentication', () => {
      const invalidRequest = {
        target: { type: 'fire' as const, slug: 'test-fire' },
        quantity: 10,
        userAddress: ''
      };

      expect(VoteService.validateVoteRequest(invalidRequest))
        .toBe('User must be authenticated to vote');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const fireSlug = 'test-fire';
      
      // Mock network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Execute vote
      const result = await voteService.voteOnFire(fireSlug, 10);

      // Verify error handling
      expect(result).toEqual({
        success: false,
        message: 'Failed to submit fire vote',
        error: 'Network error'
      });
    });

    it('should handle signing errors', async () => {
      const fireSlug = 'test-fire';
      
      // Mock successful chain key lookup
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fireSlug: fireSlug,
          chainKey: `\x00RWBF\x00${fireSlug}\x00`,
          indexKey: 'RWBF'
        })
      });

      // Mock signing error
      mockMetamaskClient.signVote.mockRejectedValueOnce(
        new Error('User rejected signature')
      );

      // Execute vote
      const result = await voteService.voteOnFire(fireSlug, 10);

      // Verify error handling
      expect(result).toEqual({
        success: false,
        message: 'Failed to submit fire vote',
        error: 'User rejected signature'
      });
    });

    it('should handle server submission errors', async () => {
      const fireSlug = 'test-fire';
      
      // Mock successful chain key lookup
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fireSlug: fireSlug,
          chainKey: `\x00RWBF\x00${fireSlug}\x00`,
          indexKey: 'RWBF'
        })
      });

      // Mock successful signing
      mockMetamaskClient.signVote.mockResolvedValueOnce({
        entryType: Fire.INDEX_KEY,
        entryParent: '',
        entry: `\x00RWBF\x00${fireSlug}\x00`,
        quantity: { toString: () => '10' },
        uniqueKey: 'test-unique-key',
        signature: 'mock-signature'
      });

      // Mock server error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Insufficient balance' })
      });

      // Execute vote
      const result = await voteService.voteOnFire(fireSlug, 10);

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });
  });
});