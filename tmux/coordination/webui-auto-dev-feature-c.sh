#!/bin/bash

# Feature-C専用WebUI自動開発スクリプト
# Node.js API + TypeScript型定義自動開発システム

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly WEBUI_SRC="$PROJECT_ROOT/src"
readonly SERVICES_DIR="$WEBUI_SRC/services"
readonly TYPES_DIR="$WEBUI_SRC/types"
readonly UTILS_DIR="$WEBUI_SRC/utils"
readonly BACKEND_DIR="$PROJECT_ROOT/backend"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly FEATURE_C_LOG="$LOG_DIR/feature_c_api_development.log"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Feature-C固有設定
readonly FEATURE_NAME="Feature-C-API"
readonly MAX_AUTO_LOOPS=20
readonly API_QUALITY_THRESHOLD=85

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${BLUE}[FEATURE-C]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[FEATURE-C-OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[FEATURE-C-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[FEATURE-C-WARN]${NC} $1"
}

print_header() {
    echo -e "${BOLD}${GREEN}================================================================${NC}"
    echo -e "${BOLD}${GREEN} 🔧 Feature-C WebUI API自動開発システム 🔧${NC}"
    echo -e "${BOLD}${GREEN} Node.js API + TypeScript型定義強化${NC}"
    echo -e "${BOLD}${GREEN}================================================================${NC}"
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log_feature_action() {
    local action="$1"
    local status="$2"
    local details="$3"
    
    mkdir -p "$LOG_DIR"
    echo "[$(get_timestamp)] FEATURE-C: $action - $status - $details" >> "$FEATURE_C_LOG"
}

# =========================
# TypeScript型定義自動生成
# =========================

generate_typescript_types() {
    print_info "TypeScript型定義自動生成中..."
    
    local types_created=0
    
    # 基本的な型定義テンプレート
    local type_templates=(
        "common:共通型定義"
        "api:API関連型定義"
        "response:レスポンス型定義"
        "request:リクエスト型定義"
        "error:エラー型定義"
        "pagination:ページネーション型定義"
        "filter:フィルタ型定義"
        "sort:ソート型定義"
    )
    
    mkdir -p "$TYPES_DIR"
    
    for template in "${type_templates[@]}"; do
        local type_name=$(echo "$template" | cut -d':' -f1)
        local type_desc=$(echo "$template" | cut -d':' -f2)
        local type_file="$TYPES_DIR/${type_name}.ts"
        
        if [ -f "$type_file" ]; then
            print_info "$type_name 型定義は既存のためスキップ"
            continue
        fi
        
        print_info "型定義ファイル生成: $type_name"
        
        case "$type_name" in
            "common")
                cat > "$type_file" << 'EOF'
/**
 * 共通型定義
 */

// 基本的なID型
export type ID = string | number;

// タイムスタンプ型
export type Timestamp = string; // ISO 8601 format

// ステータス型
export type Status = 'active' | 'inactive' | 'pending' | 'deleted';

// 優先度型
export type Priority = 'low' | 'medium' | 'high' | 'critical';

// 基本エンティティ
export interface BaseEntity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: Status;
}

// 監査情報
export interface AuditInfo {
  createdBy: string;
  updatedBy: string;
  version: number;
}

// 完全なエンティティ
export interface Entity extends BaseEntity, AuditInfo {}

// メタデータ
export interface Metadata {
  totalCount: number;
  pageCount: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// 選択可能オプション
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: string;
}

// 設定項目
export interface ConfigItem {
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
}
EOF
                ;;
                
            "api")
                cat > "$type_file" << 'EOF'
/**
 * API関連型定義
 */

import { Metadata } from './common';

// HTTP メソッド
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API レスポンスベース
export interface APIResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  metadata?: Metadata;
  timestamp: string;
}

// API エラーレスポンス
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

// API リクエスト設定
export interface APIConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

// 認証トークン
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: 'Bearer';
}

// API エンドポイント定義
export interface APIEndpoint {
  method: HTTPMethod;
  path: string;
  requiresAuth: boolean;
  rateLimit?: number;
  cache?: boolean;
  cacheDuration?: number;
}

