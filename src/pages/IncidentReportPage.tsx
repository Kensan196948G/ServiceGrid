import * as React from 'react';
const { useState, useEffect, useCallback } = React;
import { Incident, ItemStatus, Priority } from '../types';
import { createIncident, getIncidents, updateIncident, deleteIncident } from '../services/incidentApiService';
import { Button, Card, Input, Textarea, Select, Notification, NotificationType, Spinner, Table, Modal } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { itemStatusToJapanese, priorityToJapanese } from '../localization';

const IncidentReportPage: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 報告フォームの状態
  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    priority: 'Medium' as Priority,
    category: 'Other',
    impact: 'Medium',
    urgency: 'Medium',
    affectedUsers: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    workaround: '',
    relatedAssets: '',
    tags: ''
  });

  // 編集モーダルの状態
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const categories = [
    'Infrastructure', 'Application', 'Network', 'Hardware', 
    'Software', 'Security', 'Account', 'Other'
  ];

  const categoryLabels = {
    'Infrastructure': 'インフラストラクチャ',
    'Application': 'アプリケーション',
    'Network': 'ネットワーク',
    'Hardware': 'ハードウェア',
    'Software': 'ソフトウェア',
    'Security': 'セキュリティ',
    'Account': 'アカウント',
    'Other': 'その他'
  };

  const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

  // インシデント一覧を取得
  const fetchIncidents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getIncidents(1, 50);
      setIncidents(response.incidents || []);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
      setNotification({ 
        message: 'インシデント一覧の取得に失敗しました', 
        type: NotificationType.ERROR 
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // フォーム入力の処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReportForm(prev => ({ ...prev, [name]: value }));
  };

  // インシデント報告の送信
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const incidentData = {
        title: reportForm.title,
        description: reportForm.description,
        reportedBy: user.username,
        priority: reportForm.priority,
        category: reportForm.category,
        status: ItemStatus.NEW,
        impact: reportForm.impact,
        urgency: reportForm.urgency,
        affectedUsers: reportForm.affectedUsers ? parseInt(reportForm.affectedUsers) : undefined,
        workaround: reportForm.workaround || undefined,
        relatedAssets: reportForm.relatedAssets ? reportForm.relatedAssets.split(',').map(s => s.trim()).filter(s => s) : [],
        tags: reportForm.tags ? reportForm.tags.split(',').map(s => s.trim()).filter(s => s) : []
      };

      await createIncident(incidentData);
      
      setNotification({ 
        message: 'インシデントが正常に報告されました', 
        type: NotificationType.SUCCESS 
      });

      // フォームをリセット
      setReportForm({
        title: '',
        description: '',
        priority: 'Medium',
        category: 'Other',
        impact: 'Medium',
        urgency: 'Medium',
        affectedUsers: '',
        stepsToReproduce: '',
        expectedBehavior: '',
        actualBehavior: '',
        workaround: '',
        relatedAssets: '',
        tags: ''
      });

      // 一覧を更新
      fetchIncidents();
    } catch (error) {
      console.error('Failed to submit incident report:', error);
      setNotification({ 
        message: 'インシデントの報告に失敗しました', 
        type: NotificationType.ERROR 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // インシデント編集
  const handleEditIncident = (incident: Incident) => {
    setEditingIncident(incident);
    setIsEditModalOpen(true);
  };

  // インシデント完了
  const handleCompleteIncident = async (incidentId: string) => {
    if (!window.confirm('このインシデントを完了状態にしますか？')) return;

    try {
      await updateIncident(incidentId, { status: ItemStatus.RESOLVED });
      setNotification({ 
        message: 'インシデントが完了状態に変更されました', 
        type: NotificationType.SUCCESS 
      });
      fetchIncidents();
    } catch (error) {
      console.error('Failed to complete incident:', error);
      setNotification({ 
        message: 'インシデントの完了処理に失敗しました', 
        type: NotificationType.ERROR 
      });
    }
  };

  // インシデント削除
  const handleDeleteIncident = async (incidentId: string) => {
    if (!window.confirm('このインシデントを削除してもよろしいですか？この操作は取り消せません。')) return;

    try {
      await deleteIncident(incidentId);
      setNotification({ 
        message: 'インシデントが削除されました', 
        type: NotificationType.SUCCESS 
      });
      fetchIncidents();
    } catch (error) {
      console.error('Failed to delete incident:', error);
      setNotification({ 
        message: 'インシデントの削除に失敗しました', 
        type: NotificationType.ERROR 
      });
    }
  };

  // 編集フォームの処理
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncident) return;

    try {
      await updateIncident(editingIncident.id, editingIncident);
      setNotification({ 
        message: 'インシデントが更新されました', 
        type: NotificationType.SUCCESS 
      });
      setIsEditModalOpen(false);
      setEditingIncident(null);
      fetchIncidents();
    } catch (error) {
      console.error('Failed to update incident:', error);
      setNotification({ 
        message: 'インシデントの更新に失敗しました', 
        type: NotificationType.ERROR 
      });
    }
  };

  // テーブルカラム定義
  const columns = [
    { 
      Header: 'ID', 
      accessor: (row: Incident) => (
        <span className="font-mono text-xs">{row.id}</span>
      )
    },
    { 
      Header: 'タイトル', 
      accessor: (row: Incident) => (
        <div>
          <p className="font-medium text-slate-900">{row.title}</p>
          <p className="text-xs text-slate-500 truncate">{row.description.slice(0, 50)}...</p>
        </div>
      )
    },
    { 
      Header: 'ステータス', 
      accessor: (row: Incident) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          row.status === ItemStatus.NEW || row.status === ItemStatus.OPEN ? 'bg-yellow-100 text-yellow-800' :
          row.status === ItemStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
          row.status === ItemStatus.RESOLVED ? 'bg-green-100 text-green-800' :
          'bg-slate-100 text-slate-800'
        }`}>
          {itemStatusToJapanese(row.status)}
        </span>
      )
    },
    { 
      Header: '優先度', 
      accessor: (row: Incident) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded ${
          row.priority === 'Critical' ? 'bg-red-100 text-red-800' :
          row.priority === 'High' ? 'bg-orange-100 text-orange-800' :
          row.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {priorityToJapanese(row.priority)}
        </span>
      )
    },
    { 
      Header: '報告者', 
      accessor: (row: Incident) => row.reportedBy || row.reporter || '不明'
    },
    { 
      Header: '作成日時', 
      accessor: (row: Incident) => new Date(row.createdAt).toLocaleDateString('ja-JP')
    },
    { 
      Header: 'アクション', 
      accessor: (row: Incident) => (
        <div className="flex items-center space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleEditIncident(row)}
          >
            編集
          </Button>
          {row.status !== ItemStatus.RESOLVED && row.status !== ItemStatus.CLOSED && (
            <Button 
              size="sm" 
              variant="primary" 
              onClick={() => handleCompleteIncident(row.id)}
            >
              完了
            </Button>
          )}
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDeleteIncident(row.id)}
          >
            削除
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-800">インシデント報告</h2>
      </div>

      {/* インシデント報告フォーム */}
      <Card title="新しいインシデントを報告">
        <form onSubmit={handleSubmitReport} className="space-y-6 p-6">
          {/* 基本情報 */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">基本情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="インシデントタイトル"
                  name="title"
                  value={reportForm.title}
                  onChange={handleInputChange}
                  placeholder="問題の簡潔な説明を入力してください"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Textarea
                  label="詳細な説明"
                  name="description"
                  value={reportForm.description}
                  onChange={handleInputChange}
                  placeholder="問題の詳細な説明、発生した状況、エラーメッセージなどを入力してください"
                  rows={4}
                  required
                />
              </div>
              <Select
                label="カテゴリ"
                name="category"
                value={reportForm.category}
                onChange={handleInputChange}
                options={categories.map(c => ({ 
                  value: c, 
                  label: categoryLabels[c as keyof typeof categoryLabels] || c 
                }))}
              />
              <Select
                label="優先度"
                name="priority"
                value={reportForm.priority}
                onChange={handleInputChange}
                options={priorities.map(p => ({ 
                  value: p, 
                  label: priorityToJapanese(p) 
                }))}
              />
            </div>
          </div>

          {/* 影響度・緊急度 */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">影響度・緊急度</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="影響度"
                name="impact"
                value={reportForm.impact}
                onChange={handleInputChange}
                options={[
                  { value: 'Low', label: '低' },
                  { value: 'Medium', label: '中' },
                  { value: 'High', label: '高' }
                ]}
              />
              <Select
                label="緊急度"
                name="urgency"
                value={reportForm.urgency}
                onChange={handleInputChange}
                options={[
                  { value: 'Low', label: '低' },
                  { value: 'Medium', label: '中' },
                  { value: 'High', label: '高' }
                ]}
              />
              <Input
                label="影響ユーザー数"
                name="affectedUsers"
                type="number"
                value={reportForm.affectedUsers}
                onChange={handleInputChange}
                placeholder="影響を受けるユーザー数"
                min="0"
              />
            </div>
          </div>

          {/* 詳細情報 */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">詳細情報</h3>
            <div className="space-y-4">
              <Textarea
                label="再現手順 (任意)"
                name="stepsToReproduce"
                value={reportForm.stepsToReproduce}
                onChange={handleInputChange}
                placeholder="問題を再現するための手順を入力してください"
                rows={3}
              />
              <Textarea
                label="期待される動作 (任意)"
                name="expectedBehavior"
                value={reportForm.expectedBehavior}
                onChange={handleInputChange}
                placeholder="本来期待される正常な動作を入力してください"
                rows={2}
              />
              <Textarea
                label="実際の動作 (任意)"
                name="actualBehavior"
                value={reportForm.actualBehavior}
                onChange={handleInputChange}
                placeholder="実際に発生している問題のある動作を入力してください"
                rows={2}
              />
              <Textarea
                label="一時的対処法 (任意)"
                name="workaround"
                value={reportForm.workaround}
                onChange={handleInputChange}
                placeholder="問題を回避するための一時的な対処法があれば入力してください"
                rows={2}
              />
            </div>
          </div>

          {/* 関連情報 */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">関連情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="関連資産 (任意)"
                name="relatedAssets"
                value={reportForm.relatedAssets}
                onChange={handleInputChange}
                placeholder="関連するサーバー、アプリケーション等をカンマ区切りで入力"
              />
              <Input
                label="タグ (任意)"
                name="tags"
                value={reportForm.tags}
                onChange={handleInputChange}
                placeholder="タグをカンマ区切りで入力 (例: 緊急,ネットワーク)"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => setReportForm({
                title: '',
                description: '',
                priority: 'Medium',
                category: 'Other',
                impact: 'Medium',
                urgency: 'Medium',
                affectedUsers: '',
                stepsToReproduce: '',
                expectedBehavior: '',
                actualBehavior: '',
                workaround: '',
                relatedAssets: '',
                tags: ''
              })}
            >
              リセット
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={isSubmitting || !reportForm.title || !reportForm.description}
            >
              {isSubmitting ? <Spinner size="sm" /> : null}
              インシデントを報告
            </Button>
          </div>
        </form>
      </Card>

      {/* インシデント一覧 */}
      <Card title="報告済みインシデント一覧">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table
            columns={columns}
            data={incidents}
          />
        )}
      </Card>

      {/* 編集モーダル */}
      {editingIncident && (
        <Modal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          title={`インシデント編集 - ${editingIncident.id}`}
          size="large"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Input
              label="タイトル"
              value={editingIncident.title}
              onChange={(e) => setEditingIncident({
                ...editingIncident,
                title: e.target.value
              })}
              required
            />
            <Textarea
              label="説明"
              value={editingIncident.description}
              onChange={(e) => setEditingIncident({
                ...editingIncident,
                description: e.target.value
              })}
              rows={4}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="ステータス"
                value={editingIncident.status}
                onChange={(e) => setEditingIncident({
                  ...editingIncident,
                  status: e.target.value as ItemStatus
                })}
                options={Object.values(ItemStatus)
                  .filter(s => ![ItemStatus.PLANNED, ItemStatus.BUILDING, ItemStatus.TESTING, ItemStatus.DEPLOYED, ItemStatus.ROLLED_BACK, ItemStatus.ANALYSIS, ItemStatus.SOLUTION_PROPOSED, ItemStatus.IDENTIFIED, ItemStatus.MITIGATED, ItemStatus.COMPLIANT, ItemStatus.NON_COMPLIANT, ItemStatus.IN_REVIEW, ItemStatus.NOT_APPLICABLE, ItemStatus.PENDING_APPROVAL, ItemStatus.SCHEDULED, ItemStatus.IMPLEMENTED].includes(s))
                  .map(s => ({ value: s, label: itemStatusToJapanese(s) }))}
              />
              <Select
                label="優先度"
                value={editingIncident.priority}
                onChange={(e) => setEditingIncident({
                  ...editingIncident,
                  priority: e.target.value as Priority
                })}
                options={priorities.map(p => ({ 
                  value: p, 
                  label: priorityToJapanese(p) 
                }))}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsEditModalOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" variant="primary">
                更新
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default IncidentReportPage;