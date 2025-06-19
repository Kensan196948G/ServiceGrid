/**
 * フォームバリデーション ユーティリティ
 * 包括的なバリデーション機能を提供
 */
import * as React from 'react';
const { useState } = React;

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  type?: 'email' | 'number' | 'date' | 'text' | 'tel' | 'url';
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\-\+\(\)\s]+$/,
  assetTag: /^[A-Z]{2,4}-\d{3,6}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_\.]+$/,
  ipAddress: /^(\d{1,3}\.){3}\d{1,3}$/,
  url: /^https?:\/\/.+/
};

// Validation rule presets for common fields
export const FIELD_VALIDATION_RULES = {
  // Asset validation rules
  assetName: {
    required: true,
    minLength: 1,
    maxLength: 200,
    pattern: VALIDATION_PATTERNS.noSpecialChars
  },
  assetTag: {
    required: true,
    minLength: 5,
    maxLength: 20,
    pattern: VALIDATION_PATTERNS.assetTag
  },
  assetDescription: {
    maxLength: 1000
  },
  assignedTo: {
    maxLength: 100,
    pattern: VALIDATION_PATTERNS.noSpecialChars
  },
  location: {
    maxLength: 100,
    pattern: VALIDATION_PATTERNS.noSpecialChars
  },
  
  // Incident validation rules
  incidentTitle: {
    required: true,
    minLength: 5,
    maxLength: 200
  },
  incidentDescription: {
    required: true,
    minLength: 10,
    maxLength: 2000
  },
  reportedBy: {
    required: true,
    maxLength: 100,
    pattern: VALIDATION_PATTERNS.noSpecialChars
  },
  
  // Service Request validation rules
  serviceRequestSubject: {
    required: true,
    minLength: 5,
    maxLength: 200
  },
  serviceRequestDetail: {
    required: true,
    minLength: 10,
    maxLength: 2000
  },
  requestor: {
    required: true,
    maxLength: 100,
    pattern: VALIDATION_PATTERNS.noSpecialChars
  },
  
  // User validation rules
  username: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: VALIDATION_PATTERNS.alphanumeric
  },
  email: {
    required: true,
    type: 'email' as const,
    pattern: VALIDATION_PATTERNS.email
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128
  },
  displayName: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: VALIDATION_PATTERNS.noSpecialChars
  },
  
  // Common fields
  phoneNumber: {
    pattern: VALIDATION_PATTERNS.phone
  },
  url: {
    type: 'url' as const,
    pattern: VALIDATION_PATTERNS.url
  },
  cost: {
    type: 'number' as const,
    custom: (value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        const num = parseFloat(value);
        if (isNaN(num)) return 'コストは数値で入力してください。';
        if (num < 0) return 'コストは0以上で入力してください。';
      }
      return null;
    }
  }
};

// Main validation function
export function validateField(fieldName: string, value: any, rules: ValidationRule): string | null {
  // Handle undefined/null values
  if (value === undefined || value === null || value === '') {
    if (rules.required) {
      return `${getFieldDisplayName(fieldName)}は必須です。`;
    }
    return null;
  }

  const stringValue = String(value).trim();

  // Required validation
  if (rules.required && stringValue.length === 0) {
    return `${getFieldDisplayName(fieldName)}は必須です。`;
  }

  // Skip other validations for empty non-required fields
  if (stringValue.length === 0) {
    return null;
  }

  // Length validations
  if (rules.minLength && stringValue.length < rules.minLength) {
    return `${getFieldDisplayName(fieldName)}は${rules.minLength}文字以上で入力してください。`;
  }

  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return `${getFieldDisplayName(fieldName)}は${rules.maxLength}文字以内で入力してください。`;
  }

  // Type validations
  if (rules.type) {
    switch (rules.type) {
      case 'email':
        if (!VALIDATION_PATTERNS.email.test(stringValue)) {
          return '正しいメールアドレスを入力してください。';
        }
        break;
      case 'number':
        if (isNaN(Number(stringValue))) {
          return '数値を入力してください。';
        }
        break;
      case 'date':
        const date = new Date(stringValue);
        if (isNaN(date.getTime())) {
          return '正しい日付を入力してください（YYYY-MM-DD）。';
        }
        break;
      case 'url':
        if (!VALIDATION_PATTERNS.url.test(stringValue)) {
          return '正しいURLを入力してください（http://またはhttps://で始まる）。';
        }
        break;
    }
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return getPatternErrorMessage(fieldName, rules.pattern);
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      return customError;
    }
  }

  return null;
}

