export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error occurred') {
    super(message, 500);
  }
}

export const handleApiError = (error: unknown): AppError => {
  // ネットワークエラー
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError('サーバーに接続できません。ネットワーク接続を確認してください。');
  }

  // 既存のAppError
  if (error instanceof AppError) {
    return error;
  }

  // HTTPレスポンスエラー
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status;
    switch (status) {
      case 400:
        return new ValidationError('入力内容に不備があります。');
      case 401:
        return new AuthenticationError('認証が必要です。再度ログインしてください。');
      case 403:
        return new AuthorizationError('この操作を実行する権限がありません。');
      case 404:
        return new NotFoundError('指定されたリソースが見つかりません。');
      case 500:
        return new AppError('サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。');
      default:
        return new AppError(`エラーが発生しました (${status})`);
    }
  }

  // その他のエラー
  if (error instanceof Error) {
    return new AppError(error.message);
  }

  return new AppError('予期しないエラーが発生しました。');
};

export const getErrorMessage = (error: unknown): string => {
  const appError = handleApiError(error);
  return appError.message;
};

export const logError = (error: unknown, context?: string) => {
  const appError = handleApiError(error);
  
  console.error('Error occurred:', {
    message: appError.message,
    statusCode: appError.statusCode,
    context,
    stack: appError.stack,
    timestamp: new Date().toISOString()
  });

  // 本番環境では外部ログサービスに送信
  if (process.env.NODE_ENV === 'production') {
    // TODO: 外部ログサービスに送信
  }
};