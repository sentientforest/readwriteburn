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

export interface SubmissionDto {
  name: string;
  description?: string;
  url?: string;
  subfire: string;
  contributor?: string;
}

export interface SubmissionResDto {
  id: number;
  name: string;
  contributor: string;
  description?: string;
  url?: string;
  subfire: string;
  votes: number;
  created_at: string;
}
