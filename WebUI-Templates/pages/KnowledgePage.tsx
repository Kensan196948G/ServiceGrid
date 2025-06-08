
import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { 
  KnowledgeArticle, 
  UserRole, 
  KnowledgeArticleStatus, 
  ConfidentialityLevel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  KnowledgeArticleComment,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  KnowledgeArticleRating,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  KnowledgeArticleAttachment,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  KnowledgeArticleVersion
} from '../types';
import { 
  getKnowledgeArticles, 
  addKnowledgeArticle, 
  updateKnowledgeArticle, 
  deleteKnowledgeArticle as deleteKnowledgeArticleAPI 
} from '../services/mockItsmService';
import { Button, Modal, Input, Textarea, Spinner, Card, Notification, NotificationType, Select, Table } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { knowledgeArticleStatusToJapanese, confidentialityLevelToJapanese } from '../localization';

const KnowledgePage: React.FC = () => {
  const [allArticles, setAllArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<KnowledgeArticle> | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<KnowledgeArticleStatus | ''>('');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');

  // Pagination for article list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5); 

  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const categories = useMemo(() => ['一般IT', 'Microsoft 365', 'ネットワーク問題', 'ソフトウェアガイド', 'ハードウェアトラブルシューティング', 'セキュリティベストプラクティス', '業務アプリケーション', 'その他'],[]);
  const articleStatusOptions = useMemo(() => [
    { value: '', label: 'すべてのステータス' },
    ...Object.values(KnowledgeArticleStatus).map(s => ({ value: s, label: knowledgeArticleStatusToJapanese(s) }))
  ], []);
   const confidentialityLevels: ConfidentialityLevel[] = [ConfidentialityLevel.PUBLIC, ConfidentialityLevel.INTERNAL, ConfidentialityLevel.CONFIDENTIAL, ConfidentialityLevel.STRICTLY_CONFIDENTIAL];


  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getKnowledgeArticles();
      setAllArticles(data.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      setNotification({ message: 'ナレッジベース記事の読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleOpenModal = (article?: KnowledgeArticle) => {
    const defaultArticleData: Partial<KnowledgeArticle> = {
      title: '', 
      content: '', 
      category: categories[0], 
      tags: [],
      status: KnowledgeArticleStatus.DRAFT,
      confidentialityLevel: ConfidentialityLevel.INTERNAL,
      currentVersion: 1,
      viewPermissions: [],
      editPermissions: [],
      targetAudience: [],
      relatedIncidents: [],
      relatedProblems: [],
      relatedChanges: [],
      referenceUrls: [],
      attachments: [],
      relatedArticles: [],
      comments: [],
      ratings: [],
    };
    setEditingArticle(article ? { ...article } : defaultArticleData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingArticle(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingArticle) {
      const { name, value } = e.target;
      const arrayFields = ['tags', 'viewPermissions', 'editPermissions', 'targetAudience', 'relatedIncidents', 'relatedProblems', 'relatedChanges', 'referenceUrls', 'relatedArticles'];
      if (arrayFields.includes(name)) {
        setEditingArticle({ ...editingArticle, [name]: value.split(',').map(item => item.trim()).filter(item => item) });
      } else if (name === "currentVersion" || name === "viewCount") {
        setEditingArticle({ ...editingArticle, [name]: parseInt(value, 10) || 0 });
      }
      else {
        setEditingArticle({ ...editingArticle, [name]: value });
      }
    }
  };

  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !user) return;

    try {
      const articleToSave = { 
        title: editingArticle.title || '無題の記事',
        content: editingArticle.content || '',
        category: editingArticle.category || categories[0],
        tags: editingArticle.tags || [],
        status: editingArticle.status || KnowledgeArticleStatus.DRAFT,
        approverUserId: editingArticle.approverUserId,
        approverUsername: editingArticle.approverUsername,
        approvalDate: editingArticle.approvalDate,
        expiryDate: editingArticle.expiryDate,
        reviewDate: editingArticle.reviewDate,
        viewPermissions: editingArticle.viewPermissions || [],
        editPermissions: editingArticle.editPermissions || [],
        targetAudience: editingArticle.targetAudience || [],
        confidentialityLevel: editingArticle.confidentialityLevel || ConfidentialityLevel.INTERNAL,
        relatedIncidents: editingArticle.relatedIncidents || [],
        relatedProblems: editingArticle.relatedProblems || [],
        relatedChanges: editingArticle.relatedChanges || [],
        referenceUrls: editingArticle.referenceUrls || [],
        attachments: editingArticle.attachments || [],
        relatedArticles: editingArticle.relatedArticles || [],
        viewCount: editingArticle.viewCount || 0,
        ratings: editingArticle.ratings || [],
        averageRating: editingArticle.averageRating, 
        comments: editingArticle.comments || [],
      };

      if (editingArticle.id) { 
        const updateData: Partial<Omit<KnowledgeArticle, 'id' | 'createdAt' | 'authorUserId' | 'authorUsername'>> = {
          ...articleToSave,
        };
        await updateKnowledgeArticle(editingArticle.id, updateData, {userId: user.id, username: user.username}, editingArticle.versionHistory?.slice(-1)[0]?.summary || "内容更新");
        setNotification({ message: '記事が正常に更新されました。', type: NotificationType.SUCCESS });
      } else { 
        await addKnowledgeArticle(articleToSave as Omit<KnowledgeArticle, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'versionHistory' | 'authorUserId' | 'authorUsername'>, {userId: user.id, username: user.username});
        setNotification({ message: '記事が正常に作成されました。', type: NotificationType.SUCCESS });
      }
      fetchArticles();
      handleCloseModal();
      setSelectedArticle(null); 
    } catch (error) {
      console.error("Failed to save article:", error);
      setNotification({ message: '記事の保存に失敗しました。', type: NotificationType.ERROR });
    }
  };
  
  const handleDeleteArticle = async (id: string) => {
    if (!user) return;
    if (window.confirm('この記事を削除してもよろしいですか？この操作は元に戻せません。')) {
      try {
        await deleteKnowledgeArticleAPI(id, {userId: user.id, username: user.username});
        setNotification({ message: '記事が正常に削除されました。', type: NotificationType.SUCCESS });
        fetchArticles();
        setSelectedArticle(null); 
      } catch (error) {
        console.error("Failed to delete article:", error);
        setNotification({ message: '記事の削除に失敗しました。', type: NotificationType.ERROR });
      }
    }
  };

  const filteredArticles = useMemo(() => {
    return allArticles.filter(article => {
      const searchMatch = searchTerm.toLowerCase() ? 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      const categoryMatch = categoryFilter ? article.category === categoryFilter : true;
      const statusMatch = statusFilter ? article.status === statusFilter : true;
      
      let dateMatch = true;
      if (dateStartFilter && dateEndFilter) {
        const articleDate = new Date(article.updatedAt);
        dateMatch = articleDate >= new Date(dateStartFilter) && articleDate <= new Date(dateEndFilter);
      } else if (dateStartFilter) {
        dateMatch = new Date(article.updatedAt) >= new Date(dateStartFilter);
      } else if (dateEndFilter) {
        dateMatch = new Date(article.updatedAt) <= new Date(dateEndFilter);
      }
      return searchMatch && categoryMatch && statusMatch && dateMatch;
    });
  }, [allArticles, searchTerm, categoryFilter, statusFilter, dateStartFilter, dateEndFilter]);

  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredArticles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredArticles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);

  const DetailSection: React.FC<{title: string; children: ReactNode; className?: string}> = ({title, children, className}) => (
    <div className={`mb-6 p-3 bg-slate-50 rounded-md shadow-sm ${className}`}>
      <h4 className="text-md font-semibold text-slate-700 border-b border-slate-300 pb-1 mb-2">{title}</h4>
      <div className="text-sm text-slate-600 space-y-1">{children}</div>
    </div>
  );

  const renderArticleDetails = (article: KnowledgeArticle | null) => {
    if (!article) {
      return (
        <Card className="h-full flex items-center justify-center">
          <div className="text-center text-slate-500">
            <BookOpenIcon className="mx-auto h-12 w-12 mb-2" />
            <p>左のリストから記事を選択して詳細を表示します。</p>
          </div>
        </Card>
      );
    }

    const versionHistoryTableData = (article.versionHistory || [])
      .map(vh => ({ ...vh, id: vh.version })) 
      .sort((a,b) => b.version - a.version);

    return (
      <Card title={`詳細: ${article.title}`} className="overflow-y-auto h-full">
        <div className="p-1">
          <DetailSection title="１．ナレッジ記事基本情報">
            <p><strong>ナレッジID/記事番号:</strong> {article.id}</p>
            <p><strong>タイトル/件名:</strong> {article.title}</p>
            <p><strong>カテゴリ分類:</strong> {article.category}</p>
            <p><strong>キーワード・タグ:</strong> {article.tags.join(', ') || 'なし'}</p>
            <p><strong>作成日時:</strong> {new Date(article.createdAt).toLocaleString()}</p>
            <p><strong>更新日時:</strong> {new Date(article.updatedAt).toLocaleString()}</p>
            <p><strong>最終更新者:</strong> {article.lastUpdatedByUsername || article.authorUsername}</p>
            <div className="mt-3">
              <h5 className="text-sm font-semibold text-slate-600 mb-1">記事本文:</h5>
              <div className="prose prose-sm max-w-none p-2 border rounded bg-white" dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }}></div>
            </div>
          </DetailSection>

          <DetailSection title="２．ステータス・承認情報">
            <p><strong>公開状態:</strong> {knowledgeArticleStatusToJapanese(article.status)}</p>
            {article.approverUsername && <p><strong>承認者情報:</strong> {article.approverUsername}</p>}
            {article.approvalDate && <p><strong>承認日時:</strong> {new Date(article.approvalDate).toLocaleString()}</p>}
            {article.expiryDate && <p><strong>有効期限:</strong> {new Date(article.expiryDate).toLocaleDateString()}</p>}
            {article.reviewDate && <p><strong>レビュー予定日:</strong> {new Date(article.reviewDate).toLocaleDateString()}</p>}
          </DetailSection>

          <DetailSection title="３．権限・アクセス制御">
            <p><strong>参照権限設定:</strong> {article.viewPermissions?.join(', ') || '未設定'}</p>
            <p><strong>編集権限設定:</strong> {article.editPermissions?.join(', ') || '未設定'}</p>
            <p><strong>対象部署・ロール:</strong> {article.targetAudience?.join(', ') || '全社'}</p>
            <p><strong>機密レベル:</strong> {article.confidentialityLevel ? confidentialityLevelToJapanese(article.confidentialityLevel) : '未設定'}</p>
          </DetailSection>
          
          <DetailSection title="４．関連情報・リンク">
            {article.relatedIncidents && article.relatedIncidents.length > 0 && <p><strong>関連するインシデント:</strong> {article.relatedIncidents.join(', ')}</p>}
            {article.relatedProblems && article.relatedProblems.length > 0 && <p><strong>関連する問題記録:</strong> {article.relatedProblems.join(', ')}</p>}
            {article.relatedChanges && article.relatedChanges.length > 0 && <p><strong>関連する変更要求:</strong> {article.relatedChanges.join(', ')}</p>}
            {article.referenceUrls && article.referenceUrls.length > 0 && <div><strong>参考URL:</strong> {article.referenceUrls.map(url => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">{url}</a>)}</div>}
            {article.attachments && article.attachments.length > 0 && <div><strong>添付ファイル:</strong> {article.attachments.map(att => <span key={att.id} className="block">{att.name} ({(att.size / 1024).toFixed(1)}KB)</span>)}</div>}
            {article.relatedArticles && article.relatedArticles.length > 0 && <p><strong>関連ナレッジ記事:</strong> {article.relatedArticles.join(', ')}</p>}
          </DetailSection>

          <DetailSection title="５．利用状況・評価">
            <p><strong>参照回数:</strong> {article.viewCount || 0} 回</p>
            <p><strong>評価・レーティング:</strong> {article.averageRating?.toFixed(1) || '評価なし'} ({article.ratings?.length || 0}件の評価)</p>
            {article.comments && article.comments.length > 0 && (
              <div><strong>コメント・フィードバック:</strong>
                <ul className="list-disc list-inside ml-4 max-h-40 overflow-y-auto">
                  {article.comments.map(c => <li key={c.id}><strong>{c.username}:</strong> {c.text} ({new Date(c.date).toLocaleDateString()})</li>)}
                </ul>
              </div>
            )}
            <p><strong>利用統計:</strong> (詳細な統計はここに表示されます)</p>
          </DetailSection>
          
          <DetailSection title="６．変更履歴">
            <p><strong>版数管理 (現在のバージョン):</strong> {article.currentVersion}</p>
            {versionHistoryTableData.length > 0 ? (
              <>
                <p className="font-medium mb-1">変更内容履歴:</p>
                <Table
                    columns={[
                    { Header: 'Ver.', accessor: (row) => row.version },
                    { Header: '更新日', accessor: (row) => new Date(row.date).toLocaleDateString() },
                    { Header: '変更者情報', accessor: (row) => row.editorUsername },
                    { Header: '変更内容履歴', accessor: (row) => row.summary },
                    { Header: '変更理由', accessor: (row) => row.reason || '-' },
                    ]}
                    data={versionHistoryTableData}
                />
              </>
            ) : <p>変更履歴はありません。</p>}
          </DetailSection>
          
          {user?.role === UserRole.ADMIN && (
            <div className="mt-6 flex space-x-2">
              <Button onClick={() => handleOpenModal(article)} variant="primary">この記事を編集</Button>
              <Button onClick={() => handleDeleteArticle(article.id)} variant="danger">この記事を削除</Button>
            </div>
          )}
        </div>
      </Card>
    );
  };
  
  const BookOpenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-semibold text-slate-800">ナレッジ管理</h2>
        {user?.role === UserRole.ADMIN && <Button onClick={() => handleOpenModal()}>新規記事作成</Button>}
      </div>

      {/* Main content: Filters, List, Detail View */}
      <div className="flex-grow flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Left Pane: Filters and List */}
        <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col gap-6">
          <Card title="検索・フィルタ機能"> {/* User specified "検索・フィルタ機能" as section 7 */}
            <div className="space-y-3 p-1">
              <Input type="search" placeholder="キーワード検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <Select label="カテゴリフィルタ" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={[{value: '', label: '全カテゴリ'}, ...categories.map(c => ({value: c, label: c}))]} />
              <Select label="ステータス絞り込み" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as KnowledgeArticleStatus | '')} options={articleStatusOptions} />
              <Input label="日付範囲指定 (開始)" type="date" value={dateStartFilter} onChange={(e) => setDateStartFilter(e.target.value)} />
              <Input label="日付範囲指定 (終了)" type="date" value={dateEndFilter} onChange={(e) => setDateEndFilter(e.target.value)} />
              <Button variant="secondary" onClick={() => {setSearchTerm(''); setCategoryFilter(''); setStatusFilter(''); setDateStartFilter(''); setDateEndFilter(''); setCurrentPage(1);}} className="w-full">
                フィルタークリア
              </Button>
            </div>
          </Card>
          <Card title="記事一覧" className="flex-grow overflow-hidden flex flex-col">
            {isLoading ? <div className="flex-grow flex justify-center items-center"><Spinner size="lg" /></div> : 
              filteredArticles.length > 0 ? (
              <>
                <ul className="space-y-2 p-2 overflow-y-auto flex-grow">
                  {paginatedArticles.map(article => (
                    <li key={article.id} 
                        className={`p-2 rounded cursor-pointer hover:bg-blue-100 ${selectedArticle?.id === article.id ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-slate-50'}`}
                        onClick={() => setSelectedArticle(article)}>
                      <h5 className="font-semibold text-blue-700 truncate" title={article.title}>{article.title}</h5>
                      <p className="text-xs text-slate-500 truncate">{article.category} - 更新日: {new Date(article.updatedAt).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
                {totalPages > 1 && (
                  <div className="p-2 border-t flex justify-between items-center text-sm">
                    <Button size="sm" onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage === 1}>前へ</Button>
                    <span>ページ {currentPage} / {totalPages}</span>
                    <Button size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>次へ</Button>
                  </div>
                )}
              </>
            ) : (
              <p className="p-4 text-slate-500 italic text-center flex-grow flex items-center justify-center">記事が見つかりません。</p>
            )}
          </Card>
        </div>

        {/* Right Pane: Article Details */}
        <div className="w-full md:w-2/3 lg:w-3/4 flex-grow overflow-y-auto">
          {isLoading && !selectedArticle ? <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div> : renderArticleDetails(selectedArticle)}
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {editingArticle && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingArticle.id ? '記事編集' : '新規記事作成'} size="xl">
          <form onSubmit={handleSubmitArticle} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
            <fieldset className="border p-3 rounded">
              <legend className="text-md font-semibold px-1">基本情報</legend>
              <Input label="タイトル/件名" name="title" value={editingArticle.title || ''} onChange={handleInputChange} required />
              <Select label="カテゴリ分類" name="category" value={editingArticle.category || categories[0]} onChange={handleInputChange} options={categories.map(c => ({ value: c, label: c }))} required />
              <Input label="キーワード・タグ (カンマ区切り)" name="tags" value={editingArticle.tags?.join(', ') || ''} onChange={handleInputChange} />
              <Textarea label="記事本文 (Markdown可)" name="content" value={editingArticle.content || ''} onChange={handleInputChange} rows={10} required />
            </fieldset>

            <fieldset className="border p-3 rounded">
              <legend className="text-md font-semibold px-1">ステータス・承認情報</legend>
              <Select label="公開状態" name="status" value={editingArticle.status || KnowledgeArticleStatus.DRAFT} onChange={handleInputChange} options={Object.values(KnowledgeArticleStatus).map(s => ({ value: s, label: knowledgeArticleStatusToJapanese(s) }))} required />
              <Input label="承認者ユーザー名 (任意)" name="approverUsername" value={editingArticle.approverUsername || ''} onChange={handleInputChange} />
              <Input label="承認日時 (任意)" name="approvalDate" type="datetime-local" value={editingArticle.approvalDate ? new Date(editingArticle.approvalDate).toISOString().substring(0,16) : ''} onChange={handleInputChange} />
              <Input label="有効期限 (任意)" name="expiryDate" type="date" value={editingArticle.expiryDate ? new Date(editingArticle.expiryDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
              <Input label="レビュー予定日 (任意)" name="reviewDate" type="date" value={editingArticle.reviewDate ? new Date(editingArticle.reviewDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
            </fieldset>
            
            <fieldset className="border p-3 rounded">
              <legend className="text-md font-semibold px-1">権限・アクセス制御</legend>
              <Input label="参照権限 (カンマ区切り: ロール/部署)" name="viewPermissions" value={editingArticle.viewPermissions?.join(', ') || ''} onChange={handleInputChange} />
              <Input label="編集権限 (カンマ区切り: ロール/部署)" name="editPermissions" value={editingArticle.editPermissions?.join(', ') || ''} onChange={handleInputChange} />
              <Input label="対象部署・ロール (カンマ区切り)" name="targetAudience" value={editingArticle.targetAudience?.join(', ') || ''} onChange={handleInputChange} />
              <Select label="機密レベル" name="confidentialityLevel" value={editingArticle.confidentialityLevel || ConfidentialityLevel.INTERNAL} onChange={handleInputChange} options={confidentialityLevels.map(cl => ({ value: cl, label: confidentialityLevelToJapanese(cl) }))} />
            </fieldset>

            <fieldset className="border p-3 rounded">
              <legend className="text-md font-semibold px-1">関連情報・リンク</legend>
              <Input label="関連インシデントID (カンマ区切り)" name="relatedIncidents" value={editingArticle.relatedIncidents?.join(', ') || ''} onChange={handleInputChange} />
              <Input label="関連問題ID (カンマ区切り)" name="relatedProblems" value={editingArticle.relatedProblems?.join(', ') || ''} onChange={handleInputChange} />
              <Input label="関連変更ID (カンマ区切り)" name="relatedChanges" value={editingArticle.relatedChanges?.join(', ') || ''} onChange={handleInputChange} />
              <Textarea label="参考URL (1行に1URL)" name="referenceUrls" value={editingArticle.referenceUrls?.join('\n') || ''} onChange={e => setEditingArticle({...editingArticle, referenceUrls: e.target.value.split('\n').map(url=>url.trim()).filter(url=>url)})} rows={3}/>
              <Input label="関連ナレッジ記事ID (カンマ区切り)" name="relatedArticles" value={editingArticle.relatedArticles?.join(', ') || ''} onChange={handleInputChange} />
            </fieldset>

            {editingArticle.id && (
              <fieldset className="border p-3 rounded">
                <legend className="text-md font-semibold px-1">今回の変更概要</legend>
                <Input 
                  label="変更の概要 (必須)" 
                  name="versionSummary" 
                  value={editingArticle.versionHistory?.slice(-1)[0]?.summary || ''}
                  onChange={(e) => {
                    // This needs a dedicated state for new version summary
                    // For now, we'll let it be part of editingArticle, but it's not directly saved as such to mock service.
                    // A better approach would be a specific form field for this and pass to updateKnowledgeArticle.
                     setEditingArticle(prev => ({
                        ...prev,
                        versionHistory: prev?.versionHistory ? [
                            ...prev.versionHistory.slice(0, -1),
                            { ...prev.versionHistory.slice(-1)[0], summary: e.target.value }
                        ] : [{ version: prev?.currentVersion || 1, date: new Date().toISOString(), editorUserId: user?.id || '', editorUsername: user?.username || '', summary: e.target.value }]
                    }));
                  }}
                  placeholder="例: 手順3を修正、スクリーンショット追加"
                />
                 <Input 
                  label="変更理由 (任意)" 
                  name="versionReason" 
                  placeholder="例: ユーザーフィードバックに基づき修正"
                   onChange={(e) => {
                     setEditingArticle(prev => ({
                        ...prev,
                        versionHistory: prev?.versionHistory ? [
                            ...prev.versionHistory.slice(0, -1),
                            { ...prev.versionHistory.slice(-1)[0], reason: e.target.value }
                        ] : [{ version: prev?.currentVersion || 1, date: new Date().toISOString(), editorUserId: user?.id || '', editorUsername: user?.username || '', summary: '', reason: e.target.value }]
                    }));
                  }}
                />
              </fieldset>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t mt-4">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>キャンセル</Button>
              <Button type="submit" variant="primary">{editingArticle.id ? '記事更新' : '記事作成'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default KnowledgePage;