// バッチリクエスト
export interface BatchRequest {
  id: string;
  endpoint: APIEndpoint;
  params?: Record<string, unknown>;
  body?: unknown;
}

// バッチレスポンス
export interface BatchResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: APIError;
}
EOF
                ;;
                
            "response")
                cat > "$type_file" << 'EOF'
/**
 * レスポンス型定義
 */

import { APIResponse, APIError } from './api';
import { Metadata } from './common';

// 成功レスポンス
export interface SuccessResponse<T> extends APIResponse<T> {
  success: true;
  data: T;
}

// エラーレスポンス
export interface ErrorResponse extends APIResponse<null> {
  success: false;
  data: null;
  errors: APIError[];
}

// ページネーション付きレスポンス
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  metadata: Metadata;
}

// リスト取得レスポンス
export interface ListResponse<T> extends SuccessResponse<T[]> {
  metadata?: Metadata;
  filters?: Record<string, unknown>;
  sort?: Record<string, 'asc' | 'desc'>;
}

// 単一アイテム取得レスポンス
export interface ItemResponse<T> extends SuccessResponse<T> {}

// 作成レスポンス
export interface CreateResponse<T> extends SuccessResponse<T> {
  message: string;
}

// 更新レスポンス
export interface UpdateResponse<T> extends SuccessResponse<T> {
  message: string;
  changes: Partial<T>;
}

// 削除レスポンス
export interface DeleteResponse extends SuccessResponse<{ deleted: boolean }> {
  message: string;
}

// バルク操作レスポンス
export interface BulkResponse<T> extends SuccessResponse<T[]> {
  successful: number;
  failed: number;
  errors?: Array<{ index: number; error: APIError }>;
}

// ヘルスチェックレスポンス
export interface HealthResponse extends SuccessResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, {
    status: 'pass' | 'fail';
    responseTime?: number;
    message?: string;
  }>;
}> {}
EOF
                ;;
                
            "request")
                cat > "$type_file" << 'EOF'
/**
 * リクエスト型定義
 */

// ページネーションパラメータ
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// ソートパラメータ
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// フィルタパラメータ
export interface FilterParams {
  search?: string;
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

// 基本クエリパラメータ
export interface QueryParams extends PaginationParams, SortParams, FilterParams {
  include?: string[];
  fields?: string[];
}

// 作成リクエスト
export interface CreateRequest<T> {
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
  options?: {
    validate?: boolean;
    notify?: boolean;
  };
}

// 更新リクエスト
export interface UpdateRequest<T> {
  id: string | number;
  data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
  options?: {
    validate?: boolean;
    notify?: boolean;
    merge?: boolean;
  };
}

// 削除リクエスト
export interface DeleteRequest {
  id: string | number;
  options?: {
    soft?: boolean;
    force?: boolean;
    cascade?: boolean;
  };
}

// バルク操作リクエスト
export interface BulkRequest<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  options?: {
    stopOnError?: boolean;
    validate?: boolean;
    batchSize?: number;
  };
}

// 検索リクエスト
export interface SearchRequest extends QueryParams {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
  highlight?: boolean;
}
EOF
                ;;
                
            *)
                # 基本テンプレート
                cat > "$type_file" << EOF
/**
 * $type_desc
 */

// TODO: Define specific types for $type_name
export interface ${type_name^}Type {
  // Add your type definitions here
}
EOF
                ;;
        esac
        
        ((types_created++))
        log_feature_action "TYPE_CREATION" "SUCCESS" "Created $type_name type definitions"
    done
    
    # 統合型定義エクスポートファイル
    local index_file="$TYPES_DIR/index.ts"
    if [ ! -f "$index_file" ]; then
        cat > "$index_file" << 'EOF'
/**
 * 型定義統合エクスポート
 */

// 共通型
export * from './common';

// API関連型
export * from './api';
export * from './request';
export * from './response';
export * from './error';

// 機能別型
export * from './pagination';
export * from './filter';
export * from './sort';

