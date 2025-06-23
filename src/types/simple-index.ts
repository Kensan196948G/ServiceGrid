// 簡略化された型定義ファイル - アプリケーション動作確認用

// ユーザー関連
export enum UserRole {
  ADMIN = 'Admin',
  USER = 'User',
  READ_ONLY = 'ReadOnly'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
  department?: string;
  title?: string;
}

export interface MicrosoftApiCredentials {
  clientId: string;
  tenantId: string;
  clientSecret?: string;
}

// 基本的な型のみをエクスポート（問題が発生しているものは除外）
export * from './user';
export * from './common';

// その他必要最小限の型のみ
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ItemStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';