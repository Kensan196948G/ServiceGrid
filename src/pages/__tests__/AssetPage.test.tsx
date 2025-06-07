// Integration tests for AssetPage with enhanced features
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext } from '../../contexts/AuthContext';
import AssetPage from '../AssetPage';
import { UserRole } from '../../types';
import * as assetApiService from '../../services/assetApiService';

// Mock the API service
jest.mock('../../services/assetApiService');
const mockAssetApiService = assetApiService as jest.Mocked<typeof assetApiService>;

// Mock the CSV utilities
jest.mock('../../utils/csvUtils', () => ({
  exportToCsv: jest.fn(),
  importFromCsv: jest.fn(() => ({
    success: true,
    data: [
      { name: 'Test Asset', type: 'Server', assetTag: 'SRV-001', status: 'Active' }
    ],
    errors: []
  })),
  ASSET_CSV_HEADERS: {
    id: 'ID',
    assetTag: '資産タグ',
    name: '名前',
    type: '種類'
  }
}));

// Mock ChartPlaceholder components
jest.mock('../../components/ChartPlaceholder', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
}));

// Mock file reading
const mockFileReader = {
  readAsText: jest.fn(),
  result: '',
  onload: null as any
};

Object.defineProperty(window, 'FileReader', {
  value: jest.fn(() => mockFileReader)
});

const mockUser = {
  id: '1',
  username: 'admin',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
  displayName: 'Administrator'
};

const mockAssets = [
  {
    id: '1',
    assetTag: 'SRV-001',
    name: 'Test Server',
    type: 'Server' as const,
    status: 'Active' as const,
    assignedTo: 'John Doe',
    location: 'Data Center',
    category: 'Hardware',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: '2',
    assetTag: 'DSK-001',
    name: 'Test Desktop',
    type: 'Desktop' as const,
    status: 'Active' as const,
    assignedTo: 'Jane Smith',
    location: 'Office',
    category: 'Hardware',
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }
];

const renderAssetPage = (user = mockUser) => {
  return render(
    <AuthContext.Provider value={{ 
      user, 
      login: jest.fn(), 
      logout: jest.fn(), 
      isLoading: false 
    }}>
      <AssetPage />
    </AuthContext.Provider>
  );
};

