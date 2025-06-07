// サービスリクエストAPIサービス
import { ServiceRequest } from '../types';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from './apiUtils';

/**
 * サービスリクエスト一覧取得
 */
export async function getServiceRequests(): Promise<ServiceRequest[]> {
  const response = await apiGet<{ success: boolean; data: ServiceRequest[] }>('/api/service-requests');
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
  const response = await apiGet<{
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
  const response = await apiGet<{ success: boolean; data: ServiceRequest }>(`/api/service-requests/${id}`);
  return response.data;
}

/**
 * サービスリクエスト作成
 */
export async function createServiceRequest(serviceRequest: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceRequest> {
  const response = await apiPost<{ success: boolean; data: ServiceRequest }>('/api/service-requests', serviceRequest);
  return response.data;
}

/**
 * サービスリクエスト更新
 */
export async function updateServiceRequest(id: string, serviceRequest: Partial<ServiceRequest>): Promise<ServiceRequest> {
  const response = await apiPut<{ success: boolean; data: ServiceRequest }>(`/api/service-requests/${id}`, serviceRequest);
  return response.data;
}

/**
 * サービスリクエスト削除
 */
export async function deleteServiceRequest(id: string): Promise<void> {
  await apiDelete<{ success: boolean; message: string }>(`/api/service-requests/${id}`);
}