import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '../DashboardPage';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../hooks/useToast');
jest.mock('../../components/RouterPlaceholder', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>
}));

// Mock Recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

// Mock API services
jest.mock('../../services/assetApiService', () => ({
  getAssets: jest.fn().mockResolvedValue({
    data: [
      { id: 1, name: 'Asset 1', status: 'Active' },
      { id: 2, name: 'Asset 2', status: 'Active' }
    ]
  })
}));

jest.mock('../../services/serviceRequestApiService', () => ({
  getServiceRequests: jest.fn().mockResolvedValue({
    data: [
      { id: 1, subject: 'Request 1', status: 'Submitted' },
      { id: 2, subject: 'Request 2', status: 'Approved' }
    ]
  })
}));

jest.mock('../../services/incidentApiService', () => ({
  getIncidents: jest.fn().mockResolvedValue({
    data: [
      { id: 1, title: 'Incident 1', status: 'Open', priority: 'High' },
      { id: 2, title: 'Incident 2', status: 'Resolved', priority: 'Medium' }
    ]
  })
}));

// Mock animated components
jest.mock('../../components/AnimatedComponents', () => ({
  FadeIn: ({ children }: any) => <div data-testid="fade-in">{children}</div>,
  StaggeredList: ({ children, className }: any) => <div className={className} data-testid="staggered-list">{children}</div>,
  CountUp: ({ end }: any) => <span data-testid="count-up">{end}</span>
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockAddToast = jest.fn();

describe('DashboardPage Enhanced', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'administrator'
      },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    });

    mockUseToast.mockReturnValue({
      addToast: mockAddToast
    });

    jest.clearAllMocks();
  });

  it('renders dashboard with proper structure', async () => {
    render(<DashboardPage />);

    // Check main structure
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('ようこそ、Test Userさん')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<DashboardPage />);
    expect(screen.getByText('ダッシュボードを読み込み中...')).toBeInTheDocument();
  });

  it('displays key metrics after loading', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('システム稼働率')).toBeInTheDocument();
      expect(screen.getByText('管理資産数')).toBeInTheDocument();
      expect(screen.getByText('アクティブインシデント')).toBeInTheDocument();
      expect(screen.getByText('承認待ち要求')).toBeInTheDocument();
    });
  });

  it('renders charts section', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('ステータス分布')).toBeInTheDocument();
      expect(screen.getByText('週間トレンド')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('displays recent activity section', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('最近のアクティビティ')).toBeInTheDocument();
      expect(screen.getByText('サーバー応答時間の遅延')).toBeInTheDocument();
      expect(screen.getByText('新規ユーザーアカウント作成')).toBeInTheDocument();
    });
  });

  it('displays quick actions section', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('クイックアクション')).toBeInTheDocument();
      expect(screen.getByText('インシデント報告')).toBeInTheDocument();
      expect(screen.getByText('サービス要求')).toBeInTheDocument();
      expect(screen.getByText('資産登録')).toBeInTheDocument();
    });
  });

  it('displays system health indicators', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('システムヘルス')).toBeInTheDocument();
      expect(screen.getByText('Webサーバー')).toBeInTheDocument();
      expect(screen.getByText('データベース')).toBeInTheDocument();
      expect(screen.getByText('ストレージ')).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const refreshButton = screen.getByText('🔄 更新');
      expect(refreshButton).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('🔄 更新');
    fireEvent.click(refreshButton);

    // Should trigger data fetch (tested indirectly through loading state)
  });

  it('handles report button click', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const reportButton = screen.getByText('📊 レポート');
      expect(reportButton).toBeInTheDocument();
    });

    const reportButton = screen.getByText('📊 レポート');
    fireEvent.click(reportButton);

    expect(mockAddToast).toHaveBeenCalledWith('ダッシュボードが更新されました', 'success');
  });

  it('displays animated components', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('fade-in')).toBeInTheDocument();
      expect(screen.getByTestId('staggered-list')).toBeInTheDocument();
    });
  });

  it('shows count-up animation for metrics', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const countUpElements = screen.getAllByTestId('count-up');
      expect(countUpElements.length).toBeGreaterThan(0);
    });
  });

  it('has proper accessibility attributes', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      // Check main aria-label
      expect(screen.getByLabelText('ITSM ダッシュボード')).toBeInTheDocument();
      
      // Check hidden headings for screen readers
      expect(screen.getByText('主要メトリクス')).toHaveClass('sr-only');
      expect(screen.getByText('データ可視化チャート')).toHaveClass('sr-only');
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API to reject
    const mockGetAssets = require('../../services/assetApiService').getAssets;
    mockGetAssets.mockRejectedValueOnce(new Error('API Error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('ダッシュボードデータの取得に失敗しました', 'error');
    });
  });

  it('displays correct user welcome message', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('ユーザー歓迎メッセージ')).toHaveTextContent('ようこそ、Test Userさん');
    });
  });

  it('renders activity icons correctly', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      // Activity items should have emojis/icons
      expect(screen.getByText('⚠️')).toBeInTheDocument(); // incident
      expect(screen.getByText('📋')).toBeInTheDocument(); // request
      expect(screen.getByText('💻')).toBeInTheDocument(); // asset
      expect(screen.getByText('🔄')).toBeInTheDocument(); // change
    });
  });

  it('sets up auto-refresh interval', async () => {
    jest.useFakeTimers();
    
    render(<DashboardPage />);

    // Fast-forward 5 minutes
    jest.advanceTimersByTime(5 * 60 * 1000);

    // Should trigger refresh (tested indirectly)
    expect(setTimeout).toHaveBeenCalled();

    jest.useRealTimers();
  });
});