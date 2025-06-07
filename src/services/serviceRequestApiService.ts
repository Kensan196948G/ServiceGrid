// サービスリクエストAPIサービス
import { 
  ServiceRequest, 
  ServiceRequestStats, 
  ServiceRequestFilter, 
  ServiceRequestResponse,
  ServiceRequestApproval,
  ServiceRequestFulfillment,
  ServiceRequestTransition
} from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from './apiUtils';

/**
 * サービスリクエスト一覧取得（フィルタ・ページネーション対応）
 */
export async function getServiceRequests(filters?: ServiceRequestFilter): Promise<ServiceRequestResponse> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  const url = `/api/service-requests${params.toString() ? '?' + params.toString() : ''}`;
  return await apiGet<ServiceRequestResponse>(url);
}

/**
 * サービスリクエスト統計情報取得
 */
export async function getServiceRequestStats(): Promise<ServiceRequestStats> {
  return await apiGet<ServiceRequestStats>('/api/service-requests/stats');
}

/**
 * サービスリクエスト詳細取得
 */
export async function getServiceRequestById(id: number | string): Promise<ServiceRequest> {
  return await apiGet<ServiceRequest>(`/api/service-requests/${id}`);
}

/**
 * サービスリクエスト作成
 */
export async function createServiceRequest(
  serviceRequest: Omit<ServiceRequest, 'id' | 'request_id' | 'request_number' | 'created_date' | 'updated_date'>
): Promise<{ success: boolean; message: string; data: ServiceRequest }> {
  return await apiPost<{ success: boolean; message: string; data: ServiceRequest }>(
    '/api/service-requests', 
    serviceRequest
  );
}

/**
 * サービスリクエスト更新
 */
export async function updateServiceRequest(
  id: number | string, 
  serviceRequest: Partial<ServiceRequest>
): Promise<{ success: boolean; message: string; data: ServiceRequest }> {
  return await apiPut<{ success: boolean; message: string; data: ServiceRequest }>(
    `/api/service-requests/${id}`, 
    serviceRequest
  );
}

/**
 * サービスリクエスト承認/却下
 */
export async function approveServiceRequest(
  id: number | string, 
  approval: ServiceRequestApproval
): Promise<{ success: boolean; message: string; data: ServiceRequest }> {
  return await apiPut<{ success: boolean; message: string; data: ServiceRequest }>(
    `/api/service-requests/${id}/approve`, 
    approval
  );
}

/**
 * サービスリクエスト完了処理
 */
export async function fulfillServiceRequest(
  id: number | string, 
  fulfillment: ServiceRequestFulfillment
): Promise<{ success: boolean; message: string; completed_date: string }> {
  return await apiPut<{ success: boolean; message: string; completed_date: string }>(
    `/api/service-requests/${id}/fulfill`, 
    fulfillment
  );
}

/**
 * サービスリクエストステータス遷移
 */
export async function transitionServiceRequest(
  id: number | string, 
  transition: ServiceRequestTransition
): Promise<{ success: boolean; message: string; old_status: string; new_status: string }> {
  return await apiPut<{ success: boolean; message: string; old_status: string; new_status: string }>(
    `/api/service-requests/${id}/transition`, 
    transition
  );
}

/**
 * サービスリクエスト削除
 */
export async function deleteServiceRequest(id: number | string): Promise<{ success: boolean; message: string; deleted_id: string }> {
  return await apiDelete<{ success: boolean; message: string; deleted_id: string }>(`/api/service-requests/${id}`);
}