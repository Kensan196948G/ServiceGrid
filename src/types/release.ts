export interface Release {
  release_id: string;
  title: string;
  description: string;
  status: ReleaseStatus;
  release_date: string;
  responsible: string;
  created_at: string;
  updated_at: string;
}

export type ReleaseStatus = 'Planning' | 'Testing' | 'Deployment' | 'Completed' | 'Cancelled';

export type ReleaseType = 'Major' | 'Minor' | 'Patch' | 'Hotfix' | 'Emergency';