// Validate multiple fields
export function validateForm(data: Record<string, any>, validationRules: Record<string, ValidationRule>): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [fieldName, rules] of Object.entries(validationRules)) {
    const value = data[fieldName];
    const error = validateField(fieldName, value, rules);
    
    if (error) {
      errors.push({
        field: fieldName,
        message: error
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Get user-friendly field names
function getFieldDisplayName(fieldName: string): string {
  const fieldNames: Record<string, string> = {
    // Asset fields
    name: '資産名',
    assetTag: '資産タグ',
    type: '資産種類',
    status: 'ステータス',
    assignedTo: '割り当て先',
    location: '場所',
    description: '説明',
    serialNumber: 'シリアル番号',
    manufacturer: 'メーカー',
    model: 'モデル',
    purchaseDate: '購入日',
    warrantyEnd: '保証期限',
    cost: 'コスト',
    
    // Incident fields
    title: 'タイトル',
    priority: '優先度',
    impact: '影響度',
    urgency: '緊急度',
    category: 'カテゴリ',
    reportedBy: '報告者',
    assignee: '担当者',
    
    // Service Request fields
    subject: '件名',
    detail: '詳細',
    serviceType: 'サービス種類',
    requestor: '申請者',
    approver: '承認者',
    
    // User fields
    username: 'ユーザー名',
    email: 'メールアドレス',
    password: 'パスワード',
    displayName: '表示名',
    role: '役割',
    
    // Common fields
    phoneNumber: '電話番号',
    url: 'URL'
  };

  return fieldNames[fieldName] || fieldName;
}

// Get pattern-specific error messages
function getPatternErrorMessage(fieldName: string, pattern: RegExp): string {
  const fieldDisplayName = getFieldDisplayName(fieldName);
  
  if (pattern === VALIDATION_PATTERNS.email) {
    return '正しいメールアドレス形式で入力してください。';
  }
  
  if (pattern === VALIDATION_PATTERNS.phone) {
    return '正しい電話番号形式で入力してください。';
  }
  
  if (pattern === VALIDATION_PATTERNS.assetTag) {
    return '資産タグは「ABC-123」の形式で入力してください。';
  }
  
  if (pattern === VALIDATION_PATTERNS.alphanumeric) {
    return `${fieldDisplayName}は英数字のみで入力してください。`;
  }
  
  if (pattern === VALIDATION_PATTERNS.noSpecialChars) {
    return `${fieldDisplayName}には特殊文字は使用できません。`;
  }
  
  if (pattern === VALIDATION_PATTERNS.ipAddress) {
    return '正しいIPアドレス形式で入力してください（例：192.168.1.1）。';
  }
  
  if (pattern === VALIDATION_PATTERNS.url) {
    return '正しいURL形式で入力してください（http://またはhttps://で始まる）。';
  }
  
  return `${fieldDisplayName}の形式が正しくありません。`;
}

// Real-time validation hook for React forms
export function useFormValidation(initialData: Record<string, any>, validationRules: Record<string, ValidationRule>) {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateSingleField = (fieldName: string, value: any) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;
    
    return validateField(fieldName, value, rules);
  };

  const handleChange = (fieldName: string, value: any) => {
    setData(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate if field has been touched
    if (touched[fieldName]) {
      const error = validateSingleField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error || ''
      }));
    }
  };

  const handleBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    const error = validateSingleField(fieldName, data[fieldName]);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error || ''
    }));
  };

  const validateAll = (): boolean => {
    const result = validateForm(data, validationRules);
    const errorMap: Record<string, string> = {};
    
    result.errors.forEach(error => {
      errorMap[error.field] = error.message;
    });
    
    setErrors(errorMap);
    
    // Mark all fields as touched
    const touchedFields: Record<string, boolean> = {};
    Object.keys(validationRules).forEach(field => {
      touchedFields[field] = true;
    });
    setTouched(touchedFields);
    
    return result.isValid;
  };

  return {
    data,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    isValid: Object.values(errors).every(error => !error)
  };
}

// Export commonly used validation rule sets
export const ASSET_VALIDATION_RULES = {
  name: FIELD_VALIDATION_RULES.assetName,
  assetTag: FIELD_VALIDATION_RULES.assetTag,
  type: { required: true },
  status: { required: true },
  assignedTo: FIELD_VALIDATION_RULES.assignedTo,
  location: FIELD_VALIDATION_RULES.location,
  description: FIELD_VALIDATION_RULES.assetDescription,
  cost: FIELD_VALIDATION_RULES.cost
};

export const INCIDENT_VALIDATION_RULES = {
  title: FIELD_VALIDATION_RULES.incidentTitle,
  description: FIELD_VALIDATION_RULES.incidentDescription,
  reportedBy: FIELD_VALIDATION_RULES.reportedBy,
  priority: { required: true },
  status: { required: true }
};

export const SERVICE_REQUEST_VALIDATION_RULES = {
  subject: FIELD_VALIDATION_RULES.serviceRequestSubject,
  detail: FIELD_VALIDATION_RULES.serviceRequestDetail,
  requestor: FIELD_VALIDATION_RULES.requestor,
  serviceType: { required: true },
  priority: { required: true },
  business_justification: { maxLength: 1000 },
  requested_item: { maxLength: 200 },
  estimated_cost: FIELD_VALIDATION_RULES.cost,
  requested_delivery_date: { type: 'date' as const }
};

// ServiceRequest specific validation function
export function validateServiceRequest(data: Partial<any>): { isValid: boolean; errors: Record<string, string> } {
  const result = validateForm(data, SERVICE_REQUEST_VALIDATION_RULES);
  const errorMap: Record<string, string> = {};
  
  result.errors.forEach(error => {
    errorMap[error.field] = error.message;
  });
  
  return {
    isValid: result.isValid,
    errors: errorMap
  };
}

export const USER_VALIDATION_RULES = {
  username: FIELD_VALIDATION_RULES.username,
  email: FIELD_VALIDATION_RULES.email,
  displayName: FIELD_VALIDATION_RULES.displayName,
  password: FIELD_VALIDATION_RULES.password,
  role: { required: true }
};