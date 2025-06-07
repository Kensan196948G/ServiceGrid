/**
 * 問題管理APIサービス
 * ITSM準拠IT運用システムプラットフォーム
 */

import { Problem, ProblemStats, ProblemFilters, ProblemResponse, Priority, ProblemStatus } from '../types/problem';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API リクエストの共通処理
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * バックエンドのProblemデータをフロントエンド形式に変換
 */
function transformProblemFromBackend(backendProblem: any): Problem {
  return {
    id: backendProblem.problem_id?.toString() || backendProblem.id?.toString() || '',
    problem_id: backendProblem.problem_id,
    problem_number: backendProblem.problem_number,
    title: backendProblem.title || '',
    description: backendProblem.description || '',
    status: mapBackendStatus(backendProblem.status),
    priority: backendProblem.priority || 'Medium',
    category: backendProblem.category,
    affected_service: backendProblem.affected_service,
    workaround: backendProblem.workaround,
    root_cause: backendProblem.root_cause,
    root_cause_analysis: backendProblem.root_cause_analysis,
    permanent_solution: backendProblem.permanent_solution,
    solution: backendProblem.permanent_solution, // Alias for compatibility
    
    // User relationships
    reporter_user_id: backendProblem.reporter_user_id,
    assignee_user_id: backendProblem.assignee_user_id,
    resolver_user_id: backendProblem.resolver_user_id,
    
    // User info from joins
    reportedBy: backendProblem.reporter_username || backendProblem.reporter_name || '',
    assignedTo: backendProblem.assignee_username || backendProblem.assignee_name || '',
    reporter_username: backendProblem.reporter_username,
    reporter_name: backendProblem.reporter_name,
    assignee_username: backendProblem.assignee_username,
    assignee_name: backendProblem.assignee_name,
    resolver_username: backendProblem.resolver_username,
    resolver_name: backendProblem.resolver_name,
    
    // Dates
    registered_date: backendProblem.registered_date,
    acknowledged_date: backendProblem.acknowledged_date,
    resolved_date: backendProblem.resolved_date,
    closed_date: backendProblem.closed_date,
    review_date: backendProblem.review_date,
    createdAt: backendProblem.created_date || backendProblem.registered_date || new Date().toISOString(),
    updatedAt: backendProblem.updated_date || backendProblem.created_date || new Date().toISOString(),
    created_date: backendProblem.created_date,
    updated_date: backendProblem.updated_date,
    
    // Frontend compatibility fields
    relatedIncidents: extractRelatedIncidents(backendProblem),
    knownError: backendProblem.status === 'Known Error',
    systemTargets: backendProblem.affected_service ? [backendProblem.affected_service] : [],
    jvnNumbers: [],
    
    // Related incidents from backend
    related_incidents: backendProblem.related_incidents || []
  };
}

/**
 * フロントエンドのProblemデータをバックエンド形式に変換
 */
function transformProblemToBackend(frontendProblem: Partial<Problem>): any {
  return {
    title: frontendProblem.title,
    description: frontendProblem.description,
    status: frontendProblem.status,
    priority: frontendProblem.priority,
    category: frontendProblem.category,
    affected_service: frontendProblem.affected_service || frontendProblem.systemTargets?.[0],
    workaround: frontendProblem.workaround,
    root_cause: frontendProblem.root_cause,
    root_cause_analysis: frontendProblem.root_cause_analysis,
    permanent_solution: frontendProblem.permanent_solution || frontendProblem.solution,
    reporter_user_id: frontendProblem.reporter_user_id,
    assignee_user_id: frontendProblem.assignee_user_id,
    resolver_user_id: frontendProblem.resolver_user_id
  };
}

/**
 * バックエンドのステータスをフロントエンド形式にマッピング
 */
function mapBackendStatus(backendStatus: string): ProblemStatus {
  switch (backendStatus) {
    case 'Logged': return 'Logged';
    case 'In Progress': return 'In Progress';
    case 'Known Error': return 'Known Error';
    case 'Resolved': return 'Resolved';
    case 'Closed': return 'Closed';
    default: return 'Logged';
  }
}

/**
 * 関連インシデントを抽出
 */
