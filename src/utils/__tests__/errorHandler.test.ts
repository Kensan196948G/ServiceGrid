import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  NetworkError,
  handleApiError,
  getErrorMessage
} from '../errorHandler';

describe('ErrorHandler', () => {
  describe('AppError', () => {
    it('デフォルト値で作成される', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('カスタム値で作成される', () => {
      const error = new AppError('Custom error', 400, false);
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('特定のエラータイプ', () => {
    it('ValidationErrorが正しく作成される', () => {
      const error = new ValidationError('Validation failed');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
    });

    it('AuthenticationErrorが正しく作成される', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
    });

    it('AuthorizationErrorが正しく作成される', () => {
      const error = new AuthorizationError();
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
    });

    it('NotFoundErrorが正しく作成される', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });

    it('NetworkErrorが正しく作成される', () => {
      const error = new NetworkError();
      expect(error.message).toBe('Network error occurred');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('handleApiError', () => {
    it('ネットワークエラーを処理する', () => {
      const networkError = new TypeError('fetch is not defined');
      const result = handleApiError(networkError);
      
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.message).toBe('サーバーに接続できません。ネットワーク接続を確認してください。');
    });

    it('AppErrorをそのまま返す', () => {
      const appError = new ValidationError('Test validation error');
      const result = handleApiError(appError);
      
      expect(result).toBe(appError);
    });

    it('HTTPステータスコードを適切に処理する', () => {
      const httpError = { status: 401 };
      const result = handleApiError(httpError);
      
      expect(result).toBeInstanceOf(AuthenticationError);
      expect(result.message).toBe('認証が必要です。再度ログインしてください。');
    });

    it('一般的なエラーを処理する', () => {
      const genericError = new Error('Generic error');
      const result = handleApiError(genericError);
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Generic error');
    });

    it('不明なエラーを処理する', () => {
      const unknownError = 'string error';
      const result = handleApiError(unknownError);
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('予期しないエラーが発生しました。');
    });
  });

  describe('getErrorMessage', () => {
    it('エラーメッセージを返す', () => {
      const error = new ValidationError('Validation failed');
      const message = getErrorMessage(error);
      
      expect(message).toBe('Validation failed');
    });

    it('不明なエラーのメッセージを返す', () => {
      const message = getErrorMessage('unknown');
      
      expect(message).toBe('予期しないエラーが発生しました。');
    });
  });
});