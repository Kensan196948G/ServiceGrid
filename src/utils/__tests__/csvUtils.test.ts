// Comprehensive tests for CSV utilities
import { exportToCsv, importFromCsv, ASSET_CSV_HEADERS } from '../csvUtils';

// Mock DOM elements for testing
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild
});

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url')
});

// Mock alert
Object.defineProperty(window, 'alert', {
  value: jest.fn()
});

describe('CSV Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock element
    const mockElement = {
      setAttribute: jest.fn(),
      click: mockClick,
      style: {}
    };
    mockCreateElement.mockReturnValue(mockElement);
  });

  describe('exportToCsv', () => {
    test('should export array of objects to CSV', () => {
      const testData = [
        { id: '1', name: 'Test Asset 1', type: 'Server' },
        { id: '2', name: 'Test Asset 2', type: 'Desktop' }
      ];

      exportToCsv(testData, 'test.csv');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    test('should handle empty data array', () => {
      const testData: any[] = [];

      exportToCsv(testData, 'test.csv');

      expect(window.alert).toHaveBeenCalledWith('エクスポートするデータがありません。');
      expect(mockCreateElement).not.toHaveBeenCalled();
    });

    test('should use custom headers when provided', () => {
      const testData = [
        { id: '1', name: 'Test Asset 1' }
      ];
      const customHeaders = { id: 'ID', name: '名前' };

      exportToCsv(testData, 'test.csv', customHeaders);

      expect(mockCreateElement).toHaveBeenCalled();
    });

    test('should handle values with commas and quotes', () => {
      const testData = [
        { id: '1', description: 'Test, with "quotes" and commas' }
      ];

      exportToCsv(testData, 'test.csv');

      expect(mockCreateElement).toHaveBeenCalled();
    });
  });

  describe('importFromCsv', () => {
    test('should parse valid CSV content', () => {
      const csvContent = `name,type,assetTag,status
Test Asset 1,Server,SRV-001,Active
Test Asset 2,Desktop,DSK-001,Active`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0]).toMatchObject({
        name: 'Test Asset 1',
        type: 'Server',
        assetTag: 'SRV-001',
        status: 'Active'
      });
    });

    test('should handle empty CSV file', () => {
      const csvContent = '';

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('ヘッダー行とデータ行が必要');
    });

    test('should handle CSV with only headers', () => {
      const csvContent = 'name,type,assetTag';

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    test('should validate required fields', () => {
      const csvContent = `name,type,assetTag,status
,Server,SRV-001,Active`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('名前は必須'))).toBe(true);
    });

    test('should validate asset type', () => {
      const csvContent = `name,type,assetTag,status
Test Asset,InvalidType,SRV-001,Active`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('無効な資産種類'))).toBe(true);
    });

    test('should validate asset status', () => {
      const csvContent = `name,type,assetTag,status
Test Asset,Server,SRV-001,InvalidStatus`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('無効なステータス'))).toBe(true);
    });

    test('should validate cost field', () => {
      const csvContent = `name,type,assetTag,cost
Test Asset,Server,SRV-001,invalid-cost`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('0以上の数値'))).toBe(true);
    });

    test('should validate date fields', () => {
      const csvContent = `name,type,assetTag,purchaseDate
Test Asset,Server,SRV-001,invalid-date`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('日付形式'))).toBe(true);
    });

    test('should handle quoted CSV values', () => {
      const csvContent = `name,type,assetTag,description
"Test Asset, with comma",Server,SRV-001,"Description with ""quotes"""`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(true);
      expect(result.data[0].name).toBe('Test Asset, with comma');
      expect(result.data[0].description).toBe('Description with "quotes"');
    });

    test('should handle missing required fields in headers', () => {
      const csvContent = `description,status
Test description,Active`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('必須フィールドが不足'))).toBe(true);
    });

    test('should handle mismatched column count', () => {
      const csvContent = `name,type,assetTag
Test Asset,Server`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('列数が一致しません'))).toBe(true);
    });

    test('should handle unknown fields', () => {
      const csvContent = `name,type,assetTag,unknownField
Test Asset,Server,SRV-001,unknown-value`;

      const result = importFromCsv(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('不明なフィールド'))).toBe(true);
    });
  });

  describe('ASSET_CSV_HEADERS', () => {
    test('should contain all expected header mappings', () => {
      expect(ASSET_CSV_HEADERS).toHaveProperty('id');
      expect(ASSET_CSV_HEADERS).toHaveProperty('assetTag');
      expect(ASSET_CSV_HEADERS).toHaveProperty('name');
      expect(ASSET_CSV_HEADERS).toHaveProperty('type');
      expect(ASSET_CSV_HEADERS).toHaveProperty('status');
      expect(ASSET_CSV_HEADERS.assetTag).toBe('資産タグ');
      expect(ASSET_CSV_HEADERS.name).toBe('名前');
    });
  });
});