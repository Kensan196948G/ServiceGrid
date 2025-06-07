// CSV import/export utility functions
import { Asset } from '../types/asset';

export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportResult {
  success: boolean;
  data: Partial<Asset>[];
  errors: CsvValidationError[];
}

// Convert array of objects to CSV string
export function exportToCsv<T extends Record<string, any>>(
  data: T[], 
  filename: string,
  headers?: { [key: string]: string }
): void {
  if (data.length === 0) {
    alert('エクスポートするデータがありません。');
    return;
  }

  const keys = Object.keys(data[0]);
  const csvHeaders = keys.map(key => headers?.[key] || key);
  
  const csvContent = [
    csvHeaders.join(','),
    ...data.map(row => 
      keys.map(key => {
        const value = row[key];
        // Handle values that contain commas, quotes, or line breaks
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Parse CSV string and validate data
export function importFromCsv(csvContent: string): CsvImportResult {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length < 2) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, field: 'file', message: 'CSVファイルにはヘッダー行とデータ行が必要です。' }]
    };
  }

  const headers = parseCSVLine(lines[0]);
  const data: Partial<Asset>[] = [];
  const errors: CsvValidationError[] = [];

  // Expected headers for Asset import
  const requiredFields = ['name', 'type', 'assetTag'];
  const optionalFields = ['status', 'assignedTo', 'location', 'description', 'purchaseDate', 'warrantyEnd', 'cost'];
  const validFields = [...requiredFields, ...optionalFields];

  // Validate headers
  const missingRequired = requiredFields.filter(field => !headers.includes(field));
  if (missingRequired.length > 0) {
    errors.push({
      row: 0,
      field: 'headers',
      message: `必須フィールドが不足しています: ${missingRequired.join(', ')}`
    });
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length !== headers.length) {
      errors.push({
        row: i + 1,
        field: 'structure',
        message: 'ヘッダーとデータの列数が一致しません。'
      });
      continue;
    }

    const rowData: Partial<Asset> = {};
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = values[j];
      
      if (!validFields.includes(header)) {
        errors.push({
          row: i + 1,
          field: header,
          message: `不明なフィールド: ${header}`
        });
        continue;
      }

      // Validate and convert values
      switch (header) {
        case 'name':
          if (!value || value.trim().length === 0) {
            errors.push({
              row: i + 1,
              field: header,
              message: '名前は必須です。'
            });
          } else if (value.length > 200) {
            errors.push({
              row: i + 1,
              field: header,
              message: '名前は200文字以内で入力してください。'
            });
          } else {
            rowData.name = value.trim();
          }
          break;

        case 'type':
          const validTypes = ['Server', 'Desktop', 'Laptop', 'Tablet', 'Phone', 'Network Equipment', 
                             'Storage', 'Printer', 'Monitor', 'Peripheral', 'Software', 'License', 
                             'Virtual Machine', 'Cloud Service', 'Other'];
          if (!value || !validTypes.includes(value)) {
            errors.push({
              row: i + 1,
              field: header,
              message: `無効な資産種類です。有効な値: ${validTypes.join(', ')}`
            });
          } else {
            rowData.type = value as Asset['type'];
          }
          break;

        case 'assetTag':
          if (!value || value.trim().length === 0) {
            errors.push({
              row: i + 1,
              field: header,
              message: '資産タグは必須です。'
            });
          } else if (value.length > 50) {
            errors.push({
              row: i + 1,
              field: header,
              message: '資産タグは50文字以内で入力してください。'
            });
          } else {
            rowData.assetTag = value.trim();
          }
          break;

        case 'status':
          const validStatuses = ['Active', 'Inactive', 'Maintenance', 'Retired'];
          if (value && !validStatuses.includes(value)) {
            errors.push({
              row: i + 1,
              field: header,
              message: `無効なステータスです。有効な値: ${validStatuses.join(', ')}`
            });
          } else {
            rowData.status = value as Asset['status'] || 'Active';
          }
          break;

        case 'cost':
          if (value) {
            const costNumber = parseFloat(value);
            if (isNaN(costNumber) || costNumber < 0) {
              errors.push({
                row: i + 1,
                field: header,
                message: 'コストは0以上の数値で入力してください。'
              });
            } else {
              rowData.cost = costNumber;
            }
          }
          break;

        case 'purchaseDate':
        case 'warrantyEnd':
          if (value) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              errors.push({
                row: i + 1,
                field: header,
                message: '日付形式が正しくありません（YYYY-MM-DD）。'
              });
            } else {
              rowData[header as keyof Asset] = value;
            }
          }
          break;

        default:
          if (value) {
            rowData[header as keyof Asset] = value;
          }
          break;
      }
    }

    data.push(rowData);
  }

  return {
    success: errors.length === 0,
    data,
    errors
  };
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Asset-specific CSV headers mapping
export const ASSET_CSV_HEADERS = {
  id: 'ID',
  assetTag: '資産タグ',
  name: '名前',
  type: '種類',
  status: 'ステータス',
  assignedTo: '担当者',
  location: '場所',
  description: '説明',
  purchaseDate: '購入日',
  warrantyEnd: '保証期限',
  cost: 'コスト',
  created_at: '作成日',
  updated_at: '更新日'
};