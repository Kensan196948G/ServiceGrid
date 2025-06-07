// 実際のバックエンドAPIとの連携サービス
import { Incident, ItemStatus, Priority } from '../types';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from './apiUtils';

// API レスポンス型定義
interface ApiResponse<T> {
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  error?: string;
}

interface IncidentFilters {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  search?: string;
}

// インシデント一覧取得
export async function getIncidents(
  page: number = 1, 
  limit: number = 20, 
  filters: IncidentFilters = {}
): Promise<{ incidents: Incident[]; pagination: any }> {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
    )
  });

  const response = await apiGet<ApiResponse<Incident[]>>(
    `/api/incidents?${queryParams}`
  );

  // APIレスポンスをフロントエンド型に変換
  const incidents = response.data?.map((incident: any) => ({
    id: String(incident.id || incident.incident_id),
    title: incident.title,
    description: incident.description,
    reportedBy: incident.reportedBy || incident.reported_by || incident.reportedBy,
    assignedTo: incident.assignedTo || incident.assigned_to || incident.assignedTo,
    status: incident.status as ItemStatus,
    priority: incident.priority as Priority,
    createdAt: incident.createdAt || incident.created_at || new Date().toISOString(),
    updatedAt: incident.updatedAt || incident.updated_at || new Date().toISOString(),
    category: incident.category || 'General'
  })) || [];

  return {
    incidents,
    pagination: response.pagination || {
      page: 1,
      limit: 20,
      total: incidents.length,
      totalPages: 1
    }
  };
}

// インシデント詳細取得
export async function getIncidentById(id: string): Promise<Incident> {
  const response = await apiGet<any>(`/api/incidents/${id}`);
  
  // APIレスポンスをフロントエンド型に変換
  const incident = response.data || response;
  return {
    id: String(incident.id || incident.incident_id),
    title: incident.title,
    description: incident.description,
    reportedBy: incident.reportedBy || incident.reported_by || incident.reportedBy,
    assignedTo: incident.assignedTo || incident.assigned_to || incident.assignedTo,
    status: incident.status as ItemStatus,
    priority: incident.priority as Priority,
    createdAt: incident.createdAt || incident.created_at || new Date().toISOString(),
    updatedAt: incident.updatedAt || incident.updated_at || new Date().toISOString(),
    category: incident.category || 'General'
  };
}

// インシデント作成
export async function createIncident(incidentData: Partial<Incident>): Promise<Incident> {
  const payload = {
    title: incidentData.title,
    description: incidentData.description,
    reported_by: incidentData.reportedBy,
    assigned_to: incidentData.assignedTo,
    status: incidentData.status || 'Open',
    priority: incidentData.priority || 'Medium',
    category: incidentData.category || 'General'
  };

  const response = await apiPost<ApiResponse<Incident>>('/api/incidents', payload);

  // 作成されたインシデントデータを返す
  const incident = response.incident || response.data || response;
  return {
    id: String(incident.id || incident.incident_id),
    title: incident.title,
    description: incident.description,
    reportedBy: incident.reportedBy || incident.reported_by || incident.reportedBy,
    assignedTo: incident.assignedTo || incident.assigned_to || incident.assignedTo,
    status: incident.status as ItemStatus,
    priority: incident.priority as Priority,
    createdAt: incident.createdAt || incident.created_at || new Date().toISOString(),
    updatedAt: incident.updatedAt || incident.updated_at || new Date().toISOString(),
    category: incident.category || 'General'
  };
}

// インシデント更新
export async function updateIncident(id: string, updates: Partial<Incident>): Promise<Incident> {
  const payload = {
    title: updates.title,
    description: updates.description,
    assigned_to: updates.assignedTo,
    status: updates.status,
    priority: updates.priority,
    category: updates.category
  };

  const response = await apiPut<ApiResponse<Incident>>(`/api/incidents/${id}`, payload);

  const incident = response.incident || response.data || response;
  return {
    id: String(incident.id || incident.incident_id),
    title: incident.title,
    description: incident.description,
    reportedBy: incident.reportedBy || incident.reported_by || incident.reportedBy,
    assignedTo: incident.assignedTo || incident.assigned_to || incident.assignedTo,
    status: incident.status as ItemStatus,
    priority: incident.priority as Priority,
    createdAt: incident.createdAt || incident.created_at || new Date().toISOString(),
    updatedAt: incident.updatedAt || incident.updated_at || new Date().toISOString(),
    category: incident.category || 'General'
  };
}

// インシデント削除
export async function deleteIncident(id: string): Promise<void> {
  await apiDelete(`/api/incidents/${id}`);
}

// インシデント統計取得
export async function getIncidentStats(): Promise<any[]> {
  const response = await apiGet<any[]>('/api/incidents/stats');
  return response;
}

// エラーメッセージのヘルパー
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}