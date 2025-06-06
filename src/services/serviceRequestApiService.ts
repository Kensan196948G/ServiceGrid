// サービスリクエストAPIサービス
import { ServiceRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

class ServiceRequestApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ServiceRequestApiError';
  }
}

// 認証ヘッダー取得
function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// APIリクエストヘルパー
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw new ServiceRequestApiError(
        response.status,
        apiError.code || 'UNKNOWN_ERROR',
        apiError.error || 'API エラーが発生しました'
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ServiceRequestApiError) {
      throw error;
    }
    
    throw new ServiceRequestApiError(0, 'NETWORK_ERROR', 'ネットワークエラーが発生しました');
  }
}

/**
 * サービスリクエスト一覧取得
 */
export async function getServiceRequests(): Promise<ServiceRequest[]> {
  const response = await apiRequest<{ success: boolean; data: ServiceRequest[] }>('/api/service-requests');
  return response.data;
}

/**
 * サービスリクエスト統計情報取得
 */
export async function getServiceRequestStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}> {
  const response = await apiRequest<{
    success: boolean;
    data: {
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
    };
  }>('/api/service-requests/stats');
  return response.data;
}

/**
 * サービスリクエスト詳細取得
 */
export async function getServiceRequestById(id: string): Promise<ServiceRequest> {
  const response = await apiRequest<{ success: boolean; data: ServiceRequest }>(`/api/service-requests/${id}`);
  return response.data;
}

/**
 * サービスリクエスト作成
 */
export async function createServiceRequest(serviceRequest: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceRequest> {
  const response = await apiRequest<{ success: boolean; data: ServiceRequest }>('/api/service-requests', {
    method: 'POST',
    body: JSON.stringify(serviceRequest),
  });
  return response.data;
}

/**
 * サービスリクエスト更新
 */
export async function updateServiceRequest(id: string, serviceRequest: Partial<ServiceRequest>): Promise<ServiceRequest> {
  const response = await apiRequest<{ success: boolean; data: ServiceRequest }>(`/api/service-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(serviceRequest),
  });
  return response.data;
}

/**
 * サービスリクエスト削除
 */
export async function deleteServiceRequest(id: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/api/service-requests/${id}`, {
    method: 'DELETE',
  });
}

export { ServiceRequestApiError };