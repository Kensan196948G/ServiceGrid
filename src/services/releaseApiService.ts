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

import { apiCall } from './apiUtils';

const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:8082';

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

  const url = `${API_BASE}/api/releases${query.toString() ? '?' + query.toString() : ''}`;
  const response = await apiCall<ReleaseResponse>('GET', url);
  return response.data;
};

/**
 * Get release statistics
 */
export const getReleaseStats = async (): Promise<ReleaseStatsResponse> => {
  return await apiCall<ReleaseStatsResponse>('GET', `${API_BASE}/api/releases/stats`);
};

/**
 * Get a specific release by ID
 */
export const getReleaseById = async (releaseId: string): Promise<Release> => {
  return await apiCall<Release>('GET', `${API_BASE}/api/releases/${releaseId}`);
};

/**
 * Create a new release
 */
export const createRelease = async (releaseData: Omit<Release, 'id' | 'createdAt' | 'updatedAt'>): Promise<Release> => {
  const response = await apiCall<{ releaseId: string; data: Release }>('POST', `${API_BASE}/api/releases`, releaseData);
  return response.data;
};

/**
 * Update a release
 */
export const updateRelease = async (releaseId: string, releaseData: Partial<Release>): Promise<Release> => {
  return await apiCall<Release>('PUT', `${API_BASE}/api/releases/${releaseId}`, releaseData);
};

/**
 * Delete a release
 */
export const deleteRelease = async (releaseId: string): Promise<void> => {
  await apiCall<void>('DELETE', `${API_BASE}/api/releases/${releaseId}`);
};