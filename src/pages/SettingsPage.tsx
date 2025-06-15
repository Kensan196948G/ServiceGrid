
import * as React from 'react';
const { useState, useCallback, useEffect } = React;
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Notification, NotificationType, Modal, Input } from '../components/CommonUI';
import { AuditLog, UserRole } from '../types';
import { addAuditLog, getAuditLogs } from '../services/mockItsmService';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  adminOnly?: boolean;
}

const SETTING_SECTIONS: SettingSection[] = [
  { id: 'general', title: 'システム全般設定', description: 'アプリケーション名、デフォルト言語、タイムゾーン、メンテナンスモード設定など。' },
  { id: 'userManagement', title: 'ユーザー管理', description: 'ユーザーアカウントの作成・編集・ロック、ロール割り当てなど。', adminOnly: true },
  { id: 'permissionSettings', title: '権限設定', description: '各ユーザーロールに対する機能アクセス権限の詳細設定。', adminOnly: true },
  { id: 'notificationSettings', title: '通知設定', description: 'システム通知（メール、アプリ内）の有効化、トリガー条件、テンプレート管理。' },
  { id: 'slaSettings', title: 'SLA設定', description: 'デフォルトSLA目標値、業務時間定義、休日の設定。', adminOnly: true },
  { id: 'backupSettings', title: 'バックアップ設定', description: '自動バックアップのスケジュール、保存期間、対象（DB、設定ファイルなど）。', adminOnly: true },
  { id: 'securitySettings', title: 'セキュリティ設定', description: 'パスワードポリシー、2FA強制、セッションタイムアウト、IPアクセス制限など。', adminOnly: true },
  { id: 'auditLogSettings', title: '監査ログ設定', description: '監査ログの保存期間、ローテーション閾値、記録ログレベル設定。', adminOnly: true },
  { id: 'integrationSettings', title: 'インテグレーション設定', description: '外部システム（Microsoft Graph API等）との連携、APIキー管理。', adminOnly: true },
];

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [currentSettingsSection, setCurrentSettingsSection] = useState<SettingSection | null>(null);
  
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [recentSettingsLogs, setRecentSettingsLogs] = useState<AuditLog[]>([]);

  const fetchRecentSettingsLogs = useCallback(async () => {
    if (user?.role !== UserRole.ADMIN) return; // Only admin can see settings logs
    try {
      const allLogs = await getAuditLogs();
      const settingsRelatedActions = [
        'システム設定変更', '設定バックアップ実行', '設定復元実行', 
        'MS APIクライアントシークレット更新' // example existing one
      ];
      // Filter logs related to settings and take last 5
      const filtered = allLogs
        .filter(log => settingsRelatedActions.some(actionKeyword => log.action.includes(actionKeyword)))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
      setRecentSettingsLogs(filtered);
    } catch (error) {
      console.error("Failed to fetch recent settings logs:", error);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchRecentSettingsLogs();
  }, [fetchRecentSettingsLogs]);


  const handleOpenSettingsModal = (section: SettingSection) => {
    if (section.adminOnly && user?.role !== UserRole.ADMIN) {
      setNotification({ message: 'この設定の変更には管理者権限が必要です。', type: NotificationType.WARNING });
      return;
    }
    setCurrentSettingsSection(section);
    setIsSettingsModalOpen(true);
  };

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
    setCurrentSettingsSection(null);
  };

  const handleSimulatedSettingChange = async () => {
    if (!currentSettingsSection || !user) return;
    // Simulate saving settings
    setNotification({ message: `「${currentSettingsSection.title}」が更新されました。（シミュレーション）`, type: NotificationType.SUCCESS });
    await addAuditLog({
      userId: user.id,
      username: user.username,
      action: 'システム設定変更',
      details: `設定セクション「${currentSettingsSection.title}」が変更されました。`
    });
    fetchRecentSettingsLogs(); // Refresh logs
    handleCloseSettingsModal();
  };

  const handleBackupSettings = async () => {
    if (!user) return;
    // Simulate backup process
    setNotification({ message: 'システム設定のバックアップが正常に作成されました。（シミュレーション）', type: NotificationType.SUCCESS });
    await addAuditLog({
      userId: user.id,
      username: user.username,
      action: '設定バックアップ実行',
      details: 'システム設定のバックアップが手動で実行されました。'
    });
    fetchRecentSettingsLogs();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedBackupFile(event.target.files[0]);
      setNotification({ message: `ファイル「${event.target.files[0].name}」が選択されました。`, type: NotificationType.INFO });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      // Basic validation for file type can be added here if needed
      // e.g., if (event.dataTransfer.files[0].type === 'application/json')
      setSelectedBackupFile(event.dataTransfer.files[0]);
      setNotification({ message: `ファイル「${event.dataTransfer.files[0].name}」がドロップされました。`, type: NotificationType.INFO });
    }
  };

  const handleRestoreSettings = async () => {
    if (!selectedBackupFile || !user) {
      setNotification({ message: '復元するバックアップファイルを選択してください。', type: NotificationType.WARNING });
      return;
    }
    // Simulate restore process
    setNotification({ message: `設定がファイル「${selectedBackupFile.name}」から復元されました。（シミュレーション）`, type: NotificationType.SUCCESS });
    await addAuditLog({
      userId: user.id,
      username: user.username,
      action: '設定復元実行',
      details: `設定がバックアップファイル「${selectedBackupFile.name}」から復元されました。`
    });
    setSelectedBackupFile(null); // Reset file input
    fetchRecentSettingsLogs();
  };
  
  // Filter sections based on user role
  const visibleSettingSections = SETTING_SECTIONS.filter(section => 
    !section.adminOnly || (section.adminOnly && user?.role === UserRole.ADMIN)
  );


  if (!user) return <p>設定を表示するにはログインしてください。</p>;

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <h2 className="text-3xl font-semibold text-slate-800">システム設定</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleSettingSections.map((section) => (
          <Card key={section.id} title={section.title} className="flex flex-col">
            <p className="text-sm text-slate-600 mb-4 flex-grow">{section.description}</p>
            <Button 
              onClick={() => handleOpenSettingsModal(section)}
              variant="secondary"
              size="sm"
              className="mt-auto w-full"
              disabled={section.adminOnly && user.role !== UserRole.ADMIN}
            >
              設定変更
            </Button>
          </Card>
        ))}
      </div>

      {user.role === UserRole.ADMIN && (
        <>
          <Card title="最近の設定変更履歴">
            {recentSettingsLogs.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {recentSettingsLogs.map(log => (
                  <li key={log.id} className="p-2 bg-slate-50 rounded">
                    <span className="font-semibold">{new Date(log.timestamp).toLocaleString()}</span> - {log.username}: {log.action} ({log.details.substring(0, 50)}{log.details.length > 50 ? '...' : ''})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">最近の設定変更履歴はありません。</p>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="設定バックアップ">
              <p className="text-sm text-slate-600 mb-3">現在のシステム設定をファイルにバックアップします。（シミュレーション）</p>
              <Button onClick={handleBackupSettings} variant="primary">現在の設定をバックアップ</Button>
            </Card>

            <Card title="設定復元">
              <p className="text-sm text-slate-600 mb-3">保存されたバックアップファイルから設定を復元します。復元すると現在の設定は上書きされます。</p>
              <div 
                className={`p-6 border-2 border-dashed rounded-md text-center cursor-pointer
                            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('backupFileRestoreInput')?.click()}
              >
                <Input 
                    type="file" 
                    id="backupFileRestoreInput" 
                    className="hidden" 
                    onChange={handleFileSelect} 
                    accept=".json,.bak" // Example accept types
                />
                {selectedBackupFile ? (
                  <p className="text-sm text-slate-700">選択中のファイル: {selectedBackupFile.name}</p>
                ) : (
                  <p className="text-sm text-slate-500">バックアップファイルをドラッグ＆ドロップ<br/>またはクリックしてファイルを選択</p>
                )}
              </div>
              <Button
                  onClick={handleRestoreSettings}
                  variant="primary"
                  className="mt-3 w-full"
                  disabled={!selectedBackupFile}
              >
                {selectedBackupFile
                  ? `設定復元 (「${selectedBackupFile.name}」から)`
                  : '設定復元 (ファイルを選択してください)'}
              </Button>
            </Card>
          </div>
        </>
      )}

      <Card title="アカウント操作">
        <Button onClick={logout} variant="danger">ログアウト</Button>
      </Card>

      {isSettingsModalOpen && currentSettingsSection && (
        <Modal 
            isOpen={isSettingsModalOpen} 
            onClose={handleCloseSettingsModal} 
            title={`「${currentSettingsSection.title}」の設定`}
            size="lg"
        >
          <div className="space-y-4 my-4">
            <p className="text-sm text-slate-700">
              ここに「<span className="font-semibold">{currentSettingsSection.title}</span>」の詳細な設定フォームが表示されます。
              実際の入力フィールドやオプションは、各設定項目に応じて実装されます。
            </p>
            {/* Example placeholder for content */}
            <div className="p-4 bg-slate-100 rounded">
                <h4 className="font-semibold text-slate-600">利用可能な設定項目（例）:</h4>
                <ul className="list-disc list-inside text-xs text-slate-500 mt-1">
                    <li>設定項目 A</li>
                    <li>設定項目 B (トグルスイッチ)</li>
                    <li>設定項目 C (ドロップダウン選択)</li>
                </ul>
            </div>
            <p className="mt-2 text-xs text-slate-500">（現時点では、UIと基本的な動作のプレースホルダーです）</p>
          </div>
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={handleCloseSettingsModal}>キャンセル</Button>
            <Button type="button" variant="primary" onClick={handleSimulatedSettingChange}>
              保存 (シミュレーション)
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SettingsPage;
