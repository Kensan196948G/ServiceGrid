import { KnowledgeArticle, KnowledgeStats, KnowledgeFilter, CreateKnowledgeArticle, UpdateKnowledgeArticle } from '../types/knowledge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

// 共通のヘッダー取得
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

/**
 * ナレッジ記事一覧を取得
 */
export const getKnowledgeArticles = async (filters?: KnowledgeFilter): Promise<{
  data: KnowledgeArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const params = new URLSearchParams();
  
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.category) params.append('category', filters.category);
  if (filters?.created_by) params.append('created_by', filters.created_by);
  if (filters?.search) params.append('search', filters.search);

  const response = await fetch(`${API_BASE_URL}/api/knowledge?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ナレッジ記事の取得に失敗しました');
  }

  const data = await response.json();
  
  // バックエンドのフィールド名をフロントエンド形式に変換
  const articles = data.data.map((item: any) => ({
    id: item.knowledge_id,
    title: item.title,
    content: item.content,
    excerpt: item.excerpt,
    category: item.category,
    status: item.status || 'Draft',
    author: {
      id: item.created_by,
      name: item.created_by,
      email: `${item.created_by}@company.com`
    },
    created_date: item.created_date,
    updated_date: item.updated_date,
    approval_date: item.approval_date,
    approver: item.approver_id ? {
      id: item.approver_id,
      name: item.approver_id,
      email: `${item.approver_id}@company.com`
    } : undefined,
    view_count: item.view_count || 0,
    rating: {
      average: item.average_rating || 0,
      count: item.rating_count || 0
    },
    tags: item.tags ? JSON.parse(item.tags) : [],
    attachments: []
  }));

  return {
    data: articles,
    pagination: data.pagination
  };
};

/**
 * ナレッジ記事詳細を取得
 */
export const getKnowledgeArticleById = async (id: string): Promise<KnowledgeArticle> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ナレッジ記事の取得に失敗しました');
  }

  const item = await response.json();
  
  return {
    id: item.knowledge_id,
    title: item.title,
    content: item.content,
    category: item.category,
    status: item.status || 'Draft',
    author: {
      id: item.created_by,
      name: item.created_by,
      email: `${item.created_by}@company.com`
    },
    created_date: item.created_date,
    updated_date: item.updated_date,
    approval_date: item.approval_date,
    approver: item.approver_id ? {
      id: item.approver_id,
      name: item.approver_id,
      email: `${item.approver_id}@company.com`
    } : undefined,
    view_count: item.view_count || 0,
    rating: {
      average: item.average_rating || 0,
      count: item.rating_count || 0
    },
    tags: item.tags ? JSON.parse(item.tags) : [],
    attachments: []
  };
};

/**
 * ナレッジ記事を作成
 */
export const createKnowledgeArticle = async (data: CreateKnowledgeArticle): Promise<KnowledgeArticle> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title: data.title,
      content: data.content,
      category: data.category,
      created_by: data.author_id || data.author?.id
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ナレッジ記事の作成に失敗しました');
  }

  const item = await response.json();
  
  return {
    id: item.knowledge_id,
    title: item.title,
    content: item.content,
    category: item.category,
    status: item.status || 'Draft',
    author: {
      id: item.created_by,
      name: item.created_by,
      email: `${item.created_by}@company.com`
    },
    created_date: item.created_date,
    updated_date: item.updated_date,
    view_count: 0,
    rating: { average: 0, count: 0 },
    tags: [],
    attachments: []
  };
};

/**
 * ナレッジ記事を更新
 */
export const updateKnowledgeArticle = async (id: string, data: UpdateKnowledgeArticle): Promise<KnowledgeArticle> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title: data.title,
      content: data.content,
      category: data.category
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ナレッジ記事の更新に失敗しました');
  }

  const item = await response.json();
  
  return {
    id: item.knowledge_id,
    title: item.title,
    content: item.content,
    category: item.category,
    status: item.status || 'Draft',
    author: {
      id: item.created_by,
      name: item.created_by,
      email: `${item.created_by}@company.com`
    },
    created_date: item.created_date,
    updated_date: item.updated_date,
    approval_date: item.approval_date,
    approver: item.approver_id ? {
      id: item.approver_id,
      name: item.approver_id,
      email: `${item.approver_id}@company.com`
    } : undefined,
    view_count: item.view_count || 0,
    rating: {
      average: item.average_rating || 0,
      count: item.rating_count || 0
    },
    tags: item.tags ? JSON.parse(item.tags) : [],
    attachments: []
  };
};

/**
 * ナレッジ記事を削除
 */
export const deleteKnowledgeArticle = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ナレッジ記事の削除に失敗しました');
  }
};

/**
 * ナレッジ記事を承認/却下
 */
export const approveKnowledgeArticle = async (id: string, approved: boolean, comments?: string): Promise<KnowledgeArticle> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/${id}/approve`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approved, comments }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ナレッジ記事の承認処理に失敗しました');
  }

  const result = await response.json();
  const item = result.data;
  
  return {
    id: item.knowledge_id,
    title: item.title,
    content: item.content,
    category: item.category,
    status: item.status,
    author: {
      id: item.created_by,
      name: item.created_by,
      email: `${item.created_by}@company.com`
    },
    created_date: item.created_date,
    updated_date: item.updated_date,
    approval_date: item.approval_date,
    approver: item.approver_id ? {
      id: item.approver_id,
      name: item.approver_id,
      email: `${item.approver_id}@company.com`
    } : undefined,
    view_count: item.view_count || 0,
    rating: {
      average: item.average_rating || 0,
      count: item.rating_count || 0
    },
    tags: item.tags ? JSON.parse(item.tags) : [],
    attachments: []
  };
};

