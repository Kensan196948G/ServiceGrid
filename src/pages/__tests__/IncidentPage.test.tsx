import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import IncidentPage from '../IncidentPage';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, ItemStatus } from '../../types';
import * as incidentApiService from '../../services/incidentApiService';
import * as testApiConnection from '../../services/testApiConnection';

// AuthContext のモック
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// API サービスのモック
jest.mock('../../services/incidentApiService');
jest.mock('../../services/testApiConnection');

const mockIncidents = [
  {
    id: 'inc-1',
    title: 'テストインシデント1',
    description: 'テスト説明1',
    status: ItemStatus.OPEN,
    priority: 'High',
    category: 'ハードウェア',
    reportedBy: 'user1',
    assignedTo: 'admin1',
    createdAt: '2023-12-15T10:00:00Z',
    updatedAt: '2023-12-15T10:00:00Z'
  },
  {
    id: 'inc-2',
    title: 'テストインシデント2',
    description: 'テスト説明2',
    status: ItemStatus.IN_PROGRESS,
    priority: 'Medium',
    category: 'ソフトウェア',
    reportedBy: 'user2',
    assignedTo: 'admin2',
    createdAt: '2023-12-14T09:00:00Z',
    updatedAt: '2023-12-14T09:00:00Z'
  },
  {
    id: 'inc-3',
    title: 'テストインシデント3',
    description: 'テスト説明3',
    status: ItemStatus.RESOLVED,
    priority: 'Low',
    category: 'ネットワーク',
    reportedBy: 'user3',
    assignedTo: 'admin1',
    createdAt: '2023-12-13T08:00:00Z',
    updatedAt: '2023-12-13T08:00:00Z'
  }
];

