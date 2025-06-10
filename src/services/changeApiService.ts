// 変更管理APIサービス
import { ChangeRequest, ItemStatus } from '../types';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8082';

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

// フィールドマッピング関数: Frontend → Backend
function mapFrontendToBackend(frontendChange: Partial<ChangeRequest>): any {
  const mapped: any = {};
  
  // Core fields
  if (frontendChange.title) mapped.subject = frontendChange.title;
  if (frontendChange.description) mapped.detail = frontendChange.description;
  if (frontendChange.requester) {
    mapped.requested_by_user_id = 1; // TODO: Lookup user ID from username
  }
  
  // Status mapping
  if (frontendChange.status) {
    const statusMap: Record<string, string> = {
      [ItemStatus.NEW]: 'Requested',
      [ItemStatus.PENDING_APPROVAL]: 'Requested',
      [ItemStatus.APPROVED]: 'Approved',
      [ItemStatus.SCHEDULED]: 'Approved',
      [ItemStatus.IN_PROGRESS]: 'In Progress',
      [ItemStatus.IMPLEMENTED]: 'Implemented',
      [ItemStatus.CLOSED]: 'Implemented',
      [ItemStatus.REJECTED]: 'Rejected'
    };
    mapped.status = statusMap[frontendChange.status] || 'Requested';
  }
  
  // Priority mapping
  if (frontendChange.priority) {
    mapped.priority = frontendChange.priority;
  }
  
  // Type mapping (Medium priority -> Normal type)
  mapped.type = frontendChange.priority === 'Critical' ? 'Emergency' : 'Normal';
  
  // Risk and impact
  if (frontendChange.risk) mapped.risk_level = frontendChange.risk;
  if (frontendChange.impact) mapped.impact_level = frontendChange.impact;
  
  // Implementation details
  if (frontendChange.implementationPlan) mapped.implementation_plan = frontendChange.implementationPlan;
  if (frontendChange.backoutPlan) mapped.backout_plan = frontendChange.backoutPlan;
  if (frontendChange.testPlan) mapped.test_plan = frontendChange.testPlan;
  if (frontendChange.businessImpact) mapped.business_impact = frontendChange.businessImpact;
  if (frontendChange.changeReason) mapped.change_reason = frontendChange.changeReason;
  
  // Dates
  if (frontendChange.plannedStartDate) mapped.scheduled_start_date = frontendChange.plannedStartDate.split('T')[0];
  if (frontendChange.plannedEndDate) mapped.scheduled_end_date = frontendChange.plannedEndDate.split('T')[0];
  
  return mapped;
}

// フィールドマッピング関数: Backend → Frontend
function mapBackendToFrontend(backendChange: any): ChangeRequest {
  const mapped: ChangeRequest = {
    id: backendChange.change_id?.toString() || '',
    title: backendChange.subject || '',
    description: backendChange.detail || '',
    requester: backendChange.requested_by_username || backendChange.requested_by || '',
    
    // Status mapping
    status: mapBackendStatusToFrontend(backendChange.status),
    priority: backendChange.priority || 'Medium',
    
    // Category mapping (need to derive from type or set default)
    category: backendChange.type === 'Emergency' ? 'セキュリティ' : 'その他',
    
    // Risk and impact
    impact: backendChange.impact_level || 'Medium',
    urgency: 'Medium', // Default, as backend doesn't have urgency
    risk: backendChange.risk_level || 'Medium',
    
    // Implementation plans
    implementationPlan: backendChange.implementation_plan || '',
    backoutPlan: backendChange.backout_plan || '',
    testPlan: backendChange.test_plan || '',
    businessImpact: backendChange.business_impact || '',
    changeReason: backendChange.change_reason || '',
    
    // Dates
    plannedStartDate: backendChange.scheduled_start_date || new Date().toISOString(),
    plannedEndDate: backendChange.scheduled_end_date || new Date().toISOString(),
    actualStartDate: backendChange.actual_start_date,
    actualEndDate: backendChange.actual_end_date,
    deadline: backendChange.deadline,
    
    // Timestamps
    createdAt: backendChange.created_date || backendChange.request_date || new Date().toISOString(),
    updatedAt: backendChange.updated_date || new Date().toISOString(),
    requestDate: backendChange.request_date,
    approveDate: backendChange.approve_date,
    
    // Approval info
    approver: backendChange.approved_by_username || backendChange.approved_by,
    assignedTo: backendChange.implemented_by_username,
    
    // Backend field mapping (for potential reverse operations)
    change_id: backendChange.change_id,
    subject: backendChange.subject,
    detail: backendChange.detail,
    requested_by: backendChange.requested_by_username,
    approved_by: backendChange.approved_by_username,
    type: backendChange.type,
    risk_level: backendChange.risk_level,
    impact_level: backendChange.impact_level,
    implementation_plan: backendChange.implementation_plan,
    backout_plan: backendChange.backout_plan,
    test_plan: backendChange.test_plan,
    business_impact: backendChange.business_impact,
    change_reason: backendChange.change_reason,
    scheduled_start_date: backendChange.scheduled_start_date,
    scheduled_end_date: backendChange.scheduled_end_date,
    actual_start_date: backendChange.actual_start_date,
    actual_end_date: backendChange.actual_end_date,
    created_date: backendChange.created_date,
    updated_date: backendChange.updated_date,
    request_date: backendChange.request_date,
    approve_date: backendChange.approve_date,
    implementation_status: backendChange.implementation_status,
    post_implementation_review: backendChange.post_implementation_review
  };
  
  return mapped;
}