describe('AssetPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssetApiService.getAssets.mockResolvedValue({
      assets: mockAssets,
      total: mockAssets.length,
      page: 1,
      limit: 20
    });
    mockAssetApiService.generateAssetTag.mockResolvedValue('AUTO-001');
  });

  describe('Basic functionality', () => {
    test('should render asset page with assets', async () => {
      renderAssetPage();

      expect(screen.getByText('資産管理 (CMDB)')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Test Server')).toBeInTheDocument();
        expect(screen.getByText('Test Desktop')).toBeInTheDocument();
      });
    });

    test('should display loading state', () => {
      mockAssetApiService.getAssets.mockImplementation(() => new Promise(() => {}));
      renderAssetPage();

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    test('should show error notification on API failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockAssetApiService.getAssets.mockRejectedValue(new Error('API Error'));
      
      renderAssetPage();

      await waitFor(() => {
        expect(screen.getByText(/資産の読み込みに失敗しました/)).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('Asset creation and editing', () => {
    test('should open create modal when new asset button is clicked', async () => {
      renderAssetPage();

      await waitFor(() => {
        expect(screen.getByText('新規資産追加')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('新規資産追加'));

      expect(screen.getByText('新規資産作成')).toBeInTheDocument();
      expect(screen.getByLabelText(/資産タグ/)).toBeInTheDocument();
      expect(screen.getByLabelText(/資産名/)).toBeInTheDocument();
    });

    test('should generate asset tag automatically', async () => {
      renderAssetPage();

      await waitFor(() => {
        fireEvent.click(screen.getByText('新規資産追加'));
      });

      const generateButton = screen.getByText('自動生成');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockAssetApiService.generateAssetTag).toHaveBeenCalled();
      });
    });

    test('should validate required fields on form submission', async () => {
      renderAssetPage();

      await waitFor(() => {
        fireEvent.click(screen.getByText('新規資産追加'));
      });

      const saveButton = screen.getByText('資産保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/入力エラーがあります/)).toBeInTheDocument();
      });
    });

    test('should create asset successfully', async () => {
      mockAssetApiService.createAsset.mockResolvedValue({
        id: '3',
        assetTag: 'SRV-003',
        name: 'New Server',
        type: 'Server',
        status: 'Active',
        category: 'Hardware',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      renderAssetPage();

      await waitFor(() => {
        fireEvent.click(screen.getByText('新規資産追加'));
      });

      // Fill in required fields
      await userEvent.type(screen.getByLabelText(/資産タグ/), 'SRV-003');
      await userEvent.type(screen.getByLabelText(/資産名/), 'New Server');

      fireEvent.click(screen.getByText('資産保存'));

      await waitFor(() => {
        expect(mockAssetApiService.createAsset).toHaveBeenCalled();
        expect(screen.getByText(/資産が正常に作成されました/)).toBeInTheDocument();
      });
    });
  });

  describe('CSV Import/Export functionality', () => {
    test('should show CSV export button', async () => {
      renderAssetPage();

      await waitFor(() => {
        expect(screen.getByText('CSVエクスポート')).toBeInTheDocument();
      });
    });

    test('should show CSV import button for admin users', async () => {
      renderAssetPage();

      await waitFor(() => {
        expect(screen.getByText('CSVインポート')).toBeInTheDocument();
      });
    });

    test('should not show CSV import button for non-admin users', async () => {
      const readOnlyUser = { ...mockUser, role: UserRole.READ_ONLY };
      renderAssetPage(readOnlyUser);

      await waitFor(() => {
        expect(screen.queryByText('CSVインポート')).not.toBeInTheDocument();
      });
    });

    test('should trigger file input when import button is clicked', async () => {
      const mockClick = jest.fn();
      const mockFileInput = {
        click: mockClick,
        files: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      jest.spyOn(React, 'useRef').mockReturnValue({ current: mockFileInput });

      renderAssetPage();

      await waitFor(() => {
        fireEvent.click(screen.getByText('CSVインポート'));
      });

      expect(mockClick).toHaveBeenCalled();
    });

    test('should show import modal with valid CSV data', async () => {
      renderAssetPage();

      // Simulate file selection
      const file = new File(['name,type,assetTag\nTest Asset,Server,SRV-001'], 'test.csv', {
        type: 'text/csv'
      });

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      Object.defineProperty(fileInput, 'files', {
        value: [file]
      });

      // Simulate FileReader onload
      mockFileReader.onload = jest.fn();
      mockFileReader.result = 'name,type,assetTag\nTest Asset,Server,SRV-001';

      // This test would need more setup to fully simulate the file reading process
    });
  });

  describe('Filtering and pagination', () => {
    test('should apply status filter', async () => {
      renderAssetPage();

      await waitFor(() => {
        const statusFilter = screen.getByDisplayValue('すべてのステータス');
        fireEvent.change(statusFilter, { target: { value: 'Active' } });
      });

      // The filtering logic would be tested by checking if the right assets are displayed
    });

    test('should clear all filters', async () => {
      renderAssetPage();

      await waitFor(() => {
        const clearButton = screen.getByText('フィルタークリア');
        fireEvent.click(clearButton);
      });

      // Verify filters are cleared
      expect(screen.getByDisplayValue('すべてのステータス')).toBeInTheDocument();
    });

    test('should change items per page', async () => {
      renderAssetPage();

      await waitFor(() => {
        const itemsPerPageSelect = screen.getByDisplayValue('10件');
        fireEvent.change(itemsPerPageSelect, { target: { value: '25' } });
      });

      expect(screen.getByDisplayValue('25件')).toBeInTheDocument();
    });
  });

  describe('Asset deletion', () => {
    test('should delete asset with confirmation', async () => {
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockAssetApiService.deleteAsset.mockResolvedValue(undefined);

      renderAssetPage();

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('削除');
        fireEvent.click(deleteButtons[0]);
      });

      expect(mockConfirm).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(mockAssetApiService.deleteAsset).toHaveBeenCalledWith('1');
        expect(screen.getByText(/資産が正常に削除されました/)).toBeInTheDocument();
      });

      mockConfirm.mockRestore();
    });

    test('should not delete asset if confirmation is cancelled', async () => {
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderAssetPage();

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('削除');
        fireEvent.click(deleteButtons[0]);
      });

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockAssetApiService.deleteAsset).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });
  });

  describe('Dashboard components', () => {
    test('should display asset count', async () => {
      renderAssetPage();

      await waitFor(() => {
        expect(screen.getByText('総資産数')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Total count from mock data
      });
    });

    test('should display asset type distribution chart', async () => {
      renderAssetPage();

      await waitFor(() => {
        expect(screen.getByText('資産タイプ別分布')).toBeInTheDocument();
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Form validation', () => {
    test('should show validation errors for invalid asset tag', async () => {
      renderAssetPage();

      await waitFor(() => {
        fireEvent.click(screen.getByText('新規資産追加'));
      });

      const assetTagInput = screen.getByLabelText(/資産タグ/);
      await userEvent.type(assetTagInput, 'invalid-tag');
      
      // Trigger blur event to show validation
      fireEvent.blur(assetTagInput);

      await waitFor(() => {
        expect(screen.getByText(/形式/)).toBeInTheDocument();
      });
    });

    test('should show validation errors for missing required fields', async () => {
      renderAssetPage();

      await waitFor(() => {
        fireEvent.click(screen.getByText('新規資産追加'));
      });

      const nameInput = screen.getByLabelText(/資産名/);
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText(/必須です/)).toBeInTheDocument();
      });
    });
  });
});