/**
 * ナレッジ記事を評価
 */
export const rateKnowledgeArticle = async (id: string, rating: number, comment?: string): Promise<{
  average: number;
  count: number;
  user_rating: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/${id}/rate`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ rating, comment }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ナレッジ記事の評価に失敗しました');
  }

  const result = await response.json();
  return result.rating;
};

/**
 * ナレッジ記事を検索
 */
export const searchKnowledgeArticles = async (query: string, filters?: KnowledgeFilter): Promise<{
  data: KnowledgeArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const params = new URLSearchParams();
  params.append('q', query);
  
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.category) params.append('category', filters.category);
  if (filters?.created_by) params.append('created_by', filters.created_by);

  const response = await fetch(`${API_BASE_URL}/api/knowledge/search?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ナレッジ記事の検索に失敗しました');
  }

  const data = await response.json();
  
  // バックエンドのフィールド名をフロントエンド形式に変換
  const articles = data.data.map((item: any) => ({
    id: item.knowledge_id,
    title: item.title,
    content: item.content,
    excerpt: item.excerpt,
    category: item.category,
    status: item.status || 'Draft',
    author: {
      id: item.created_by,
      name: item.created_by,
      email: `${item.created_by}@company.com`
    },
    created_date: item.created_date,
    updated_date: item.updated_date,
    view_count: item.view_count || 0,
    rating: {
      average: item.average_rating || 0,
      count: item.rating_count || 0
    },
    tags: item.tags ? JSON.parse(item.tags) : [],
    attachments: []
  }));

  return {
    data: articles,
    pagination: data.pagination
  };
};

/**
 * ナレッジ統計を取得
 */
export const getKnowledgeStats = async (): Promise<KnowledgeStats> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/stats`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ナレッジ統計の取得に失敗しました');
  }

  const data = await response.json();
  
  return {
    total: data.total,
    by_category: data.by_category,
    by_status: data.by_status || { Published: 0, Draft: 0, Review: 0, Rejected: 0 },
    top_authors: data.top_authors,
    recent_activity: [],
    popular_articles: []
  };
};