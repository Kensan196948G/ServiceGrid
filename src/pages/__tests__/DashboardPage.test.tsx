import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '../DashboardPage';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import * as mockItsmService from '../../services/mockItsmService';
import * as assetApiService from '../../services/assetApiService';

// Recharts のモック
jest.mock('../../components/ChartPlaceholder', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}));

// RouterPlaceholder のモック
const mockNavigate = jest.fn();
jest.mock('../../components/RouterPlaceholder', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate
}));

// AuthContext のモック
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// API サービスのモック
jest.mock('../../services/mockItsmService');
jest.mock('../../services/assetApiService');

const mockIncidents = [
  {
    id: 'inc-1',
    title: 'テストインシデント1',
    description: 'テスト説明1',
    status: 'Open',
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
    status: 'In Progress',
    priority: 'Medium',
    category: 'ソフトウェア',
    reportedBy: 'user2',
    assignedTo: 'admin2',
    createdAt: '2023-12-14T09:00:00Z',
    updatedAt: '2023-12-14T09:00:00Z'
  }
];

const mockServiceRequests = [
  {
    id: 'sr-1',
    subject: 'テスト要求1',
    detail: 'テスト詳細1',
    status: 'Submitted',
    applicant: 'user1',
    requested_date: '2023-12-15T08:00:00Z',
    approved_by: null,
    approved_date: null
  }
];

const mockAssets = [
  {
    asset_id: 1,
    asset_tag: 'SRV-001',
    name: 'テストサーバー1',
    category: 'Hardware',
    type: 'Server',
    status: 'Active',
    location: '東京',
    department: 'IT',
    manufacturer: 'Dell',
    model: 'PowerEdge R750'
  },
  {
    asset_id: 2,
    asset_tag: 'DSK-001',
    name: 'テストデスクトップ1',
    category: 'Hardware',
    type: 'Desktop',
    status: 'Active',
    location: '大阪',
    department: 'Sales',
    manufacturer: 'HP',
    model: 'ProDesk 600'
  }
];

const mockServiceStatuses = [
  {
    id: 'svc-1',
    name: 'Webサービス',
    status: 'NORMAL',
    description: '正常稼働中',
    lastChecked: '2023-12-15T10:30:00Z'
  },
  {
    id: 'svc-2',
    name: 'データベース',
    status: 'WARNING',
    description: 'パフォーマンス低下',
    lastChecked: '2023-12-15T10:25:00Z'
  }
];

const mockActiveAlerts = [
  {
    id: 'alert-1',
    message: 'CPUの使用率が高いです',
    severity: 'HIGH',
    timestamp: '2023-12-15T10:00:00Z',
    source: 'Monitoring System',
    acknowledged: false
  },
  {
    id: 'alert-2',
    message: 'ディスク容量が不足しています',
    severity: 'CRITICAL',
    timestamp: '2023-12-15T09:45:00Z',
    source: 'Storage System',
    acknowledged: false
  }
];

