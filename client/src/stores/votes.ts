import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { 
  VoteResponse, 
  FetchVotesRequest, 
  FetchVotesResponse,
  CountVotesRequest,
  CountVotesResponse,
  VoteCountResponse
} from '@/types/api';

export const useVotesStore = defineStore('votes', () => {
  // State
  const votes = ref<VoteResponse[]>([]);
  const voteCounts = ref<VoteCountResponse[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastFetch = ref<number | null>(null);
  const bookmark = ref<string | null>(null);
  const hasMore = ref(true);

  // Getters
  const votesByEntry = computed(() => {
    const map = new Map<string, VoteResponse[]>();
    votes.value.forEach(vote => {
      if (!map.has(vote.entry)) {
        map.set(vote.entry, []);
      }
      map.get(vote.entry)!.push(vote);
    });
    return map;
  });

  const votesByFire = computed(() => {
    const map = new Map<string, VoteResponse[]>();
    votes.value.forEach(vote => {
      if (!map.has(vote.fire)) {
        map.set(vote.fire, []);
      }
      map.get(vote.fire)!.push(vote);
    });
    return map;
  });

  const totalVoteAmount = computed(() => {
    return votes.value.reduce((total, vote) => {
      return total + parseFloat(vote.quantity);
    }, 0);
  });

  const voteCountsByEntry = computed(() => {
    const map = new Map<string, VoteCountResponse>();
    voteCounts.value.forEach(count => {
      map.set(count.entry, count);
    });
    return map;
  });

  // Actions
  async function fetchVotes(params: FetchVotesRequest = {}, append = false) {
    loading.value = true;
    error.value = null;

    try {
      const searchParams = new URLSearchParams();
      
      if (params.entryType) searchParams.append('entryType', params.entryType);
      if (params.fire) searchParams.append('fire', params.fire);
      if (params.submission) searchParams.append('submission', params.submission);
      if (params.bookmark) searchParams.append('bookmark', params.bookmark);
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(
        `${import.meta.env.VITE_GALASWAP_API}/api/votes?${searchParams.toString()}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch votes: ${response.status}`);
      }

      const result: FetchVotesResponse = await response.json();
      
      if (append) {
        votes.value = [...votes.value, ...result.votes];
      } else {
        votes.value = result.votes;
      }
      
      bookmark.value = result.bookmark || null;
      hasMore.value = result.hasMore;
      lastFetch.value = Date.now();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch votes';
      console.error('Error fetching votes:', err);
    } finally {
      loading.value = false;
    }
  }

  async function loadMoreVotes(params: FetchVotesRequest = {}) {
    if (!hasMore.value || loading.value) return;
    
    const requestParams = {
      ...params,
      bookmark: bookmark.value || undefined
    };
    
    await fetchVotes(requestParams, true);
  }

  async function countVotes(request: CountVotesRequest): Promise<CountVotesResponse> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${import.meta.env.VITE_GALASWAP_API}/api/votes/count`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to count votes');
      }

      const result = await response.json();
      
      // Refresh vote counts after processing
      await fetchVoteCounts();
      
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to count votes';
      console.error('Error counting votes:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchVoteCounts(fire?: string, submission?: string) {
    try {
      const searchParams = new URLSearchParams();
      if (fire) searchParams.append('fire', fire);
      if (submission) searchParams.append('submission', submission);

      const response = await fetch(
        `${import.meta.env.VITE_GALASWAP_API}/api/votes/counts?${searchParams.toString()}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vote counts: ${response.status}`);
      }

      const result = await response.json();
      voteCounts.value = Array.isArray(result) ? result : [];
    } catch (err) {
      console.error('Error fetching vote counts:', err);
      // Don't set error state for vote counts as it's supplementary data
    }
  }

  async function refreshVoteData(params: FetchVotesRequest = {}) {
    await Promise.all([
      fetchVotes(params),
      fetchVoteCounts(params.fire, params.submission)
    ]);
  }

  function getVotesForEntry(entryId: string): VoteResponse[] {
    return votesByEntry.value.get(entryId) || [];
  }

  function getVotesForFire(fireSlug: string): VoteResponse[] {
    return votesByFire.value.get(fireSlug) || [];
  }

  function getVoteCountForEntry(entryId: string): VoteCountResponse | null {
    return voteCountsByEntry.value.get(entryId) || null;
  }

  function getTotalVotesForEntry(entryId: string): number {
    const entryVotes = getVotesForEntry(entryId);
    return entryVotes.reduce((total, vote) => {
      return total + parseFloat(vote.quantity);
    }, 0);
  }

  function clearVotes() {
    votes.value = [];
    bookmark.value = null;
    hasMore.value = true;
  }

  function clearVoteCounts() {
    voteCounts.value = [];
  }

  function clearError() {
    error.value = null;
  }

  function addVote(vote: VoteResponse) {
    // Add vote if not already present
    const exists = votes.value.some(v => v.id === vote.id);
    if (!exists) {
      votes.value.unshift(vote); // Add to beginning for latest first
    }
  }

  function removeVote(voteId: string) {
    const index = votes.value.findIndex(v => v.id === voteId);
    if (index !== -1) {
      votes.value.splice(index, 1);
    }
  }

  // Statistics computed values
  const voteStatistics = computed(() => {
    const stats = {
      totalVotes: votes.value.length,
      totalAmount: totalVoteAmount.value,
      averageVote: votes.value.length > 0 ? totalVoteAmount.value / votes.value.length : 0,
      fireBreakdown: new Map<string, { count: number; amount: number }>(),
      entryBreakdown: new Map<string, { count: number; amount: number }>()
    };

    votes.value.forEach(vote => {
      const amount = parseFloat(vote.quantity);
      
      // Fire breakdown
      if (!stats.fireBreakdown.has(vote.fire)) {
        stats.fireBreakdown.set(vote.fire, { count: 0, amount: 0 });
      }
      const fireStats = stats.fireBreakdown.get(vote.fire)!;
      fireStats.count++;
      fireStats.amount += amount;

      // Entry breakdown
      if (!stats.entryBreakdown.has(vote.entry)) {
        stats.entryBreakdown.set(vote.entry, { count: 0, amount: 0 });
      }
      const entryStats = stats.entryBreakdown.get(vote.entry)!;
      entryStats.count++;
      entryStats.amount += amount;
    });

    return stats;
  });

  return {
    // State
    votes,
    voteCounts,
    loading,
    error,
    lastFetch,
    bookmark,
    hasMore,
    // Getters
    votesByEntry,
    votesByFire,
    totalVoteAmount,
    voteCountsByEntry,
    voteStatistics,
    // Actions
    fetchVotes,
    loadMoreVotes,
    countVotes,
    fetchVoteCounts,
    refreshVoteData,
    getVotesForEntry,
    getVotesForFire,
    getVoteCountForEntry,
    getTotalVotesForEntry,
    clearVotes,
    clearVoteCounts,
    clearError,
    addVote,
    removeVote,
  };
});