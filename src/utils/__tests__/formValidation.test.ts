// Comprehensive tests for form validation utilities
import * as React from 'react';
import { 
  validateField, 
  validateForm, 
  VALIDATION_PATTERNS, 
  FIELD_VALIDATION_RULES,
  ASSET_VALIDATION_RULES,
  INCIDENT_VALIDATION_RULES,
  SERVICE_REQUEST_VALIDATION_RULES
} from '../formValidation';

describe('Form Validation Utils', () => {
  describe('validateField', () => {
    test('should validate required fields', () => {
      const rules = { required: true };
      
      expect(validateField('testField', '', rules)).toContain('必須です');
      expect(validateField('testField', null, rules)).toContain('必須です');
      expect(validateField('testField', undefined, rules)).toContain('必須です');
      expect(validateField('testField', 'value', rules)).toBeNull();
    });

    test('should validate minimum length', () => {
      const rules = { minLength: 5 };
      
      expect(validateField('testField', 'abc', rules)).toContain('5文字以上');
      expect(validateField('testField', 'abcdef', rules)).toBeNull();
    });

    test('should validate maximum length', () => {
      const rules = { maxLength: 10 };
      
      expect(validateField('testField', 'this is a very long string', rules)).toContain('10文字以内');
      expect(validateField('testField', 'short', rules)).toBeNull();
    });

    test('should validate email type', () => {
      const rules = { type: 'email' as const };
      
      expect(validateField('email', 'invalid-email', rules)).toContain('メールアドレス');
      expect(validateField('email', 'test@example.com', rules)).toBeNull();
    });

    test('should validate number type', () => {
      const rules = { type: 'number' as const };
      
      expect(validateField('number', 'not-a-number', rules)).toContain('数値');
      expect(validateField('number', '123', rules)).toBeNull();
      expect(validateField('number', '123.45', rules)).toBeNull();
    });

    test('should validate date type', () => {
      const rules = { type: 'date' as const };
      
      expect(validateField('date', 'invalid-date', rules)).toContain('日付');
      expect(validateField('date', '2023-12-25', rules)).toBeNull();
    });

    test('should validate URL type', () => {
      const rules = { type: 'url' as const };
      
      expect(validateField('url', 'invalid-url', rules)).toContain('URL');
      expect(validateField('url', 'https://example.com', rules)).toBeNull();
      expect(validateField('url', 'http://example.com', rules)).toBeNull();
    });

    test('should validate patterns', () => {
      const rules = { pattern: VALIDATION_PATTERNS.assetTag };
      
      expect(validateField('assetTag', 'invalid-tag', rules)).toContain('形式');
      expect(validateField('assetTag', 'SRV-001', rules)).toBeNull();
    });

    test('should validate custom rules', () => {
      const rules = {
        custom: (value: any) => {
          if (value === 'forbidden') return 'この値は使用できません';
          return null;
        }
      };
      
      expect(validateField('custom', 'forbidden', rules)).toBe('この値は使用できません');
      expect(validateField('custom', 'allowed', rules)).toBeNull();
    });

    test('should skip validation for empty non-required fields', () => {
      const rules = { minLength: 5, maxLength: 10 };
      
      expect(validateField('optional', '', rules)).toBeNull();
      expect(validateField('optional', null, rules)).toBeNull();
      expect(validateField('optional', undefined, rules)).toBeNull();
    });
  });

  describe('validateForm', () => {
    test('should validate multiple fields', () => {
      const data = {
        name: '',
        email: 'invalid-email',
        age: 'not-a-number'
      };
      
      const rules = {
        name: { required: true },
        email: { required: true, type: 'email' as const },
        age: { type: 'number' as const }
      };
      
      const result = validateForm(data, rules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.find(e => e.field === 'name')).toBeDefined();
      expect(result.errors.find(e => e.field === 'email')).toBeDefined();
      expect(result.errors.find(e => e.field === 'age')).toBeDefined();
    });

    test('should return valid result for correct data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        age: '25'
      };
      
      const rules = {
        name: { required: true, minLength: 2 },
        email: { required: true, type: 'email' as const },
        age: { type: 'number' as const }
      };
      
      const result = validateForm(data, rules);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('VALIDATION_PATTERNS', () => {
    test('should validate email pattern', () => {
      expect(VALIDATION_PATTERNS.email.test('test@example.com')).toBe(true);
      expect(VALIDATION_PATTERNS.email.test('invalid-email')).toBe(false);
      expect(VALIDATION_PATTERNS.email.test('test@')).toBe(false);
      expect(VALIDATION_PATTERNS.email.test('@example.com')).toBe(false);
    });

    test('should validate phone pattern', () => {
      expect(VALIDATION_PATTERNS.phone.test('090-1234-5678')).toBe(true);
      expect(VALIDATION_PATTERNS.phone.test('09012345678')).toBe(true);
      expect(VALIDATION_PATTERNS.phone.test('(090) 1234-5678')).toBe(true);
      expect(VALIDATION_PATTERNS.phone.test('+81-90-1234-5678')).toBe(true);
      expect(VALIDATION_PATTERNS.phone.test('abc-def-ghij')).toBe(false);
    });

    test('should validate asset tag pattern', () => {
      expect(VALIDATION_PATTERNS.assetTag.test('SRV-001')).toBe(true);
      expect(VALIDATION_PATTERNS.assetTag.test('LAP-123456')).toBe(true);
      expect(VALIDATION_PATTERNS.assetTag.test('NET-001')).toBe(true);
      expect(VALIDATION_PATTERNS.assetTag.test('invalid-tag')).toBe(false);
      expect(VALIDATION_PATTERNS.assetTag.test('SRV001')).toBe(false);
      expect(VALIDATION_PATTERNS.assetTag.test('SRV-')).toBe(false);
    });

    test('should validate alphanumeric pattern', () => {
      expect(VALIDATION_PATTERNS.alphanumeric.test('abc123')).toBe(true);
      expect(VALIDATION_PATTERNS.alphanumeric.test('ABC123')).toBe(true);
      expect(VALIDATION_PATTERNS.alphanumeric.test('abc-123')).toBe(false);
      expect(VALIDATION_PATTERNS.alphanumeric.test('abc 123')).toBe(false);
    });

    test('should validate IP address pattern', () => {
      expect(VALIDATION_PATTERNS.ipAddress.test('192.168.1.1')).toBe(true);
      expect(VALIDATION_PATTERNS.ipAddress.test('10.0.0.1')).toBe(true);
      expect(VALIDATION_PATTERNS.ipAddress.test('255.255.255.255')).toBe(true);
      expect(VALIDATION_PATTERNS.ipAddress.test('192.168.1')).toBe(false);
      expect(VALIDATION_PATTERNS.ipAddress.test('999.999.999.999')).toBe(true); // Pattern only checks format, not ranges
      expect(VALIDATION_PATTERNS.ipAddress.test('invalid-ip')).toBe(false);
    });

    test('should validate URL pattern', () => {
      expect(VALIDATION_PATTERNS.url.test('https://example.com')).toBe(true);
      expect(VALIDATION_PATTERNS.url.test('http://example.com')).toBe(true);
      expect(VALIDATION_PATTERNS.url.test('https://sub.example.com/path')).toBe(true);
      expect(VALIDATION_PATTERNS.url.test('ftp://example.com')).toBe(false);
      expect(VALIDATION_PATTERNS.url.test('example.com')).toBe(false);
    });
  });

  describe('Pre-defined validation rules', () => {
    test('ASSET_VALIDATION_RULES should contain required rules', () => {
      expect(ASSET_VALIDATION_RULES).toHaveProperty('name');
      expect(ASSET_VALIDATION_RULES).toHaveProperty('assetTag');
      expect(ASSET_VALIDATION_RULES).toHaveProperty('type');
      expect(ASSET_VALIDATION_RULES).toHaveProperty('status');
      
      expect(ASSET_VALIDATION_RULES.name.required).toBe(true);
      expect(ASSET_VALIDATION_RULES.assetTag.required).toBe(true);
      expect(ASSET_VALIDATION_RULES.type.required).toBe(true);
    });

    test('INCIDENT_VALIDATION_RULES should contain required rules', () => {
      expect(INCIDENT_VALIDATION_RULES).toHaveProperty('title');
      expect(INCIDENT_VALIDATION_RULES).toHaveProperty('description');
      expect(INCIDENT_VALIDATION_RULES).toHaveProperty('reportedBy');
      
      expect(INCIDENT_VALIDATION_RULES.title.required).toBe(true);
      expect(INCIDENT_VALIDATION_RULES.description.required).toBe(true);
      expect(INCIDENT_VALIDATION_RULES.reportedBy.required).toBe(true);
    });

    test('SERVICE_REQUEST_VALIDATION_RULES should contain required rules', () => {
      expect(SERVICE_REQUEST_VALIDATION_RULES).toHaveProperty('subject');
      expect(SERVICE_REQUEST_VALIDATION_RULES).toHaveProperty('detail');
      expect(SERVICE_REQUEST_VALIDATION_RULES).toHaveProperty('requestor');
      
      expect(SERVICE_REQUEST_VALIDATION_RULES.subject.required).toBe(true);
      expect(SERVICE_REQUEST_VALIDATION_RULES.detail.required).toBe(true);
      expect(SERVICE_REQUEST_VALIDATION_RULES.requestor.required).toBe(true);
    });
  });

  describe('FIELD_VALIDATION_RULES', () => {
    test('should have proper cost validation', () => {
      const costRule = FIELD_VALIDATION_RULES.cost;
      
      expect(costRule.custom).toBeDefined();
      if (costRule.custom) {
        expect(costRule.custom('invalid')).toContain('数値');
        expect(costRule.custom('-10')).toContain('0以上');
        expect(costRule.custom('100')).toBeNull();
        expect(costRule.custom('')).toBeNull();
      }
    });

    test('should have proper email validation', () => {
      const emailRule = FIELD_VALIDATION_RULES.email;
      
      expect(emailRule.required).toBe(true);
      expect(emailRule.type).toBe('email');
      expect(emailRule.pattern).toBe(VALIDATION_PATTERNS.email);
    });

    test('should have proper username validation', () => {
      const usernameRule = FIELD_VALIDATION_RULES.username;
      
      expect(usernameRule.required).toBe(true);
      expect(usernameRule.minLength).toBe(3);
      expect(usernameRule.maxLength).toBe(50);
      expect(usernameRule.pattern).toBe(VALIDATION_PATTERNS.alphanumeric);
    });

    test('should have proper password validation', () => {
      const passwordRule = FIELD_VALIDATION_RULES.password;
      
      expect(passwordRule.required).toBe(true);
      expect(passwordRule.minLength).toBe(8);
      expect(passwordRule.maxLength).toBe(128);
    });
  });
});