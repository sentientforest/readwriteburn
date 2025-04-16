export interface AssociativeId {
  id: string;
  quantity?: number;
}

export interface AssociativeEntity extends AssociativeId {
  name: string;
  description?: string;
}

export interface SubmissionDto {
  name: string;
  subfire: string;
  contributor?: string;
  description?: string;
  url?: string;
}

export interface SubmissionResDto {
  id: number;
  name: string;
  contributor: string;
  description: string;
  url: string;
  votes: number;
}

export interface SubfireDto {
  slug: string;
  name: string;
  description?: string;
  authorities: string[];
  moderators: string[];
}

export interface SubfireResDto {
  slug: string;
  name: string;
  description?: string;
  authorities: string[];
  moderators: string[];
}

export interface TokenInstanceKey {
  collection: string;
  category: string;
  type: string;
  additionalKey: string;
  instance: string;
}

export interface BurnTokenQuantity {
  tokenInstanceKey: TokenInstanceKey;
  quantity: string;
}

export interface BurnGalaDto {
  tokenInstances: Array<BurnTokenQuantity>;
  owner: string;
  uniqueKey: string;
  signature: string;
}

export interface BurnAndSubmitDto {
  submission: SubmissionDto;
  burnDto: BurnGalaDto;
}

export interface BurnAndVoteDto {
  item_id: string;
  burnDto: BurnGalaDto;
}