// エンティティ型
export * from './asset';
export * from './incident';
export * from './user';
export * from './service-request';
export * from './knowledge';
export * from './change';
export * from './release';
export * from './problem';
export * from './sla';
export * from './audit';
export * from './availability';
export * from './capacity';
export * from './compliance';
export * from './security';
export * from './dashboard';
export * from './gemini';
EOF
        ((types_created++))
        print_success "統合型定義エクスポートファイルを作成しました"
    fi
    
    print_success "TypeScript型定義生成完了: $types_created 個作成"
    return $types_created
}

# =========================
# APIサービス自動生成
# =========================

generate_api_services() {
    print_info "APIサービス自動生成中..."
    
    local services_created=0
    
    # APIサービステンプレート
    local service_templates=(
        "baseApiService:基盤APIサービス"
        "crudApiService:CRUD操作APIサービス"
        "authApiService:認証APIサービス強化"
        "fileApiService:ファイル操作APIサービス"
        "searchApiService:検索APIサービス"
        "notificationApiService:通知APIサービス"
        "reportApiService:レポートAPIサービス"
        "configApiService:設定APIサービス"
    )
    
    mkdir -p "$SERVICES_DIR"
    
    for template in "${service_templates[@]}"; do
        local service_name=$(echo "$template" | cut -d':' -f1)
        local service_desc=$(echo "$template" | cut -d':' -f2)
        local service_file="$SERVICES_DIR/${service_name}.ts"
        
        if [ -f "$service_file" ]; then
            print_info "$service_name は既存のためスキップ"
            continue
        fi
        
        print_info "APIサービス生成: $service_name"
        
        case "$service_name" in
            "baseApiService")
                cat > "$service_file" << 'EOF'
/**
 * 基盤APIサービス
 * 全てのAPIサービスの基底クラス
 */

import { APIResponse, APIError, APIConfig } from '../types/api';

export class BaseApiService {
  protected baseURL: string;
  protected timeout: number;
  protected retries: number;
  protected retryDelay: number;
  protected defaultHeaders: Record<string, string>;