describe('IncidentPage', () => {
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // デフォルトの認証状態
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'admin',
        role: UserRole.ADMIN,
        displayName: '管理者',
        email: 'admin@example.com'
      },
      token: 'mock-token',
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true
    });

    // API モックの設定
    (testApiConnection.testApiConnection as jest.Mock).mockResolvedValue(true);
    (testApiConnection.testIncidentsApi as jest.Mock).mockResolvedValue({ success: true });
    (incidentApiService.getIncidents as jest.Mock).mockResolvedValue({
      incidents: mockIncidents,
      pagination: { page: 1, limit: 10, total: 3, totalPages: 1 }
    });
    (incidentApiService.createIncident as jest.Mock).mockResolvedValue({
      id: 'inc-new',
      title: '新しいインシデント',
      description: '新しい説明',
      status: ItemStatus.NEW,
      priority: 'Medium',
      category: 'その他',
      reportedBy: 'admin',
      createdAt: '2023-12-16T10:00:00Z',
      updatedAt: '2023-12-16T10:00:00Z'
    });
    (incidentApiService.updateIncident as jest.Mock).mockResolvedValue({
      ...mockIncidents[0],
      title: '更新されたインシデント'
    });
    (incidentApiService.deleteIncident as jest.Mock).mockResolvedValue(undefined);
    (incidentApiService.getErrorMessage as jest.Mock).mockReturnValue('エラーメッセージ');
  });

  it('インシデント管理ページが正常にレンダリングされる', async () => {
    render(<IncidentPage />);
    
    // ページタイトルが表示される
    expect(screen.getByText('インシデント管理')).toBeInTheDocument();
    
    // 作成ボタンが表示される
    expect(screen.getByText('インシデント作成')).toBeInTheDocument();
    
    // データがロードされた後の状態を確認
    await waitFor(() => {
      expect(screen.getByText('テストインシデント1')).toBeInTheDocument();
      expect(screen.getByText('テストインシデント2')).toBeInTheDocument();
      expect(screen.getByText('テストインシデント3')).toBeInTheDocument();
    });
  });

  it('インシデント一覧が正しく表示される', async () => {
    render(<IncidentPage />);
    
    await waitFor(() => {
      // テーブルヘッダーが表示される
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('タイトル')).toBeInTheDocument();
      expect(screen.getByText('ステータス')).toBeInTheDocument();
      expect(screen.getByText('優先度')).toBeInTheDocument();
      expect(screen.getByText('カテゴリ')).toBeInTheDocument();
      expect(screen.getByText('報告者')).toBeInTheDocument();
      expect(screen.getByText('作成日時')).toBeInTheDocument();
      expect(screen.getByText('操作')).toBeInTheDocument();
      
      // インシデントデータが表示される
      expect(screen.getByText('テストインシデント1')).toBeInTheDocument();
      expect(screen.getByText('ハードウェア')).toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
    });
  });

  it('フィルター機能が正常に動作する', async () => {
    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('テストインシデント1')).toBeInTheDocument();
    });
    
    // ステータスフィルター
    const statusFilter = screen.getByLabelText('ステータス');
    fireEvent.change(statusFilter, { target: { value: ItemStatus.OPEN } });
    
    // 優先度フィルター
    const priorityFilter = screen.getByLabelText('優先度');
    fireEvent.change(priorityFilter, { target: { value: 'High' } });
    
    // 担当者フィルター
    const assignedToFilter = screen.getByLabelText('担当者');
    fireEvent.change(assignedToFilter, { target: { value: 'admin1' } });
    
    // 作成日フィルター
    const dateFilter = screen.getByLabelText('作成日');
    fireEvent.change(dateFilter, { target: { value: '2023-12-15' } });
    
    // フィルタークリアボタン
    const clearButton = screen.getByText('フィルタークリア');
    fireEvent.click(clearButton);
  });

  it('新規インシデント作成モーダルが正常に動作する', async () => {
    const user = userEvent.setup();
    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('インシデント作成')).toBeInTheDocument();
    });
    
    // 作成ボタンをクリック
    await user.click(screen.getByText('インシデント作成'));
    
    // モーダルが表示される
    await waitFor(() => {
      expect(screen.getByText('新規インシデント作成')).toBeInTheDocument();
    });
    
    // フォーム入力
    const titleInput = screen.getByLabelText('タイトル');
    const descriptionInput = screen.getByLabelText('説明');
    const prioritySelect = screen.getByLabelText('優先度');
    const categorySelect = screen.getByLabelText('カテゴリ');
    
    await user.type(titleInput, '新しいテストインシデント');
    await user.type(descriptionInput, '新しいテスト説明');
    await user.selectOptions(prioritySelect, 'High');
    await user.selectOptions(categorySelect, 'ソフトウェア');
    
    // 保存ボタンをクリック
    const saveButton = screen.getByText('インシデント保存');
    await user.click(saveButton);
    
    // APIが呼び出されることを確認
    await waitFor(() => {
      expect(incidentApiService.createIncident).toHaveBeenCalledWith({
        title: '新しいテストインシデント',
        description: '新しいテスト説明',
        priority: 'High',
        status: ItemStatus.NEW,
        category: 'ソフトウェア',
        reportedBy: 'admin'
      });
    });
  });

  it('インシデント編集が正常に動作する', async () => {
    const user = userEvent.setup();
    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('テストインシデント1')).toBeInTheDocument();
    });
    
    // 編集ボタンをクリック
    const editButtons = screen.getAllByText('編集');
    await user.click(editButtons[0]);
    
    // モーダルが表示される
    await waitFor(() => {
      expect(screen.getByText('インシデント編集')).toBeInTheDocument();
    });
    
    // タイトルを編集
    const titleInput = screen.getByDisplayValue('テストインシデント1');
    await user.clear(titleInput);
    await user.type(titleInput, '編集されたインシデント');
    
    // 保存ボタンをクリック
    const saveButton = screen.getByText('インシデント保存');
    await user.click(saveButton);
    
    // APIが呼び出されることを確認
    await waitFor(() => {
      expect(incidentApiService.updateIncident).toHaveBeenCalled();
    });
  });

  it('インシデント削除が正常に動作する', async () => {
    const user = userEvent.setup();
    
    // window.confirmをモック
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('テストインシデント1')).toBeInTheDocument();
    });
    
    // 削除ボタンをクリック（管理者のみ表示）
    const deleteButtons = screen.getAllByText('削除');
    await user.click(deleteButtons[0]);
    
    // 確認ダイアログが表示されることを確認
    expect(confirmSpy).toHaveBeenCalledWith('このインシデントを削除してもよろしいですか？');
    
    // APIが呼び出されることを確認
    await waitFor(() => {
      expect(incidentApiService.deleteIncident).toHaveBeenCalledWith('inc-1');
    });
    
    confirmSpy.mockRestore();
  });

  it('一般ユーザーには削除ボタンが表示されない', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 2,
        username: 'user',
        role: UserRole.USER,
        displayName: 'ユーザー',
        email: 'user@example.com'
      },
      token: 'mock-token',
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true
    });

    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('テストインシデント1')).toBeInTheDocument();
    });
    
    // 削除ボタンが表示されないことを確認
    expect(screen.queryByText('削除')).not.toBeInTheDocument();
  });

  it('ページネーション機能が正常に動作する', async () => {
    const user = userEvent.setup();
    
    // より多くのデータでページネーションをテスト
    (incidentApiService.getIncidents as jest.Mock).mockResolvedValue({
      incidents: mockIncidents,
      pagination: { page: 1, limit: 2, total: 3, totalPages: 2 }
    });

    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('ページ 1 / 2')).toBeInTheDocument();
    });
    
    // 次のページに移動
    const nextButton = screen.getByText('次へ');
    await user.click(nextButton);
    
    // 前のページに移動
    const prevButton = screen.getByText('前へ');
    await user.click(prevButton);
    
    // ページサイズ変更
    const pageSizeSelect = screen.getByDisplayValue('10');
    await user.selectOptions(pageSizeSelect, '25');
  });

  it('APIエラー時にエラーメッセージが表示される', async () => {
    (testApiConnection.testApiConnection as jest.Mock).mockRejectedValue(new Error('API接続エラー'));

    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/インシデントの読み込みに失敗しました/)).toBeInTheDocument();
    });
  });

  it('データがない場合の表示', async () => {
    (incidentApiService.getIncidents as jest.Mock).mockResolvedValue({
      incidents: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('条件に一致するインシデントはありません。')).toBeInTheDocument();
    });
  });

  it('モーダルのキャンセルボタンが正常に動作する', async () => {
    const user = userEvent.setup();
    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('インシデント作成')).toBeInTheDocument();
    });
    
    // 作成ボタンをクリック
    await user.click(screen.getByText('インシデント作成'));
    
    // モーダルが表示される
    await waitFor(() => {
      expect(screen.getByText('新規インシデント作成')).toBeInTheDocument();
    });
    
    // キャンセルボタンをクリック
    const cancelButton = screen.getByText('キャンセル');
    await user.click(cancelButton);
    
    // モーダルが閉じることを確認
    await waitFor(() => {
      expect(screen.queryByText('新規インシデント作成')).not.toBeInTheDocument();
    });
  });

  it('インシデント行クリックで編集モーダルが開く', async () => {
    const user = userEvent.setup();
    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('テストインシデント1')).toBeInTheDocument();
    });
    
    // インシデント行をクリック
    const incidentRow = screen.getByText('テストインシデント1').closest('tr');
    if (incidentRow) {
      await user.click(incidentRow);
    }
    
    // 編集モーダルが開くことを確認
    await waitFor(() => {
      expect(screen.getByText('インシデント編集')).toBeInTheDocument();
    });
  });

  it('ステータス別の色分け表示が正しく機能する', async () => {
    render(<IncidentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('テストインシデント1')).toBeInTheDocument();
    });
    
    // ステータス表示を確認（CSS クラスの確認）
    const openStatus = screen.getByText('開放');
    const inProgressStatus = screen.getByText('処理中');
    const resolvedStatus = screen.getByText('解決済');
    
    expect(openStatus).toHaveClass('bg-yellow-100', 'text-yellow-800');
    expect(inProgressStatus).toHaveClass('bg-blue-100', 'text-blue-800');
    expect(resolvedStatus).toHaveClass('bg-green-100', 'text-green-800');
  });
});