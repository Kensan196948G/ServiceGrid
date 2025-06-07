// Frontend Release interface based on mockItsmService.ts
export interface Release {
  id: string;
  version: string;
  title: string;
  description: string;
  status: string;
  releaseType: string;
  plannedDeploymentDate: string;
  actualDeploymentDate?: string;
  servicesAffected: string[];
  rolloutPlan: string;
  rollbackPlan?: string;
  testLead?: string;
  deploymentLead: string;
  createdAt: string;
  updatedAt: string;
}

import { apiGet, apiPost, apiPut, apiDelete } from './apiUtils';


export interface ReleaseResponse {
  data: Release[];
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface ReleaseStatsResponse {
  total: number;
  by_status: { [key: string]: number };
  by_type: { [key: string]: number };
  upcoming_count: number;
}

/**
 * Get all releases with optional filtering and pagination
 */
export const getReleases = async (params?: {
  page?: number;
  pageSize?: number;
  title?: string;
  status?: string;
  responsible?: string;
}): Promise<Release[]> => {
  const query = new URLSearchParams();
  
  if (params?.page) query.append('page', params.page.toString());
  if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
  if (params?.title) query.append('title', params.title);
  if (params?.status) query.append('status', params.status);
  if (params?.responsible) query.append('responsible', params.responsible);

  const url = `/api/releases${query.toString() ? '?' + query.toString() : ''}`;
  const response = await apiGet<ReleaseResponse>(url);
  return response.data;
};

/**
 * Get release statistics
 */
export const getReleaseStats = async (): Promise<ReleaseStatsResponse> => {
  return await apiGet<ReleaseStatsResponse>('/api/releases/stats');
};

/**
 * Get a specific release by ID
 */
export const getReleaseById = async (releaseId: string): Promise<Release> => {
  return await apiGet<Release>(`/api/releases/${releaseId}`);
};

/**
 * Create a new release
 */
export const createRelease = async (releaseData: Omit<Release, 'id' | 'createdAt' | 'updatedAt'>): Promise<Release> => {
  const response = await apiPost<{ releaseId: string; data: Release }>('/api/releases', releaseData);
  return response.data;
};

/**
 * Update a release
 */
export const updateRelease = async (releaseId: string, releaseData: Partial<Release>): Promise<Release> => {
  return await apiPut<Release>(`/api/releases/${releaseId}`, releaseData);
};

/**
 * Delete a release
 */
export const deleteRelease = async (releaseId: string): Promise<void> => {
  await apiDelete<void>(`/api/releases/${releaseId}`);
};