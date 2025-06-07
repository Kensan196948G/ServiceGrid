// 認証APIサービス
import { User, UserRole } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: number;
    username: string;
    role: UserRole;
    display_name: string;
    email: string;
  };
  message: string;
}

interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

// API エラーハンドリング
class AuthApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'AuthApiError';
  }
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
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      throw new AuthApiError(
        response.status,
        apiError.code || 'UNKNOWN_ERROR',
        apiError.error || 'API エラーが発生しました'
      );
    }

    return data;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    
    // ネットワークエラーやその他のエラー
    throw new AuthApiError(0, 'NETWORK_ERROR', 'ネットワークエラーが発生しました');
  }
}

// 認証ヘッダー取得
function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * ログイン
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  // トークンをセッションストレージに保存
  if (response.success && response.token) {
    sessionStorage.setItem('token', response.token);
    sessionStorage.setItem('user_data', JSON.stringify(response.user));
  }

  return response;
}

/**
 * ログアウト
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (error) {
    console.error('Logout API error:', error);
    // APIエラーでもローカルデータはクリア
  } finally {
    // ローカルデータクリア
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user_data');
  }
}

/**
 * ユーザー情報取得
 */
export async function getMe(): Promise<User> {
  const response = await apiRequest<{ user: User }>('/api/auth/me', {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return response.user;
}

/**
 * パスワード変更
 */
export async function changePassword(
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  return await apiRequest('/api/auth/password', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

/**
 * API接続テスト
 */
export async function testConnection(): Promise<boolean> {
  try {
    await apiRequest('/ping');
    return true;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
}

/**
 * 現在のユーザーのロール確認
 */
export function getCurrentUserRole(): UserRole | null {
  try {
    const userData = sessionStorage.getItem('user_data');
    if (!userData) return null;
    
    const user = JSON.parse(userData);
    return user.role;
  } catch (error) {
    console.error('Failed to get current user role:', error);
    return null;
  }
}

/**
 * 認証状態確認
 */
export function isAuthenticated(): boolean {
  const token = sessionStorage.getItem('token');
  const userData = sessionStorage.getItem('user_data');
  return !!(token && userData);
}

/**
 * トークン取得
 */
export function getAuthToken(): string | null {
  return sessionStorage.getItem('token');
}

/**
 * 現在のユーザー情報取得（ローカル）
 */
export function getCurrentUser(): User | null {
  try {
    const userData = sessionStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

export { AuthApiError };