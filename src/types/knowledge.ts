export enum KnowledgeArticleStatus {
  DRAFT = 'Draft',
  REVIEW_PENDING = 'Review Pending',
  APPROVED = 'Approved',
  PUBLISHED = 'Published',
  ARCHIVED = 'Archived',
  NEEDS_UPDATE = 'Needs Update',
}

export enum ConfidentialityLevel {
  PUBLIC = 'Public',
  INTERNAL = 'Internal',
  CONFIDENTIAL = 'Confidential',
  STRICTLY_CONFIDENTIAL = 'Strictly Confidential'
}

export interface KnowledgeArticleAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface KnowledgeArticleComment {
  id: string;
  userId: string;
  username: string;
  text: string;
  date: string;
}

export interface KnowledgeArticleRating {
  userId: string;
  value: 1 | 2 | 3 | 4 | 5;
}

export interface KnowledgeArticleVersion {
  version: number;
  date: string;
  editorUserId: string;
  editorUsername: string;
  summary: string;
  reason?: string;
  contentSnapshot?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  authorUserId: string;
  authorUsername: string;
  lastUpdatedByUserId?: string;
  lastUpdatedByUsername?: string;

  // ステータス・承認情報
  status: KnowledgeArticleStatus;
  approverUserId?: string;
  approverUsername?: string;
  approvalDate?: string;
  expiryDate?: string;
  reviewDate?: string;

  // 権限・アクセス制御
  viewPermissions?: string[];
  editPermissions?: string[];
  targetAudience?: string[];
  confidentialityLevel?: ConfidentialityLevel;

  // 関連情報・リンク
  relatedIncidents?: string[];
  relatedProblems?: string[];
  relatedChanges?: string[];
  referenceUrls?: string[];
  attachments?: KnowledgeArticleAttachment[];
  relatedArticles?: string[];

  // 利用状況・評価
  viewCount?: number;
  ratings?: KnowledgeArticleRating[];
  averageRating?: number;
  comments?: KnowledgeArticleComment[];

  // 変更履歴
  versionHistory?: KnowledgeArticleVersion[];
  currentVersion: number;
}

// Additional types for API service
export interface KnowledgeFilter {
  page?: number;
  limit?: number;
  category?: string;
  created_by?: string;
  search?: string;
}

export interface CreateKnowledgeArticle {
  title: string;
  content: string;
  category: string;
  author_id?: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface UpdateKnowledgeArticle {
  title?: string;
  content?: string;
  category?: string;
}

export interface KnowledgeStats {
  total: number;
  by_category: { [key: string]: number };
  by_status: { [key: string]: number };
  top_authors: Array<{ name: string; count: number }>;
  recent_activity: Array<{ date: string; action: string; article_title: string }>;
  popular_articles: Array<{ id: string; title: string; view_count: number }>;
}