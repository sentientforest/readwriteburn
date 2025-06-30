// Complete TypeScript types for ReadWriteBurn server APIs
// Based on server implementation and database schema

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Fire/Community Types
export interface FireResponse {
  slug: string;
  name: string;
  description?: string;
  created_at: string;
  starter: string;
  authorities: string[];
  moderators: string[];
  entryParent?: string; // For hierarchy support
}

export interface FireCreateRequest {
  entryParent?: string;
  slug: string;
  name: string;
  starter: string;
  description?: string;
  authorities: string[];
  moderators: string[];
  uniqueKey: string;
}

// Submission Types
export interface SubmissionResponse {
  id: number;
  name: string;
  description: string;
  url?: string;
  contributor: string;
  subfire_id: string;
  content_hash: string;
  hash_verified: boolean;
  moderation_status: "active" | "flagged" | "removed" | "modified";
  content_timestamp: number;
  created_at: string;
  updated_at?: string;
  votes?: number;
  entryParent?: string; // For threaded discussions
}

export interface SubmissionCreateRequest {
  name: string;
  fire: string;
  contributor?: string;
  description?: string;
  url?: string;
  entryParent?: string; // For threaded comments
}

// Content Verification Types
export interface ContentVerificationResponse {
  submissionId: number;
  sqliteHash: string;
  chainHash: string;
  currentHash: string;
  verified: boolean;
  moderationStatus: string;
  lastModified?: string;
}

export interface BulkVerificationRequest {
  submissionIds: number[];
}

export interface BulkVerificationResponse {
  results: Array<{
    id: number;
    status: "verified" | "hash_mismatch" | "not_found" | "error";
    sqliteHash?: string;
    currentHash?: string;
    error?: string;
  }>;
}

// Content Moderation Types
export interface ModerationAction {
  action: "flagged" | "removed" | "modified" | "restored";
  reason: string;
  newContent?: string;
}

export type ModerationRequest = ModerationAction;

export interface ModerationResponse {
  success: boolean;
  action: string;
  originalHash: string;
  newHash?: string;
}

export interface ModerationLogEntry {
  id: number;
  submission_id: number;
  action: "flagged" | "removed" | "modified" | "restored";
  reason: string;
  admin_user: string;
  original_hash: string;
  new_hash?: string;
  created_at: string;
}

// Vote Types
export interface VoteResponse {
  id: string;
  voter: string;
  entry: string;
  entryType: string;
  fire: string;
  quantity: string;
  created: number;
}

export interface FetchVotesRequest {
  entryType?: string;
  fire?: string;
  submission?: string;
  bookmark?: string;
  limit?: number;
}

export interface FetchVotesResponse {
  votes: VoteResponse[];
  bookmark?: string;
  hasMore: boolean;
}

export interface CountVotesRequest {
  votes: string[];
  entryType?: string;
  fire?: string;
  submission?: string;
}

export interface CountVotesResponse {
  processed: number;
  errors: string[];
}

export interface VoteCountResponse {
  id: string;
  entry: string;
  entryType: string;
  fire: string;
  quantity: string;
  ranking: number;
  created: number;
  updated: number;
}

// User/Identity Types
export interface UserIdentity {
  user: string;
  publicKey: string;
  alias?: string;
}

export interface UserRegistrationRequest {
  publicKey: string;
}

export interface UserRegistrationResponse {
  success: boolean;
  user: string;
  publicKey: string;
}

// Fee Authorization Types
export interface FeeEstimate {
  feeCode: string;
  quantity: string;
  description?: string;
}

export interface DryRunRequest {
  callerPublicKey: string;
  method: string;
  dto: any;
}

export interface DryRunResponse {
  success: boolean;
  fees?: FeeEstimate[];
  gasUsed?: number;
  error?: string;
}

// Admin Statistics Types
export interface VerificationStats {
  totalSubmissions: number;
  verified: number;
  unverified: number;
  moderated: number;
  verificationRate: number;
}

export interface AdminStats {
  verification: VerificationStats;
  submissions: {
    total: number;
    today: number;
    thisWeek: number;
  };
  votes: {
    total: number;
    totalAmount: string;
    today: number;
  };
  users: {
    total: number;
    active: number;
  };
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search and Filter Types
export interface SearchParams {
  query?: string;
  fire?: string;
  user?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

// WebSocket Event Types (for future real-time features)
export interface WebSocketEvent {
  type: "submission_created" | "vote_cast" | "content_moderated" | "fire_created";
  data: any;
  timestamp: number;
}

// Content Hash Types
export interface HashableContent {
  title: string;
  description: string;
  url?: string;
  timestamp: number;
}

export interface ContentHashResult {
  hash: string;
  timestamp: number;
  algorithm: "sha256";
}

// Utility Types
export type LoadingState = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch?: number;
}

// GalaChain specific types (extended from existing)
export interface GalaChainResponse<T = any> {
  Status: number;
  Message?: string;
  Data?: T;
  Hash?: string;
}

export interface ChainSubmission {
  id: string;
  name: string;
  fire: string;
  entryParent: string;
  contributor: string;
  contentHash: string;
  uniqueKey: string;
  created: number;
}

export interface ChainVote {
  id: string;
  voter: string;
  entry: string;
  entryType: string;
  fire: string;
  quantity: string;
  uniqueKey: string;
  created: number;
}

export interface ChainFire {
  id: string;
  slug: string;
  name: string;
  entryParent: string;
  starter: string;
  authorities: string[];
  moderators: string[];
  uniqueKey: string;
  created: number;
}
