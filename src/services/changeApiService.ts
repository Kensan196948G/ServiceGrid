// 変更管理APIサービス
import { ChangeRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

class ChangeApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ChangeApiError';
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
      throw new ChangeApiError(
        response.status,
        apiError.code || 'UNKNOWN_ERROR',
        apiError.error || 'API エラーが発生しました'
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ChangeApiError) {
      throw error;
    }
    
    throw new ChangeApiError(0, 'NETWORK_ERROR', 'ネットワークエラーが発生しました');
  }
}

/**
 * 変更リクエスト一覧取得
 */
export async function getChanges(): Promise<ChangeRequest[]> {
  const response = await apiRequest<{ success: boolean; data: ChangeRequest[] }>('/api/changes');
  return response.data;
}

/**
 * 変更統計情報取得
 */
export async function getChangeStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byRisk: Record<string, number>;
}> {
  const response = await apiRequest<{
    success: boolean;
    data: {
      total: number;
      byStatus: Record<string, number>;
      byCategory: Record<string, number>;
      byRisk: Record<string, number>;
    };
  }>('/api/changes/stats');
  return response.data;
}

/**
 * 変更リクエスト詳細取得
 */
export async function getChangeById(id: string): Promise<ChangeRequest> {
  const response = await apiRequest<{ success: boolean; data: ChangeRequest }>(`/api/changes/${id}`);
  return response.data;
}

/**
 * 変更リクエスト作成
 */
export async function createChange(changeRequest: Omit<ChangeRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChangeRequest> {
  const response = await apiRequest<{ success: boolean; data: ChangeRequest }>('/api/changes', {
    method: 'POST',
    body: JSON.stringify(changeRequest),
  });
  return response.data;
}

/**
 * 変更リクエスト更新
 */
export async function updateChange(id: string, changeRequest: Partial<ChangeRequest>): Promise<ChangeRequest> {
  const response = await apiRequest<{ success: boolean; data: ChangeRequest }>(`/api/changes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(changeRequest),
  });
  return response.data;
}

/**
 * 変更リクエスト削除
 */
export async function deleteChange(id: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/api/changes/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 変更リクエスト承認
 */
export async function approveChange(id: string, approver: string): Promise<ChangeRequest> {
  const response = await apiRequest<{ success: boolean; data: ChangeRequest }>(`/api/changes/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approver }),
  });
  return response.data;
}

/**
 * 変更リクエスト却下
 */
export async function rejectChange(id: string, approver: string, reason?: string): Promise<ChangeRequest> {
  const response = await apiRequest<{ success: boolean; data: ChangeRequest }>(`/api/changes/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ approver, reason }),
  });
  return response.data;
}

export { ChangeApiError };