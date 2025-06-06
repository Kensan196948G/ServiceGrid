// Re-export all types from the new modular structure for backward compatibility
export * from './types/index';

// 追加で必要な型を直接export
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

// ServiceRequest interface
export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  assignedTo?: string;
  status: import('./types/common').ItemStatus;
  createdAt: string;
  updatedAt: string;
  serviceType: string; 
}

// TODO: このファイルは後方互換性のためのものです。
// 新しいコードでは ./types から直接インポートしてください。