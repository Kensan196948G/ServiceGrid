// 実際のバックエンドAPIとの連携サービス
import { Incident, ItemStatus, Priority } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

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

// HTTPエラーハンドリング
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// API リクエストヘルパー
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // ネットワークエラーなど
    console.error('API Request Error:', error);
    throw new ApiError(0, 'Network error or server unavailable');
  }
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

  const response = await apiRequest<ApiResponse<Incident[]>>(
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
  const response = await apiRequest<any>(`/api/incidents/${id}`);
  
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

  const response = await apiRequest<ApiResponse<Incident>>('/api/incidents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

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

  const response = await apiRequest<ApiResponse<Incident>>(`/api/incidents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

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
  await apiRequest(`/api/incidents/${id}`, {
    method: 'DELETE',
  });
}

// インシデント統計取得
export async function getIncidentStats(): Promise<any[]> {
  const response = await apiRequest<any[]>('/api/incidents/stats');
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