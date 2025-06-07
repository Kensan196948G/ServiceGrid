// Comprehensive tests for backend error handling utilities
const {
  ITSMError,
  ERROR_TYPES,
  HTTP_STATUS,
  createValidationError,
  createDatabaseError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  validateRequiredFields,
  sanitizeInput,
  executeDbOperation
} = require('../utils/errorHandler');

describe('Error Handler Utils', () => {
  describe('ITSMError', () => {
    test('should create error with default values', () => {
      const error = new ITSMError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ERROR_TYPES.INTERNAL_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.details).toBeNull();
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('ITSMError');
    });

    test('should create error with custom values', () => {
      const details = { field: 'test' };
      const error = new ITSMError(
        'Validation error',
        ERROR_TYPES.VALIDATION_ERROR,
        HTTP_STATUS.BAD_REQUEST,
        details
      );
      
      expect(error.message).toBe('Validation error');
      expect(error.type).toBe(ERROR_TYPES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.details).toBe(details);
    });
  });

  describe('Error creators', () => {
    test('createValidationError should create validation error', () => {
      const error = createValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(ITSMError);
      expect(error.type).toBe(ERROR_TYPES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toBe('Invalid input');
    });

    test('createDatabaseError should create database error', () => {
      const error = createDatabaseError('Database connection failed');
      
      expect(error).toBeInstanceOf(ITSMError);
      expect(error.type).toBe(ERROR_TYPES.DATABASE_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.message).toBe('Database connection failed');
    });

    test('createAuthenticationError should create auth error', () => {
      const error = createAuthenticationError();
      
      expect(error).toBeInstanceOf(ITSMError);
      expect(error.type).toBe(ERROR_TYPES.AUTHENTICATION_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.message).toBe('認証が必要です');
    });

    test('createAuthorizationError should create authorization error', () => {
      const error = createAuthorizationError();
      
      expect(error).toBeInstanceOf(ITSMError);
      expect(error.type).toBe(ERROR_TYPES.AUTHORIZATION_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      expect(error.message).toBe('アクセス権限がありません');
    });

    test('createNotFoundError should create not found error', () => {
      const error = createNotFoundError('ユーザー');
      
      expect(error).toBeInstanceOf(ITSMError);
      expect(error.type).toBe(ERROR_TYPES.NOT_FOUND_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(error.message).toBe('ユーザーが見つかりません');
    });

    test('createConflictError should create conflict error', () => {
      const error = createConflictError('Duplicate entry');
      
      expect(error).toBeInstanceOf(ITSMError);
      expect(error.type).toBe(ERROR_TYPES.CONFLICT_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(error.message).toBe('Duplicate entry');
    });
  });

  describe('validateRequiredFields', () => {
    test('should pass validation for complete data', () => {
      const data = {
        name: 'Test Name',
        email: 'test@example.com',
        type: 'Server'
      };
      const requiredFields = ['name', 'email', 'type'];
      
      expect(() => validateRequiredFields(data, requiredFields)).not.toThrow();
    });

    test('should throw validation error for missing fields', () => {
      const data = {
        name: 'Test Name',
        email: ''
      };
      const requiredFields = ['name', 'email', 'type'];
      
      expect(() => validateRequiredFields(data, requiredFields)).toThrow(ITSMError);
      
      try {
        validateRequiredFields(data, requiredFields);
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.VALIDATION_ERROR);
        expect(error.message).toContain('必須フィールドが不足');
        expect(error.details.missingFields).toContain('email');
        expect(error.details.missingFields).toContain('type');
      }
    });

    test('should handle null and undefined values', () => {
      const data = {
        name: 'Test Name',
        email: null,
        type: undefined
      };
      const requiredFields = ['name', 'email', 'type'];
      
      expect(() => validateRequiredFields(data, requiredFields)).toThrow(ITSMError);
    });
  });

  describe('sanitizeInput', () => {
    test('should trim string inputs', () => {
      const input = '  test string  ';
      const result = sanitizeInput(input);
      
      expect(result).toBe('test string');
    });

    test('should handle non-string primitives', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(true)).toBe(true);
      expect(sanitizeInput(null)).toBeNull();
      expect(sanitizeInput(undefined)).toBeUndefined();
    });

    test('should sanitize object properties recursively', () => {
      const input = {
        name: '  test name  ',
        nested: {
          value: '  nested value  '
        },
        number: 123
      };
      
      const result = sanitizeInput(input);
      
      expect(result.name).toBe('test name');
      expect(result.nested.value).toBe('nested value');
      expect(result.number).toBe(123);
    });

    test('should handle arrays', () => {
      const input = ['  test1  ', '  test2  ', 123];
      const result = sanitizeInput(input);
      
      expect(result[0]).toBe('test1');
      expect(result[1]).toBe('test2');
      expect(result[2]).toBe(123);
    });
  });

  describe('executeDbOperation', () => {
    test('should resolve with successful operation', async () => {
      const mockOperation = (callback) => {
        callback(null, { id: 1, name: 'test' });
      };
      
      const result = await executeDbOperation(mockOperation);
      
      expect(result).toEqual({ id: 1, name: 'test' });
    });

    test('should reject with ITSMError on database error', async () => {
      const mockOperation = (callback) => {
        const error = new Error('Database error');
        error.code = 'SQLITE_ERROR';
        callback(error);
      };
      
      await expect(executeDbOperation(mockOperation)).rejects.toThrow(ITSMError);
      
      try {
        await executeDbOperation(mockOperation);
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.DATABASE_ERROR);
        expect(error.message).toContain('Database error');
      }
    });

    test('should reject with custom error message', async () => {
      const mockOperation = (callback) => {
        callback(new Error('Connection failed'));
      };
      
      await expect(executeDbOperation(mockOperation, 'Custom error message')).rejects.toThrow(ITSMError);
      
      try {
        await executeDbOperation(mockOperation, 'Custom error message');
      } catch (error) {
        expect(error.message).toContain('Custom error message');
      }
    });

    test('should handle synchronous operation errors', async () => {
      const mockOperation = () => {
        throw new Error('Sync error');
      };
      
      await expect(executeDbOperation(mockOperation)).rejects.toThrow(ITSMError);
    });
  });

  describe('HTTP_STATUS constants', () => {
    test('should have correct status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.CONFLICT).toBe(409);
      expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });

  describe('ERROR_TYPES constants', () => {
    test('should have all required error types', () => {
      expect(ERROR_TYPES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ERROR_TYPES.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ERROR_TYPES.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
      expect(ERROR_TYPES.AUTHORIZATION_ERROR).toBe('AUTHORIZATION_ERROR');
      expect(ERROR_TYPES.NOT_FOUND_ERROR).toBe('NOT_FOUND_ERROR');
      expect(ERROR_TYPES.CONFLICT_ERROR).toBe('CONFLICT_ERROR');
      expect(ERROR_TYPES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ERROR_TYPES.EXTERNAL_API_ERROR).toBe('EXTERNAL_API_ERROR');
    });
  });
});