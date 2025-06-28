import { defineStore } from 'pinia';
import { ref } from 'vue';

interface TimeSeriesData {
  timestamp: number;
  value: number;
}

interface AnalyticsOverview {
  totalVotes: number;
  votesChange: number;
  totalGalaBurned: number;
  galaChange: number;
  activeUsers: number;
  usersChange: number;
  totalSubmissions: number;
  submissionsChange: number;
}

interface TrendData {
  votes: TimeSeriesData[];
  gala: TimeSeriesData[];
  users: TimeSeriesData[];
  submissions: TimeSeriesData[];
}

interface ChartData {
  voteTrends: Array<{
    date: string;
    votes: number;
    gala: number;
  }>;
  votingPatterns: Array<{
    hour: number;
    votes: number;
    avgAmount: number;
  }>;
  heatmap: Array<{
    day: number;
    hour: number;
    activity: number;
  }>;
}

interface TopContent {
  submissions: Array<{
    id: number;
    name: string;
    fire: string;
    votes: number;
    galaAmount: number;
    engagement: number;
  }>;
  fires: Array<{
    slug: string;
    name: string;
    submissions: number;
    totalVotes: number;
    totalGala: number;
    growth: number;
  }>;
}

interface Leaderboard {
  users: Array<{
    address: string;
    alias?: string;
    votesGiven: number;
    galaSpent: number;
    submissionsCreated: number;
    reputation: number;
  }>;
}

interface ContentInsights {
  avgVotesPerSubmission: number;
  avgGalaPerVote: number;
  topVotingTime: string;
  contentVerificationRate: number;
  engagementGrowth: number;
  popularCategories: Array<{
    fire: string;
    percentage: number;
  }>;
  userRetention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  contentQuality: {
    verifiedPercentage: number;
    moderatedPercentage: number;
    avgTimeToModeration: number;
  };
}

