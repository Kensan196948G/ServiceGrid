// 簡略化された localization - アプリケーション動作確認用

type UserRole = 'Admin' | 'User' | 'ReadOnly';
type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export const userRoleToJapanese = (role: UserRole): string => {
  switch (role) {
    case 'Admin': return '管理者';
    case 'User': return 'ユーザー';
    case 'ReadOnly': return '閲覧専用';
    default: return role;
  }
};

export const priorityToJapanese = (priority: Priority): string => {
  switch (priority) {
    case 'Low': return '低';
    case 'Medium': return '中';
    case 'High': return '高';
    case 'Critical': return 'クリティカル';
    default: return priority;
  }
};

// 共通UI メッセージ
export const UI_MESSAGES = {
  save: '保存',
  cancel: 'キャンセル',
  edit: '編集',
  delete: '削除',
  create: '作成',
  loading: '読み込み中...',
  error: 'エラーが発生しました',
  success: '正常に処理されました'
};

// エラーメッセージフォーマット
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return UI_MESSAGES.error;
};

// 日付フォーマット
export const formatDateTime = (date: string | Date): string => {
  try {
    const d = new Date(date);
    return d.toLocaleString('ja-JP');
  } catch {
    return '不明';
  }
};