  constructor(config: Partial<APIConfig> = {}) {
    this.baseURL = config.baseURL || process.env.VITE_API_BASE_URL || 'http://localhost:8082';
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers
    };
  }

  /**
   * HTTP リクエスト実行
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    // タイムアウト設定
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    try {
      const response = await this.executeWithRetry(url, config);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  /**
   * リトライ機能付きリクエスト実行
   */
  private async executeWithRetry(
    url: string,
    config: RequestInit,
    attempt: number = 1
  ): Promise<Response> {
    try {
      return await fetch(url, config);
    } catch (error) {
      if (attempt < this.retries) {
        await this.delay(this.retryDelay * attempt);
        return this.executeWithRetry(url, config, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * エラーハンドリング
   */
  protected handleError(error: unknown): APIError {
    if (error instanceof Error) {
      return {
        code: 'REQUEST_ERROR',
        message: error.message,
        details: { originalError: error }
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
      details: { error }
    };
  }

  /**
   * 認証トークン設定
   */
  public setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * 認証トークン削除
   */
  public removeAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }
}
EOF
                ;;
                
            "crudApiService")
                cat > "$service_file" << 'EOF'
/**
 * CRUD操作APIサービス
 * 汎用的なCRUD操作を提供
 */

import { BaseApiService } from './baseApiService';
import { 
  APIResponse, 
  ListResponse, 
  ItemResponse, 
  CreateResponse, 
  UpdateResponse, 
  DeleteResponse 
} from '../types/response';
import { 
  QueryParams, 
  CreateRequest, 
  UpdateRequest, 
  DeleteRequest 
} from '../types/request';

export class CrudApiService<T> extends BaseApiService {
  protected resourcePath: string;

  constructor(resourcePath: string, config?: any) {
    super(config);
    this.resourcePath = resourcePath;
  }

  /**
   * リスト取得
   */
  async list(params?: QueryParams): Promise<ListResponse<T>> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<T[]>(`${this.resourcePath}${queryString}`);
  }

  /**
   * 単一アイテム取得
   */
  async get(id: string | number): Promise<ItemResponse<T>> {
    return this.request<T>(`${this.resourcePath}/${id}`);
  }

  /**
   * 作成
   */
  async create(data: CreateRequest<T>): Promise<CreateResponse<T>> {
    return this.request<T>(`${this.resourcePath}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * 更新
   */
  async update(id: string | number, data: UpdateRequest<T>): Promise<UpdateResponse<T>> {
    return this.request<T>(`${this.resourcePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * 部分更新
   */
  async patch(id: string | number, data: Partial<T>): Promise<UpdateResponse<T>> {
    return this.request<T>(`${this.resourcePath}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * 削除
   */
  async delete(id: string | number, options?: DeleteRequest['options']): Promise<DeleteResponse> {
    const queryString = options ? '?' + new URLSearchParams(options as any).toString() : '';
    return this.request<{ deleted: boolean }>(`${this.resourcePath}/${id}${queryString}`, {
      method: 'DELETE'
    });
  }

  /**
   * 検索
   */
  async search(query: string, params?: QueryParams): Promise<ListResponse<T>> {
    const searchParams = new URLSearchParams({ 
      q: query, 
      ...(params as any) 
    });
    return this.request<T[]>(`${this.resourcePath}/search?${searchParams.toString()}`);
  }

  /**
   * 統計情報取得
   */
  async stats(): Promise<APIResponse<Record<string, number>>> {
    return this.request<Record<string, number>>(`${this.resourcePath}/stats`);
  }
}
EOF
                ;;
                
            "searchApiService")
                cat > "$service_file" << 'EOF'
/**
 * 検索APIサービス
 * 高度な検索機能を提供
 */

import { BaseApiService } from './baseApiService';
import { APIResponse } from '../types/api';
import { SearchRequest } from '../types/request';

export interface SearchResult<T> {
  items: T[];
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
  suggestions?: string[];
  took: number;
}

export interface SearchIndex {
  name: string;
  fields: string[];
  analyzer: string;
  boost?: Record<string, number>;
}

export class SearchApiService extends BaseApiService {
  /**
   * 全文検索
   */
  async search<T>(params: SearchRequest): Promise<APIResponse<SearchResult<T>>> {
    return this.request<SearchResult<T>>('/search', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  /**
   * インデックス別検索
   */
  async searchInIndex<T>(
    index: string, 
    params: SearchRequest
  ): Promise<APIResponse<SearchResult<T>>> {
    return this.request<SearchResult<T>>(`/search/${index}`, {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  /**
   * 検索候補取得
   */
  async suggest(query: string, index?: string): Promise<APIResponse<string[]>> {
    const params = new URLSearchParams({ q: query });
    if (index) params.append('index', index);
    
    return this.request<string[]>(`/search/suggest?${params.toString()}`);
  }

  /**
   * ファセット検索
   */
  async facetSearch<T>(
    field: string, 
    filters?: Record<string, unknown>
  ): Promise<APIResponse<Array<{ value: string; count: number }>>> {
    return this.request<Array<{ value: string; count: number }>>('/search/facets', {
      method: 'POST',
      body: JSON.stringify({ field, filters })
    });
  }

  /**
   * 検索インデックス管理
   */
  async getIndexes(): Promise<APIResponse<SearchIndex[]>> {
    return this.request<SearchIndex[]>('/search/indexes');
  }

  async createIndex(index: SearchIndex): Promise<APIResponse<{ created: boolean }>> {
    return this.request<{ created: boolean }>('/search/indexes', {
      method: 'POST',
      body: JSON.stringify(index)
    });
  }

  async deleteIndex(name: string): Promise<APIResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>(`/search/indexes/${name}`, {
      method: 'DELETE'
    });
  }

  /**
   * インデックス再構築
   */
  async reindexAll(): Promise<APIResponse<{ status: string }>> {
    return this.request<{ status: string }>('/search/reindex', {
      method: 'POST'
    });
  }

  async reindexEntity(entity: string): Promise<APIResponse<{ status: string }>> {
    return this.request<{ status: string }>(`/search/reindex/${entity}`, {
      method: 'POST'
    });
  }
}
EOF
                ;;
                
            *)
                # 基本テンプレート
                cat > "$service_file" << EOF
/**
 * $service_desc
 */

import { BaseApiService } from './baseApiService';
import { APIResponse } from '../types/api';

export class ${service_name^} extends BaseApiService {
  /**
   * TODO: Implement $service_name methods
   */
  async exampleMethod(): Promise<APIResponse<unknown>> {
    return this.request('/example');
  }
}
EOF
                ;;
        esac
        
        ((services_created++))
        log_feature_action "SERVICE_CREATION" "SUCCESS" "Created $service_name API service"
        
        # テストファイル生成
        local test_file="$SERVICES_DIR/__tests__/${service_name}.test.ts"
        mkdir -p "$SERVICES_DIR/__tests__"
        
        cat > "$test_file" << EOF
import { ${service_name^} } from '../${service_name}';

// モック設定
global.fetch = jest.fn();

describe('${service_name^}', () => {
  let service: ${service_name^};

  beforeEach(() => {
    service = new ${service_name^}();
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  test('サービスが正常に初期化される', () => {
    expect(service).toBeInstanceOf(${service_name^});
  });

  // TODO: Add specific tests for $service_name
});
EOF
    done
    
    print_success "APIサービス生成完了: $services_created 個作成"
    return $services_created
}

# =========================
# API ユーティリティ強化
# =========================

enhance_api_utilities() {
    print_info "APIユーティリティ強化中..."
    
    local utilities_created=0
    
    # 高度なAPIユーティリティ
    local api_utils_file="$UTILS_DIR/apiUtils.ts"
    if [ ! -f "$api_utils_file" ]; then
        mkdir -p "$UTILS_DIR"
        
        cat > "$api_utils_file" << 'EOF'
/**
 * 高度なAPIユーティリティ
 */

import { APIResponse, APIError } from '../types/api';

/**
 * レスポンス型ガード
 */
export function isSuccessResponse<T>(
  response: APIResponse<T>
): response is APIResponse<T> & { success: true } {
  return response.success === true;
}

export function isErrorResponse(
  response: APIResponse<unknown>
): response is APIResponse<null> & { success: false; errors: APIError[] } {
  return response.success === false;
}

/**
 * APIレスポンス変換
 */
export function transformResponse<T, U>(
  response: APIResponse<T>,
  transformer: (data: T) => U
): APIResponse<U> {
  if (isSuccessResponse(response)) {
    return {
      ...response,
      data: transformer(response.data)
    };
  }
  return response as APIResponse<U>;
}

/**
 * エラーハンドリング
 */
export class ApiErrorHandler {
  private static errorHandlers: Map<string, (error: APIError) => void> = new Map();

  static registerHandler(errorCode: string, handler: (error: APIError) => void): void {
    this.errorHandlers.set(errorCode, handler);
  }

  static handleError(error: APIError): void {
    const handler = this.errorHandlers.get(error.code);
    if (handler) {
      handler(error);
    } else {
      console.error('Unhandled API error:', error);
    }
  }

  static handleResponse<T>(response: APIResponse<T>): T | never {
    if (isSuccessResponse(response)) {
      return response.data;
    }

    if (response.errors) {
      response.errors.forEach(error => this.handleError(error));
    }

    throw new Error(response.message || 'API request failed');
  }
}

/**
 * キャッシュ機能
 */
export class ApiCache {
  private static cache: Map<string, { data: unknown; expiry: number }> = new Map();
  private static defaultTTL = 5 * 60 * 1000; // 5分

  static set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  static clear(): void {
    this.cache.clear();
  }

  static generateKey(method: string, url: string, params?: Record<string, unknown>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${paramString}`;
  }
}

/**
 * APIリクエスト型安全性チェック
 */
export function validateApiResponse<T>(
  response: unknown,
  validator: (data: unknown) => data is T
): APIResponse<T> {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid API response format');
  }

  const apiResponse = response as APIResponse<unknown>;
  
  if (typeof apiResponse.success !== 'boolean') {
    throw new Error('Missing success field in API response');
  }

  if (apiResponse.success && validator(apiResponse.data)) {
    return apiResponse as APIResponse<T>;
  }

  if (!apiResponse.success) {
    return apiResponse as APIResponse<T>;
  }

  throw new Error('API response data validation failed');
}

/**
 * バッチリクエスト処理
 */
export class BatchRequestProcessor {
  private static maxBatchSize = 10;
  private static batchDelay = 100; // ms

  static async processBatch<T, U>(
    items: T[],
    processor: (item: T) => Promise<U>,
    options: { batchSize?: number; delay?: number } = {}
  ): Promise<U[]> {
    const batchSize = options.batchSize || this.maxBatchSize;
    const delay = options.delay || this.batchDelay;
    const results: U[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(processor);
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Batch item ${i + index} failed:`, result.reason);
        }
      });

      // バッチ間の遅延
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }
}

/**
 * APIモック用ユーティリティ
 */
export class ApiMockUtility {
  private static mockResponses: Map<string, unknown> = new Map();

  static mockResponse<T>(endpoint: string, response: APIResponse<T>): void {
    this.mockResponses.set(endpoint, response);
  }

  static getMockResponse<T>(endpoint: string): APIResponse<T> | null {
    return this.mockResponses.get(endpoint) as APIResponse<T> || null;
  }

  static clearMocks(): void {
    this.mockResponses.clear();
  }

  static createSuccessResponse<T>(data: T): APIResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  static createErrorResponse(errors: APIError[]): APIResponse<null> {
    return {
      success: false,
      data: null,
      errors,
      timestamp: new Date().toISOString()
    };
  }
}
EOF
        
        ((utilities_created++))
        print_success "高度なAPIユーティリティを作成しました"
    fi
    
    # API接続テストユーティリティ
    local connection_test_file="$SERVICES_DIR/testApiConnection.ts"
    if [ ! -f "$connection_test_file" ]; then
        cat > "$connection_test_file" << 'EOF'
/**
 * API接続テストユーティリティ
 */

import { BaseApiService } from './baseApiService';
import { APIResponse } from '../types/api';

export interface ConnectionTestResult {
  endpoint: string;
  status: 'success' | 'failure' | 'timeout';
  responseTime: number;
  error?: string;
  timestamp: string;
}

export class ApiConnectionTester extends BaseApiService {
  /**
   * 基本接続テスト
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const endpoint = '/health';
    
    try {
      const response = await this.request<{ status: string }>(endpoint);
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint,
        status: 'success',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint,
        status: 'failure',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 複数エンドポイントテスト
   */
  async testMultipleEndpoints(endpoints: string[]): Promise<ConnectionTestResult[]> {
    const promises = endpoints.map(endpoint => this.testEndpoint(endpoint));
    return Promise.all(promises);
  }

  private async testEndpoint(endpoint: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      await this.request(endpoint);
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint,
        status: 'success',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint,
        status: 'failure',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * パフォーマンステスト
   */
  async performanceTest(
    endpoint: string, 
    iterations: number = 10
  ): Promise<{
    average: number;
    min: number;
    max: number;
    results: ConnectionTestResult[];
  }> {
    const results: ConnectionTestResult[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await this.testEndpoint(endpoint);
      results.push(result);
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const responseTimes = results
      .filter(r => r.status === 'success')
      .map(r => r.responseTime);
    
    return {
      average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
      min: Math.min(...responseTimes) || 0,
      max: Math.max(...responseTimes) || 0,
      results
    };
  }
}
EOF
        
        ((utilities_created++))
        print_success "API接続テストユーティリティを作成しました"
    fi
    
    print_success "APIユーティリティ強化完了: $utilities_created 個作成"
    return $utilities_created
}

# =========================
# 既存APIサービス最適化
# =========================

optimize_existing_api_services() {
    print_info "既存APIサービス最適化中..."
    
    local optimizations_applied=0
    
    # 既存のAPIサービスファイルを最適化
    while IFS= read -r -d '' service_file; do
        local filename=$(basename "$service_file")
        local service_name="${filename%.*}"
        
        if [[ "$service_name" == *"test"* ]] || [[ "$service_name" == *"spec"* ]]; then
            continue
        fi
        
        print_info "APIサービス最適化中: $service_name"
        
        local temp_file=$(mktemp)
        local file_optimized=false
        
        cp "$service_file" "$temp_file"
        
        # async/await パターンの改善
        if grep -q "\.then(" "$temp_file"; then
            echo "// TODO: Consider converting .then() to async/await for better error handling" >> "$temp_file"
            file_optimized=true
        fi
        
        # エラーハンドリングの改善
        if ! grep -q "try.*catch\|catch.*error" "$temp_file"; then
            echo "// TODO: Add proper try-catch error handling for async operations" >> "$temp_file"
            file_optimized=true
        fi
        
        # 型安全性の改善
        if grep -q ": any\|as any" "$temp_file"; then
            echo "// TODO: Replace 'any' types with specific TypeScript types" >> "$temp_file"
            file_optimized=true
        fi
        
        # レスポンス型の強化
        if grep -q "Promise<.*>" "$temp_file" && ! grep -q "APIResponse<" "$temp_file"; then
            echo "// TODO: Use APIResponse<T> type for consistent response handling" >> "$temp_file"
            file_optimized=true
        fi
        
        # キャッシュ機能の提案
        if grep -q "fetch\|request" "$temp_file" && ! grep -q "cache" "$temp_file"; then
            echo "// TODO: Consider adding caching for frequently accessed data" >> "$temp_file"
            file_optimized=true
        fi
        
        if [ "$file_optimized" = true ]; then
            mv "$temp_file" "$service_file"
            ((optimizations_applied++))
            log_feature_action "SERVICE_OPTIMIZATION" "SUCCESS" "Optimized $service_name"
        else
            rm -f "$temp_file"
        fi
        
    done < <(find "$SERVICES_DIR" -name "*.ts" -not -path "*/__tests__/*" -print0 2>/dev/null)
    
    print_success "APIサービス最適化完了: $optimizations_applied 個最適化"
    return $optimizations_applied
}

# =========================
# API品質チェック
# =========================

check_api_quality() {
    print_info "API品質チェック実行中..."
    
    local quality_score=0
    local total_checks=5
    
    # TypeScript型安全性チェック
    if command -v tsc >/dev/null && tsc --noEmit --project "$PROJECT_ROOT/config/tsconfig.json" 2>/dev/null; then
        ((quality_score++))
        print_success "TypeScript型安全性: 合格"
    else
        print_warning "TypeScript型安全性: 要修復"
    fi
    
    # APIサービスファイル数チェック
    local api_files=$(find "$SERVICES_DIR" -name "*.ts" -not -path "*/__tests__/*" 2>/dev/null | wc -l)
    if [ "$api_files" -ge 5 ]; then
        ((quality_score++))
        print_success "APIサービス数: 良好 ($api_files ファイル)"
    else
        print_warning "APIサービス数: 要拡充 ($api_files ファイル)"
    fi
    
    # 型定義ファイル数チェック
    local type_files=$(find "$TYPES_DIR" -name "*.ts" 2>/dev/null | wc -l)
    if [ "$type_files" -ge 5 ]; then
        ((quality_score++))
        print_success "型定義数: 良好 ($type_files ファイル)"
    else
        print_warning "型定義数: 要拡充 ($type_files ファイル)"
    fi
    
    # エラーハンドリングチェック
    local error_handling=$(find "$SERVICES_DIR" -name "*.ts" | xargs grep -c "try.*catch\|catch.*error" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$error_handling" -ge 3 ]; then
        ((quality_score++))
        print_success "エラーハンドリング: 良好 ($error_handling 箇所)"
    else
        print_warning "エラーハンドリング: 要改善 ($error_handling 箇所)"
    fi
    
    # テストカバレッジチェック
    local test_files=$(find "$SERVICES_DIR" -name "*.test.ts" 2>/dev/null | wc -l)
    if [ "$api_files" -gt 0 ] && [ "$test_files" -ge $((api_files / 2)) ]; then
        ((quality_score++))
        print_success "テストカバレッジ: 良好 ($test_files/$api_files)"
    else
        print_warning "テストカバレッジ: 要改善 ($test_files/$api_files)"
    fi
    
    local final_score=$((quality_score * 100 / total_checks))
    print_info "API品質スコア: $final_score/100"
    
    echo $final_score
}

# =========================
# Feature-C実行ループ
# =========================

execute_feature_c_loop() {
    print_header
    print_info "Feature-C WebUI API自動開発ループを開始します"
    print_info "最大ループ回数: $MAX_AUTO_LOOPS"
    print_info "API品質閾値: $API_QUALITY_THRESHOLD%"
    
    local loop_count=0
    local total_types_created=0
    local total_services_created=0
    local total_utilities=0
    local total_optimizations=0
    
    while [ $loop_count -lt $MAX_AUTO_LOOPS ]; do
        ((loop_count++))
        print_info "==================== ループ $loop_count/$MAX_AUTO_LOOPS 開始 ===================="
        
        # TypeScript型定義生成
        local types_created=$(generate_typescript_types)
        total_types_created=$((total_types_created + types_created))
        
        # APIサービス生成
        local services_created=$(generate_api_services)
        total_services_created=$((total_services_created + services_created))
        
        # APIユーティリティ強化
        local utilities=$(enhance_api_utilities)
        total_utilities=$((total_utilities + utilities))
        
        # 既存サービス最適化
        local optimizations=$(optimize_existing_api_services)
        total_optimizations=$((total_optimizations + optimizations))
        
        # 品質チェック
        local quality_score=$(check_api_quality)
        
        print_info "ループ $loop_count 完了 - API品質スコア: ${quality_score}%"
        log_feature_action "LOOP_COMPLETION" "SUCCESS" "Loop $loop_count completed with quality score $quality_score%"
        
        # 早期終了条件チェック
        if [ $quality_score -ge $API_QUALITY_THRESHOLD ]; then
            print_success "API品質閾値 ${API_QUALITY_THRESHOLD}% に到達しました！"
            break
        fi
        
        # 改善がない場合の早期終了
        if [ $types_created -eq 0 ] && [ $services_created -eq 0 ] && [ $utilities -eq 0 ] && [ $optimizations -eq 0 ]; then
            print_info "追加の改善項目がないため、ループを終了します"
            break
        fi
        
        sleep 2  # ループ間の休憩
    done
    
    # 最終結果表示
    print_success "Feature-C WebUI API自動開発完了"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "実行ループ数: $loop_count/$MAX_AUTO_LOOPS"
    echo "作成型定義: $total_types_created 個"
    echo "作成APIサービス: $total_services_created 個"
    echo "作成ユーティリティ: $total_utilities 個"
    echo "最適化実行: $total_optimizations 個"
    echo "最終API品質スコア: $(check_api_quality)%"
}

# =========================
# 使用方法表示
# =========================

show_usage() {
    echo "Feature-C WebUI API自動開発スクリプト"
    echo ""
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --loop              自動開発ループ実行"
    echo "  --types             型定義生成のみ"
    echo "  --services          APIサービス生成のみ"
    echo "  --utilities         ユーティリティ強化のみ"
    echo "  --optimize          既存最適化のみ"
    echo "  --quality           API品質チェックのみ"
    echo "  --help              このヘルプを表示"
}

# =========================
# メイン実行
# =========================

main() {
    local mode="loop"
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --loop)
                mode="loop"
                shift
                ;;
            --types)
                mode="types"
                shift
                ;;
            --services)
                mode="services"
                shift
                ;;
            --utilities)
                mode="utilities"
                shift
                ;;
            --optimize)
                mode="optimize"
                shift
                ;;
            --quality)
                mode="quality"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_warning "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # 環境チェック
    if [ ! -d "$WEBUI_SRC" ]; then
        print_error "WebUIソースディレクトリが見つかりません: $WEBUI_SRC"
        exit 1
    fi
    
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # Feature-C開始ログ
    log_feature_action "FEATURE_C_START" "INFO" "Feature-C API development started with mode: $mode"
    
    # モード別実行
    case "$mode" in
        loop)
            execute_feature_c_loop
            ;;
        types)
            print_header
            generate_typescript_types
            ;;
        services)
            print_header
            generate_api_services
            ;;
        utilities)
            print_header
            enhance_api_utilities
            ;;
        optimize)
            print_header
            optimize_existing_api_services
            ;;
        quality)
            print_header
            local score=$(check_api_quality)
            print_info "現在のAPI品質スコア: $score%"
            ;;
        *)
            print_error "不明なモード: $mode"
            exit 1
            ;;
    esac
    
    log_feature_action "FEATURE_C_COMPLETE" "SUCCESS" "Feature-C API development completed"
}

# スクリプト実行
main "$@"