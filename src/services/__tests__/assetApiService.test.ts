import { AssetApiService } from '../assetApiService';
import { AssetType, AssetStatus } from '../../types/asset';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AssetApiService', () => {
  const mockAsset = {
    asset_id: 1,
    asset_tag: 'SRV-001',
    name: 'Test Server',
    category: 'Hardware',
    type: AssetType.SERVER,
    status: AssetStatus.ACTIVE,
    serial_number: 'SN123456',
    manufacturer: 'Test Manufacturer',
    model: 'Test Model',
    location: 'Datacenter A',
    assigned_to: 'John Doe',
    purchase_date: '2023-01-01',
    warranty_end_date: '2026-01-01',
    purchase_cost: 5000,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('getAssets', () => {
    test('should fetch assets successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockAsset],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await AssetApiService.getAssets();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/assets'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    test('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      } as Response);

      await expect(AssetApiService.getAssets()).rejects.toThrow();
    });

    test('should apply filters correctly', async () => {
      const filters = {
        type: AssetType.SERVER,
        status: AssetStatus.ACTIVE,
        search: 'test'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0 }),
      } as Response);

      await AssetApiService.getAssets(1, 10, filters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('type=Server&status=Active&search=test'),
        expect.any(Object)
      );
    });
  });

  describe('getAsset', () => {
    test('should fetch single asset by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAsset }),
      } as Response);

      const result = await AssetApiService.getAsset(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/assets/1'),
        expect.objectContaining({ method: 'GET' })
      );

      expect(result.data).toEqual(mockAsset);
    });
  });

  describe('createAsset', () => {
    test('should create new asset', async () => {
      const newAssetData = {
        name: 'New Server',
        type: AssetType.SERVER,
        status: AssetStatus.ACTIVE,
        serial_number: 'SN789',
        manufacturer: 'Test Manufacturer',
        model: 'New Model',
        location: 'Datacenter B',
        assigned_to: 'Jane Doe'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { ...mockAsset, ...newAssetData, asset_id: 2 },
          message: 'Asset created successfully'
        }),
      } as Response);

      const result = await AssetApiService.createAsset(newAssetData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/assets'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(newAssetData),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(newAssetData.name);
    });
  });

  describe('updateAsset', () => {
    test('should update existing asset', async () => {
      const updateData = {
        name: 'Updated Server Name',
        location: 'Updated Location'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { ...mockAsset, ...updateData },
          message: 'Asset updated successfully'
        }),
      } as Response);

      const result = await AssetApiService.updateAsset(1, updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/assets/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(updateData.name);
    });
  });

  describe('deleteAsset', () => {
    test('should delete asset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          message: 'Asset deleted successfully'
        }),
      } as Response);

      const result = await AssetApiService.deleteAsset(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/assets/1'),
        expect.objectContaining({ method: 'DELETE' })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getAssetStats', () => {
    test('should fetch asset statistics', async () => {
      const mockStats = {
        total: 100,
        by_status: {
          Active: 80,
          Inactive: 15,
          Maintenance: 5
        },
        by_type: {
          Server: 30,
          Desktop: 40,
          Laptop: 30
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStats }),
      } as Response);

      const result = await AssetApiService.getAssetStats();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/assets/stats'),
        expect.objectContaining({ method: 'GET' })
      );

      expect(result.data).toEqual(mockStats);
    });
  });

  describe('generateAssetTag', () => {
    test('should generate asset tag for given type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { tag: 'SRV-002' }
        }),
      } as Response);

      const result = await AssetApiService.generateAssetTag(AssetType.SERVER);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/assets/generate-tag?type=Server'),
        expect.objectContaining({ method: 'GET' })
      );

      expect(result.data.tag).toBe('SRV-002');
    });
  });

  describe('error handling', () => {
    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(AssetApiService.getAssets()).rejects.toThrow('Network error');
    });

    test('should handle non-JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); },
        text: async () => 'Internal Server Error',
      } as Response);

      await expect(AssetApiService.getAssets()).rejects.toThrow();
    });
  });
});