export const useAnalyticsStore = defineStore('analytics', () => {
  // State
  const overview = ref<AnalyticsOverview>({
    totalVotes: 0,
    votesChange: 0,
    totalGalaBurned: 0,
    galaChange: 0,
    activeUsers: 0,
    usersChange: 0,
    totalSubmissions: 0,
    submissionsChange: 0
  });

  const trendData = ref<TrendData>({
    votes: [],
    gala: [],
    users: [],
    submissions: []
  });

  const chartData = ref<ChartData>({
    voteTrends: [],
    votingPatterns: [],
    heatmap: []
  });

  const topContent = ref<TopContent>({
    submissions: [],
    fires: []
  });

  const leaderboard = ref<Leaderboard>({
    users: []
  });

  const insights = ref<ContentInsights>({
    avgVotesPerSubmission: 0,
    avgGalaPerVote: 0,
    topVotingTime: '',
    contentVerificationRate: 0,
    engagementGrowth: 0,
    popularCategories: [],
    userRetention: {
      daily: 0,
      weekly: 0,
      monthly: 0
    },
    contentQuality: {
      verifiedPercentage: 0,
      moderatedPercentage: 0,
      avgTimeToModeration: 0
    }
  });

  const isLoading = ref(false);
  const error = ref<string>('');

  // Actions
  async function fetchAnalytics(timeRange: string = '7d') {
    isLoading.value = true;
    error.value = '';

    try {
      const apiBase = import.meta.env.VITE_PROJECT_API;
      
      // Fetch all analytics data in parallel
      const [
        overviewRes,
        trendsRes,
        chartsRes,
        topContentRes,
        leaderboardRes,
        insightsRes
      ] = await Promise.all([
        fetch(`${apiBase}/api/analytics/overview?timeRange=${timeRange}`),
        fetch(`${apiBase}/api/analytics/trends?timeRange=${timeRange}`),
        fetch(`${apiBase}/api/analytics/charts?timeRange=${timeRange}`),
        fetch(`${apiBase}/api/analytics/top-content?timeRange=${timeRange}`),
        fetch(`${apiBase}/api/analytics/leaderboard?timeRange=${timeRange}`),
        fetch(`${apiBase}/api/analytics/insights?timeRange=${timeRange}`)
      ]);

      // Check for errors
      if (!overviewRes.ok || !trendsRes.ok || !chartsRes.ok || 
          !topContentRes.ok || !leaderboardRes.ok || !insightsRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      // Parse responses
      const [
        overviewData,
        trendsData,
        chartsData,
        topContentData,
        leaderboardData,
        insightsData
      ] = await Promise.all([
        overviewRes.json(),
        trendsRes.json(),
        chartsRes.json(),
        topContentRes.json(),
        leaderboardRes.json(),
        insightsRes.json()
      ]);

      // Update store state
      overview.value = overviewData;
      trendData.value = trendsData;
      chartData.value = chartsData;
      topContent.value = topContentData;
      leaderboard.value = leaderboardData;
      insights.value = insightsData;

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch analytics';
      console.error('Analytics fetch error:', err);
      
      // Provide fallback mock data for development
      if (import.meta.env.DEV) {
        loadMockData(timeRange);
      }
    } finally {
      isLoading.value = false;
    }
  }

  function loadMockData(timeRange: string) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Generate mock time series data
    const generateTimeSeries = (days: number, baseValue: number, variance: number) => {
      return Array.from({ length: days }, (_, i) => ({
        timestamp: now - (days - i - 1) * dayMs,
        value: Math.max(0, baseValue + (Math.random() - 0.5) * variance)
      }));
    };

    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

    overview.value = {
      totalVotes: 12543,
      votesChange: 15.2,
      totalGalaBurned: 245680000000, // 2456.8 GALA
      galaChange: 23.1,
      activeUsers: 1247,
      usersChange: 8.5,
      totalSubmissions: 892,
      submissionsChange: 12.3
    };

    trendData.value = {
      votes: generateTimeSeries(days, 100, 50),
      gala: generateTimeSeries(days, 15000000000, 8000000000), // ~150 GALA average
      users: generateTimeSeries(days, 50, 25),
      submissions: generateTimeSeries(days, 20, 10)
    };

    chartData.value = {
      voteTrends: generateTimeSeries(days, 100, 50).map((item, index) => ({
        date: new Date(item.timestamp).toISOString().split('T')[0],
        votes: Math.floor(item.value),
        gala: Math.floor(item.value * 1.5)
      })),
      votingPatterns: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        votes: Math.floor(Math.random() * 100 + 20),
        avgAmount: Math.random() * 50 + 10
      })),
      heatmap: Array.from({ length: 7 }, (_, day) =>
        Array.from({ length: 24 }, (_, hour) => ({
          day,
          hour,
          activity: Math.random() * 100
        }))
      ).flat()
    };

    topContent.value = {
      submissions: [
        { id: 1, name: "Revolutionary DeFi Protocol", fire: "defi", votes: 456, galaAmount: 12300000000, engagement: 87.5 },
        { id: 2, name: "NFT Gaming Innovation", fire: "gaming", votes: 342, galaAmount: 9800000000, engagement: 72.1 },
        { id: 3, name: "Web3 Infrastructure", fire: "infrastructure", votes: 289, galaAmount: 7650000000, engagement: 65.3 },
        { id: 4, name: "Smart Contract Audit", fire: "security", votes: 234, galaAmount: 6100000000, engagement: 58.9 },
        { id: 5, name: "Cross-chain Bridge", fire: "interoperability", votes: 198, galaAmount: 5200000000, engagement: 52.7 }
      ],
      fires: [
        { slug: "defi", name: "DeFi", submissions: 67, totalVotes: 1234, totalGala: 45600000000, growth: 23.5 },
        { slug: "gaming", name: "Gaming", submissions: 45, totalVotes: 987, totalGala: 32100000000, growth: 18.2 },
        { slug: "nft", name: "NFTs", submissions: 38, totalVotes: 756, totalGala: 28900000000, growth: 15.7 },
        { slug: "infrastructure", name: "Infrastructure", submissions: 29, totalVotes: 543, totalGala: 19800000000, growth: 12.1 },
        { slug: "security", name: "Security", submissions: 23, totalVotes: 432, totalGala: 16700000000, growth: 9.8 }
      ]
    };

    leaderboard.value = {
      users: [
        { address: "0x1234...5678", alias: "CryptoWhale", votesGiven: 234, galaSpent: 12300000000, submissionsCreated: 12, reputation: 95.2 },
        { address: "0x2345...6789", alias: "DeFiMaster", votesGiven: 198, galaSpent: 10800000000, submissionsCreated: 8, reputation: 88.7 },
        { address: "0x3456...7890", votesGiven: 176, galaSpent: 9200000000, submissionsCreated: 15, reputation: 82.1 },
        { address: "0x4567...8901", alias: "GameFi", votesGiven: 154, galaSpent: 7900000000, submissionsCreated: 6, reputation: 76.8 },
        { address: "0x5678...9012", votesGiven: 132, galaSpent: 6800000000, submissionsCreated: 11, reputation: 71.3 }
      ]
    };

    insights.value = {
      avgVotesPerSubmission: 14.7,
      avgGalaPerVote: 2.3,
      topVotingTime: "14:00-16:00 UTC",
      contentVerificationRate: 87.3,
      engagementGrowth: 18.5,
      popularCategories: [
        { fire: "DeFi", percentage: 34.2 },
        { fire: "Gaming", percentage: 28.1 },
        { fire: "NFTs", percentage: 19.7 },
        { fire: "Infrastructure", percentage: 12.3 },
        { fire: "Security", percentage: 5.7 }
      ],
      userRetention: {
        daily: 68.2,
        weekly: 45.7,
        monthly: 23.8
      },
      contentQuality: {
        verifiedPercentage: 87.3,
        moderatedPercentage: 12.1,
        avgTimeToModeration: 4.2
      }
    };
  }

  async function fetchVoteHistory(userId?: string, timeRange: string = '30d') {
    // Fetch detailed vote history for a specific user or all users
    const apiBase = import.meta.env.VITE_PROJECT_API;
    const url = userId 
      ? `${apiBase}/api/analytics/vote-history/${userId}?timeRange=${timeRange}`
      : `${apiBase}/api/analytics/vote-history?timeRange=${timeRange}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch vote history');
      
      return await response.json();
    } catch (err) {
      console.error('Vote history fetch error:', err);
      throw err;
    }
  }

  async function generateReport(type: 'summary' | 'detailed' | 'export', timeRange: string = '30d') {
    // Generate analytics reports
    const apiBase = import.meta.env.VITE_PROJECT_API;
    
    try {
      const response = await fetch(`${apiBase}/api/analytics/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, timeRange })
      });
      
      if (!response.ok) throw new Error('Failed to generate report');
      
      return await response.json();
    } catch (err) {
      console.error('Report generation error:', err);
      throw err;
    }
  }

  return {
    // State
    overview,
    trendData,
    chartData,
    topContent,
    leaderboard,
    insights,
    isLoading,
    error,
    
    // Actions
    fetchAnalytics,
    fetchVoteHistory,
    generateReport
  };
});