function extractRelatedIncidents(backendProblem: any): string[] {
  if (backendProblem.related_incidents && Array.isArray(backendProblem.related_incidents)) {
    return backendProblem.related_incidents.map((inc: any) => inc.incident_number || inc.incident_id?.toString());
  }
  return [];
}

/**
 * 問題一覧を取得
 */
export async function getProblems(filters: ProblemFilters = {}): Promise<ProblemResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/problems${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiRequest<any>(endpoint);
    
    return {
      data: response.data.map(transformProblemFromBackend),
      pagination: response.pagination,
      filters: response.filters || filters
    };
  } catch (error) {
    console.error('Failed to fetch problems:', error);
    throw error;
  }
}

/**
 * 問題統計を取得
 */
export async function getProblemStats(): Promise<ProblemStats> {
  try {
    return await apiRequest<ProblemStats>('/api/problems/stats');
  } catch (error) {
    console.error('Failed to fetch problem stats:', error);
    throw error;
  }
}

/**
 * 問題詳細を取得
 */
export async function getProblemById(id: string): Promise<Problem> {
  try {
    const response = await apiRequest<any>(`/api/problems/${id}`);
    return transformProblemFromBackend(response);
  } catch (error) {
    console.error(`Failed to fetch problem ${id}:`, error);
    throw error;
  }
}

/**
 * 新規問題を作成
 */
export async function createProblem(problemData: Omit<Problem, 'id' | 'createdAt' | 'updatedAt'>): Promise<Problem> {
  try {
    const backendData = transformProblemToBackend(problemData);
    const response = await apiRequest<any>('/api/problems', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
    
    if (response.data) {
      return transformProblemFromBackend(response.data);
    }
    
    // If no data returned, fetch the created problem
    if (response.success && response.data?.problem_id) {
      return await getProblemById(response.data.problem_id.toString());
    }
    
    throw new Error('Problem creation response format unexpected');
  } catch (error) {
    console.error('Failed to create problem:', error);
    throw error;
  }
}

/**
 * 問題を更新
 */
export async function updateProblem(id: string, problemData: Partial<Problem>): Promise<Problem> {
  try {
    const backendData = transformProblemToBackend(problemData);
    await apiRequest<any>(`/api/problems/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendData),
    });
    
    // 更新後のデータを取得
    return await getProblemById(id);
  } catch (error) {
    console.error(`Failed to update problem ${id}:`, error);
    throw error;
  }
}

/**
 * 問題を削除
 */
export async function deleteProblem(id: string): Promise<void> {
  try {
    await apiRequest<any>(`/api/problems/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error(`Failed to delete problem ${id}:`, error);
    throw error;
  }
}

/**
 * 根本原因分析を開始
 */
export async function startRootCauseAnalysis(id: string, analysisData: { root_cause_analysis: string }): Promise<void> {
  try {
    await apiRequest<any>(`/api/problems/${id}/start-rca`, {
      method: 'PUT',
      body: JSON.stringify(analysisData),
    });
  } catch (error) {
    console.error(`Failed to start root cause analysis for problem ${id}:`, error);
    throw error;
  }
}

/**
 * 既知のエラーとしてマーク
 */
export async function markAsKnownError(id: string, data: { root_cause: string; permanent_solution?: string; workaround?: string }): Promise<void> {
  try {
    await apiRequest<any>(`/api/problems/${id}/mark-known-error`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error(`Failed to mark problem ${id} as known error:`, error);
    throw error;
  }
}

/**
 * 問題を解決
 */
export async function resolveProblem(id: string, data: { root_cause: string; permanent_solution: string }): Promise<void> {
  try {
    await apiRequest<any>(`/api/problems/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error(`Failed to resolve problem ${id}:`, error);
    throw error;
  }
}

/**
 * インシデントと問題を関連付け
 */
export async function linkIncident(problemId: string, data: { incident_id: number; relationship_type?: string }): Promise<void> {
  try {
    await apiRequest<any>(`/api/problems/${problemId}/link-incident`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error(`Failed to link incident to problem ${problemId}:`, error);
    throw error;
  }
}

// Legacy compatibility exports for mockItsmService
export async function addProblem(problemData: Omit<Problem, 'id' | 'createdAt' | 'updatedAt'>): Promise<Problem> {
  return createProblem(problemData);
}

export { getProblems as default };