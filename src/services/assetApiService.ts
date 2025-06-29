/**
 * 資産管理APIとの連携サービス
 * エラーハンドリング・リトライ機能を含む包括的なAPIクライアント
 */
import { Asset, ItemStatus } from '../types';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from './apiUtils';
import { handleApiError } from '../utils/errorHandler';

// Enhanced API レスポンス型定義 with strict typing
interface ApiResponse<T> {
  data?: T;
  pagination?: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
  readonly message?: string;
  readonly error?: string;
  readonly timestamp?: string;
  readonly status: 'success' | 'error';
}

interface AssetFilters {
  status?: string;
  category?: string;
  location?: string;
  assigned_to?: string;
  search?: string;
}

// 資産一覧取得
export async function getAssets(
  page: number = 1, 
  limit: number = 20, 
  filters: AssetFilters = {}
): Promise<{ assets: Asset[]; pagination: any }> {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
    )
  });

  const response = await apiGet<ApiResponse<Asset[]>>(
    `/api/assets?${queryParams}`
  );

  // APIレスポンスをフロントエンド型に変換
  const assets = response.data?.map((asset: any) => ({
    id: String(asset.id || asset.asset_id),
    assetTag: asset.asset_tag,
    name: asset.name,
    description: asset.description,
    category: asset.category,
    type: asset.type,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serial_number,
    location: asset.location,
    department: asset.department,
    owner: asset.owner,
    assignedTo: asset.assigned_to,
    status: asset.status as ItemStatus,
    purchaseDate: asset.purchase_date,
    purchaseCost: asset.purchase_cost,
    warrantyExpiry: asset.warranty_expiry,
    lastMaintenance: asset.last_maintenance,
    nextMaintenance: asset.next_maintenance,
    ipAddress: asset.ip_address,
    macAddress: asset.mac_address,
    operatingSystem: asset.operating_system,
    softwareLicenses: asset.software_licenses || [],
    configuration: asset.configuration || {},
    notes: asset.notes,
    tags: asset.tags || [],
    createdAt: asset.created_at || new Date().toISOString(),
    updatedAt: asset.updated_at || new Date().toISOString(),
    createdBy: asset.created_by,
    updatedBy: asset.updated_by
  })) || [];

  return {
    assets,
    pagination: response.pagination || {
      page: 1,
      limit: 20,
      total: assets.length,
      totalPages: 1
    }
  };
}

// 資産詳細取得
export async function getAssetById(id: string): Promise<Asset> {
  const response = await apiGet<any>(`/api/assets/${id}`);
  
  // APIレスポンスをフロントエンド型に変換
  const asset = response.data || response;
  return {
    id: String(asset.id || asset.asset_id),
    assetTag: asset.asset_tag,
    name: asset.name,
    description: asset.description,
    category: asset.category,
    type: asset.type,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serial_number,
    location: asset.location,
    department: asset.department,
    owner: asset.owner,
    assignedTo: asset.assigned_to,
    status: asset.status as ItemStatus,
    purchaseDate: asset.purchase_date,
    purchaseCost: asset.purchase_cost,
    warrantyExpiry: asset.warranty_expiry,
    lastMaintenance: asset.last_maintenance,
    nextMaintenance: asset.next_maintenance,
    ipAddress: asset.ip_address,
    macAddress: asset.mac_address,
    operatingSystem: asset.operating_system,
    softwareLicenses: asset.software_licenses || [],
    configuration: asset.configuration || {},
    notes: asset.notes,
    tags: asset.tags || [],
    createdAt: asset.created_at || new Date().toISOString(),
    updatedAt: asset.updated_at || new Date().toISOString(),
    createdBy: asset.created_by,
    updatedBy: asset.updated_by
  };
}