// Status mapping helper
function mapBackendStatusToFrontend(backendStatus: string): ItemStatus {
  const statusMap: Record<string, ItemStatus> = {
    'Requested': ItemStatus.PENDING_APPROVAL,
    'Pending CAB': ItemStatus.PENDING_APPROVAL,
    'Approved': ItemStatus.APPROVED,
    'Scheduled': ItemStatus.SCHEDULED,
    'In Progress': ItemStatus.IN_PROGRESS,
    'Implemented': ItemStatus.IMPLEMENTED,
    'Failed': ItemStatus.REJECTED,
    'Rejected': ItemStatus.REJECTED,
    'Cancelled': ItemStatus.REJECTED,
    'Closed': ItemStatus.CLOSED
  };
  
  return statusMap[backendStatus] || ItemStatus.NEW;
}

/**
 * 変更リクエスト一覧取得
 */
export async function getChanges(): Promise<ChangeRequest[]> {
  const response = await apiRequest<{ data: any[]; pagination?: any }>('/api/changes');
  
  // Backend returns array of change objects, map them to frontend format
  const changes = Array.isArray(response.data) ? response.data : response.data || [];
  return changes.map(mapBackendToFrontend);
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
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    by_risk_level: Record<string, number>;
  }>('/api/changes/stats');
  
  // Map backend stats format to frontend format
  return {
    total: response.total,
    byStatus: response.by_status || {},
    byCategory: response.by_type || {}, // Map type to category
    byRisk: response.by_risk_level || {}
  };
}

/**
 * 変更リクエスト詳細取得
 */
export async function getChangeById(id: string): Promise<ChangeRequest> {
  const backendChange = await apiRequest<any>(`/api/changes/${id}`);
  return mapBackendToFrontend(backendChange);
}

/**
 * 変更リクエスト作成
 */
export async function createChange(changeRequest: Omit<ChangeRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChangeRequest> {
  const backendData = mapFrontendToBackend(changeRequest);
  
  const response = await apiRequest<{ success: boolean; data: any }>('/api/changes', {
    method: 'POST',
    body: JSON.stringify(backendData),
  });
  
  return mapBackendToFrontend(response.data);
}

/**
 * 変更リクエスト更新
 */
export async function updateChange(id: string, changeRequest: Partial<ChangeRequest>): Promise<ChangeRequest> {
  const backendData = mapFrontendToBackend(changeRequest);
  
  const response = await apiRequest<{ success: boolean; data?: any; message?: string }>(`/api/changes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(backendData),
  });
  
  // If backend doesn't return data, fetch the updated record
  if (response.data) {
    return mapBackendToFrontend(response.data);
  } else {
    // Fetch updated record
    return getChangeById(id);
  }
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
  const response = await apiRequest<{ success: boolean; message: string; new_status?: string }>(`/api/changes/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approve' }),
  });
  
  // Fetch updated record since backend may not return full data
  return getChangeById(id);
}

/**
 * 変更リクエスト却下
 */
export async function rejectChange(id: string, approver: string, reason?: string): Promise<ChangeRequest> {
  const response = await apiRequest<{ success: boolean; message: string; new_status?: string }>(`/api/changes/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ action: 'reject', rejection_reason: reason || '理由未記入' }),
  });
  
  // Fetch updated record since backend may not return full data
  return getChangeById(id);
}

export { ChangeApiError };