describe('DashboardPage', () => {
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
    (mockItsmService.getIncidents as jest.Mock).mockResolvedValue(mockIncidents);
    (mockItsmService.getServiceRequests as jest.Mock).mockResolvedValue(mockServiceRequests);
    (assetApiService.getAssets as jest.Mock).mockResolvedValue(mockAssets);
    (mockItsmService.getSLAs as jest.Mock).mockResolvedValue([]);
    (mockItsmService.getVulnerabilities as jest.Mock).mockResolvedValue([]);
    (mockItsmService.getComplianceControls as jest.Mock).mockResolvedValue([]);
    (mockItsmService.getServiceStatuses as jest.Mock).mockResolvedValue(mockServiceStatuses);
    (mockItsmService.getActiveAlerts as jest.Mock).mockResolvedValue(mockActiveAlerts);
  });

  it('ダッシュボードが正常にレンダリングされる', async () => {
    render(<DashboardPage />);
    
    // ページタイトルが表示される
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    
    // ローディングスピナーが最初に表示される
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    
    // データがロードされた後の状態を確認
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });
  });

  it('オープンインシデント数が正しく表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Open + In Progress
    });
    
    const incidentCard = screen.getByText('オープンインシデント').closest('.cursor-pointer');
    expect(incidentCard).toBeInTheDocument();
  });

  it('オープンサービスリクエスト数が正しく表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Submitted
    });
    
    const requestCard = screen.getByText('オープンサービスリクエスト').closest('.cursor-pointer');
    expect(requestCard).toBeInTheDocument();
  });

  it('管理中資産数が正しく表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // 2つの資産
    });
    
    const assetCard = screen.getByText('管理中資産').closest('.cursor-pointer');
    expect(assetCard).toBeInTheDocument();
  });

  it('詳細ボタンをクリックすると詳細が表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });
    
    // 資産の詳細ボタンをクリック
    const assetDetailButton = screen.getAllByText('詳細')[2]; // 3番目の詳細ボタン（資産）
    fireEvent.click(assetDetailButton);
    
    // 資産一覧が表示される
    await waitFor(() => {
      expect(screen.getByText('資産一覧（最新10件）')).toBeInTheDocument();
      expect(screen.getByText('SRV-001')).toBeInTheDocument();
      expect(screen.getByText('DSK-001')).toBeInTheDocument();
    });
  });

  it('サービスステータスが正しく表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Webサービス')).toBeInTheDocument();
      expect(screen.getByText('データベース')).toBeInTheDocument();
      expect(screen.getByText('正常')).toBeInTheDocument();
      expect(screen.getByText('警告')).toBeInTheDocument();
    });
  });

  it('重要アラートが正しく表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('CPUの使用率が高いです')).toBeInTheDocument();
      expect(screen.getByText('ディスク容量が不足しています')).toBeInTheDocument();
    });
  });

  it('アラート確認ボタンが管理者に表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      const confirmButtons = screen.getAllByText('確認');
      expect(confirmButtons).toHaveLength(2); // 2つのアラートの確認ボタン
    });
  });

  it('一般ユーザーには新規資産登録ボタンが表示されない', async () => {
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

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.queryByText('新規資産登録')).not.toBeInTheDocument();
    });
  });

  it('管理者には新規資産登録ボタンが表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('新規資産登録')).toBeInTheDocument();
    });
  });

  it('クイックアクションが正しく表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('新規インシデント作成')).toBeInTheDocument();
      expect(screen.getByText('新規サービスリクエスト')).toBeInTheDocument();
      expect(screen.getByText('ナレッジベース検索')).toBeInTheDocument();
    });
  });

  it('サービスステータス更新ボタンが動作する', async () => {
    const mockRefresh = jest.fn().mockResolvedValue(mockServiceStatuses);
    (mockItsmService.refreshServiceStatuses as jest.Mock) = mockRefresh;

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const refreshButton = screen.getByText('更新');
    fireEvent.click(refreshButton);
    
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('アラート確認が正常に動作する', async () => {
    const mockAcknowledge = jest.fn().mockResolvedValue(undefined);
    (mockItsmService.acknowledgeAlert as jest.Mock) = mockAcknowledge;

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByText('確認');
    fireEvent.click(confirmButtons[0]);
    
    expect(mockAcknowledge).toHaveBeenCalledWith('alert-1');
  });

  it('APIエラー時にエラーメッセージが表示される', async () => {
    (mockItsmService.getIncidents as jest.Mock).mockRejectedValue(new Error('API エラー'));

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/ダッシュボードデータの読み込みに失敗しました/)).toBeInTheDocument();
    });
  });

  it('最近のインシデントが表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('最近のインシデント')).toBeInTheDocument();
      expect(screen.getByText('テストインシデント1')).toBeInTheDocument();
      expect(screen.getByText('テストインシデント2')).toBeInTheDocument();
    });
  });

  it('ナビゲーション関数が正しく呼び出される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });
    
    // 新規インシデント作成ボタンをクリック
    const createIncidentButton = screen.getByText('新規インシデント作成');
    fireEvent.click(createIncidentButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/incidents', { state: { openModal: true } });
  });

  it('セキュリティ状況が正しく表示される', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('セキュリティ状況')).toBeInTheDocument();
      expect(screen.getByText('良好')).toBeInTheDocument(); // 脆弱性がない場合
    });
  });

  it('データがない場合の表示', async () => {
    (mockItsmService.getIncidents as jest.Mock).mockResolvedValue([]);
    (mockItsmService.getServiceRequests as jest.Mock).mockResolvedValue([]);
    (assetApiService.getAssets as jest.Mock).mockResolvedValue([]);

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // オープンインシデント数
    });
  });
});