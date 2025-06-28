import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { 
  SubmissionResponse, 
  SubmissionCreateRequest, 
  ContentVerificationResponse,
  BulkVerificationRequest,
  BulkVerificationResponse,
  AsyncState 
} from '@/types/api';

export const useSubmissionsStore = defineStore('submissions', () => {
  // State
  const submissions = ref<SubmissionResponse[]>([]);
  const currentSubmission = ref<SubmissionResponse | null>(null);
  const verificationStatus = ref(new Map<number, ContentVerificationResponse>());
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastFetchByFire = ref(new Map<string, number>());

  // Getters
  const submissionsById = computed(() => {
    const map = new Map<number, SubmissionResponse>();
    submissions.value.forEach(sub => map.set(sub.id, sub));
    return map;
  });

  const submissionsByFire = computed(() => {
    const map = new Map<string, SubmissionResponse[]>();
    submissions.value.forEach(sub => {
      if (!map.has(sub.subfire_id)) {
        map.set(sub.subfire_id, []);
      }
      map.get(sub.subfire_id)!.push(sub);
    });
    return map;
  });

  const verifiedSubmissions = computed(() => {
    return submissions.value.filter(sub => sub.hash_verified);
  });

  const unverifiedSubmissions = computed(() => {
    return submissions.value.filter(sub => !sub.hash_verified);
  });

  // Actions
  async function fetchSubmissions(fireSlug: string, force = false) {
    const lastFetch = lastFetchByFire.value.get(fireSlug);
    const fiveMinutes = 5 * 60 * 1000;
    const isStale = !lastFetch || Date.now() - lastFetch > fiveMinutes;

    if (loading.value) return;
    if (!force && !isStale) return;

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/fires/${fireSlug}/submissions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch submissions: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      // Update submissions for this fire
      const existingSubmissions = submissions.value.filter(sub => sub.subfire_id !== fireSlug);
      submissions.value = [...existingSubmissions, ...data];
      
      lastFetchByFire.value.set(fireSlug, Date.now());
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch submissions';
      console.error('Error fetching submissions:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchSubmissionById(id: number, force = false) {
    const existing = submissionsById.value.get(id);
    if (!force && existing) {
      currentSubmission.value = existing;
      return existing;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/submissions/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch submission: ${response.status}`);
      }

      const submission = await response.json();
      currentSubmission.value = submission;

      // Update submissions array
      const index = submissions.value.findIndex(s => s.id === id);
      if (index !== -1) {
        submissions.value[index] = submission;
      } else {
        submissions.value.push(submission);
      }

      return submission;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch submission';
      console.error('Error fetching submission:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createSubmission(submissionData: SubmissionCreateRequest) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create submission');
      }

      const result = await response.json();
      
      // Refresh submissions for this fire
      await fetchSubmissions(submissionData.fire, true);
      
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create submission';
      console.error('Error creating submission:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function verifyContent(submissionId: number): Promise<ContentVerificationResponse> {
    try {
      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/submissions/${submissionId}/verify`);
      
      if (!response.ok) {
        throw new Error(`Failed to verify content: ${response.status}`);
      }

      const verification = await response.json();
      verificationStatus.value.set(submissionId, verification);
      
      // Update submission verification status if we have it cached
      const submission = submissionsById.value.get(submissionId);
      if (submission) {
        submission.hash_verified = verification.verified;
        submission.moderation_status = verification.moderationStatus;
      }

      return verification;
    } catch (err) {
      console.error('Error verifying content:', err);
      throw err;
    }
  }

  async function bulkVerifyContent(submissionIds: number[]): Promise<BulkVerificationResponse> {
    try {
      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/admin/verify-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ submissionIds })
      });

      if (!response.ok) {
        throw new Error(`Failed to bulk verify: ${response.status}`);
      }

      const result = await response.json();
      
      // Update verification status for all submissions
      result.results.forEach((item: any) => {
        if (item.status === 'verified' || item.status === 'hash_mismatch') {
          const verification: ContentVerificationResponse = {
            submissionId: item.id,
            sqliteHash: item.sqliteHash || '',
            chainHash: '',
            currentHash: item.currentHash || '',
            verified: item.status === 'verified',
            moderationStatus: item.status === 'verified' ? 'active' : 'modified'
          };
          verificationStatus.value.set(item.id, verification);
        }
      });

      return result;
    } catch (err) {
      console.error('Error bulk verifying content:', err);
      throw err;
    }
  }

  async function castVote(submissionId: number, amount: number, metamaskClient: any) {
    try {
      const voteDto = {
        entry: submissionId.toString(),
        fee: {
          feeCode: 'VOTE_FEE',
          uniqueKey: `vote_${submissionId}_${Date.now()}`
        },
        uniqueKey: `vote_${submissionId}_${Date.now()}`
      };

      const signedDto = await metamaskClient.sign(voteDto);

      const response = await fetch(`${import.meta.env.VITE_PROJECT_API}/api/submissions/${submissionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signedDto)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cast vote');
      }

      const result = await response.json();
      
      // Update submission vote count if we have it cached
      const submission = submissionsById.value.get(submissionId);
      if (submission && submission.votes !== undefined) {
        submission.votes += amount;
      }

      return result;
    } catch (err) {
      console.error('Error casting vote:', err);
      throw err;
    }
  }

  function getVerificationStatus(submissionId: number): ContentVerificationResponse | null {
    return verificationStatus.value.get(submissionId) || null;
  }

  function clearCurrentSubmission() {
    currentSubmission.value = null;
  }

  function clearError() {
    error.value = null;
  }

  function addSubmission(submission: SubmissionResponse) {
    const existingIndex = submissions.value.findIndex(s => s.id === submission.id);
    if (existingIndex !== -1) {
      submissions.value[existingIndex] = submission;
    } else {
      submissions.value.push(submission);
    }
  }

  function removeSubmission(id: number) {
    const index = submissions.value.findIndex(s => s.id === id);
    if (index !== -1) {
      submissions.value.splice(index, 1);
    }
    if (currentSubmission.value?.id === id) {
      currentSubmission.value = null;
    }
    verificationStatus.value.delete(id);
  }

  function updateSubmissionModerationStatus(id: number, status: SubmissionResponse['moderation_status'], verified: boolean) {
    const submission = submissionsById.value.get(id);
    if (submission) {
      submission.moderation_status = status;
      submission.hash_verified = verified;
    }
  }

  return {
    // State
    submissions,
    currentSubmission,
    verificationStatus,
    loading,
    error,
    lastFetchByFire,
    // Getters
    submissionsById,
    submissionsByFire,
    verifiedSubmissions,
    unverifiedSubmissions,
    // Actions
    fetchSubmissions,
    fetchSubmissionById,
    createSubmission,
    verifyContent,
    bulkVerifyContent,
    castVote,
    getVerificationStatus,
    clearCurrentSubmission,
    clearError,
    addSubmission,
    removeSubmission,
    updateSubmissionModerationStatus,
  };
});