// 資産作成
export async function createAsset(assetData: Partial<Asset>): Promise<Asset> {
  const payload = {
    asset_tag: assetData.assetTag,
    name: assetData.name,
    description: assetData.description,
    category: assetData.category || 'Hardware',
    type: assetData.type,
    manufacturer: assetData.manufacturer,
    model: assetData.model,
    serial_number: assetData.serialNumber,
    location: assetData.location,
    department: assetData.department,
    owner: assetData.owner,
    assigned_to: assetData.assignedTo,
    status: assetData.status || 'Active',
    purchase_date: assetData.purchaseDate,
    purchase_cost: assetData.purchaseCost,
    warranty_expiry: assetData.warrantyExpiry,
    last_maintenance: assetData.lastMaintenance,
    next_maintenance: assetData.nextMaintenance,
    ip_address: assetData.ipAddress,
    mac_address: assetData.macAddress,
    operating_system: assetData.operatingSystem,
    software_licenses: assetData.softwareLicenses || [],
    configuration: assetData.configuration || {},
    notes: assetData.notes,
    tags: assetData.tags || [],
    created_by: assetData.createdBy
  };

  const response = await apiPost<ApiResponse<Asset>>('/api/assets', payload);

  // 作成された資産データを返す
  const asset = response.data || response;
  return {
    id: String(asset.id || asset.asset_id),
    assetTag: asset.asset_tag,
    name: asset.name,
    description: asset.description,
    category: asset.category,
    type: asset.type,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serial_number,
    location: asset.location,
    department: asset.department,
    owner: asset.owner,
    assignedTo: asset.assigned_to,
    status: asset.status as ItemStatus,
    purchaseDate: asset.purchase_date,
    purchaseCost: asset.purchase_cost,
    warrantyExpiry: asset.warranty_expiry,
    lastMaintenance: asset.last_maintenance,
    nextMaintenance: asset.next_maintenance,
    ipAddress: asset.ip_address,
    macAddress: asset.mac_address,
    operatingSystem: asset.operating_system,
    softwareLicenses: asset.software_licenses || [],
    configuration: asset.configuration || {},
    notes: asset.notes,
    tags: asset.tags || [],
    createdAt: asset.created_at || new Date().toISOString(),
    updatedAt: asset.updated_at || new Date().toISOString(),
    createdBy: asset.created_by,
    updatedBy: asset.updated_by
  };
}

// 資産更新
export async function updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
  const payload = {
    asset_tag: updates.assetTag,
    name: updates.name,
    description: updates.description,
    category: updates.category,
    type: updates.type,
    manufacturer: updates.manufacturer,
    model: updates.model,
    serial_number: updates.serialNumber,
    location: updates.location,
    department: updates.department,
    owner: updates.owner,
    assigned_to: updates.assignedTo,
    status: updates.status,
    purchase_date: updates.purchaseDate,
    purchase_cost: updates.purchaseCost,
    warranty_expiry: updates.warrantyExpiry,
    last_maintenance: updates.lastMaintenance,
    next_maintenance: updates.nextMaintenance,
    ip_address: updates.ipAddress,
    mac_address: updates.macAddress,
    operating_system: updates.operatingSystem,
    software_licenses: updates.softwareLicenses,
    configuration: updates.configuration,
    notes: updates.notes,
    tags: updates.tags,
    updated_by: updates.updatedBy
  };

  const response = await apiPut<ApiResponse<Asset>>(`/api/assets/${id}`, payload);

  const asset = response.data || response;
  return {
    id: String(asset.id || asset.asset_id),
    assetTag: asset.asset_tag,
    name: asset.name,
    description: asset.description,
    category: asset.category,
    type: asset.type,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serial_number,
    location: asset.location,
    department: asset.department,
    owner: asset.owner,
    assignedTo: asset.assigned_to,
    status: asset.status as ItemStatus,
    purchaseDate: asset.purchase_date,
    purchaseCost: asset.purchase_cost,
    warrantyExpiry: asset.warranty_expiry,
    lastMaintenance: asset.last_maintenance,
    nextMaintenance: asset.next_maintenance,
    ipAddress: asset.ip_address,
    macAddress: asset.mac_address,
    operatingSystem: asset.operating_system,
    softwareLicenses: asset.software_licenses || [],
    configuration: asset.configuration || {},
    notes: asset.notes,
    tags: asset.tags || [],
    createdAt: asset.created_at || new Date().toISOString(),
    updatedAt: asset.updated_at || new Date().toISOString(),
    createdBy: asset.created_by,
    updatedBy: asset.updated_by
  };
}

// 資産削除
export async function deleteAsset(id: string): Promise<void> {
  await apiDelete(`/api/assets/${id}`);
}

// 資産統計取得
export async function getAssetStats(): Promise<any> {
  const response = await apiGet<any>('/api/assets/stats');
  return response;
}

// 資産タグ生成
export async function generateAssetTag(type: string): Promise<string> {
  const response = await apiGet<{ assetTag: string }>(`/api/assets/generate-tag?type=${encodeURIComponent(type)}`);
  return response.assetTag;
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