/**
 * PowerShell統合サービス - WebUI ↔ PowerShell API連携
 * 型安全なインターフェースと包括的エラーハンドリング
 */

export interface PowerShellResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly timestamp: string;
  readonly executionTime: number;
  readonly version: string;
}

export interface PowerShellApiEndpoint {
  readonly name: string;
  readonly endpoint: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly description: string;
  readonly authenticated: boolean;
}

// PowerShell API エンドポイント定義
export const POWERSHELL_ENDPOINTS: readonly PowerShellApiEndpoint[] = [
  {
    name: 'Assets',
    endpoint: '/api/powershell/assets',
    method: 'GET',
    description: '資産管理PowerShell API',
    authenticated: true
  },
  {
    name: 'Incidents',
    endpoint: '/api/powershell/incidents',
    method: 'GET', 
    description: 'インシデント管理PowerShell API',
    authenticated: true
  },
  {
    name: 'ServiceRequests',
    endpoint: '/api/powershell/service-requests',
    method: 'GET',
    description: 'サービス要求PowerShell API',
    authenticated: true
  }
] as const;

/**
 * PowerShell API接続テスト
 */
export const testPowerShellConnection = async (): Promise<PowerShellResponse<{
  apiVersion: string;
  availableEndpoints: readonly string[];
  systemInfo: {
    powershellVersion: string;
    osVersion: string;
    serverTime: string;
  };
}>> => {
  try {
    const startTime = performance.now();
    
    // PowerShell APIへの接続テスト（実装時はバックエンドから取得）
    const mockResponse = {
      success: true,
      data: {
        apiVersion: '2.1.0',
        availableEndpoints: POWERSHELL_ENDPOINTS.map(ep => ep.name),
        systemInfo: {
          powershellVersion: '7.3.0',
          osVersion: 'Windows Server 2022',
          serverTime: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString(),
      executionTime: performance.now() - startTime,
      version: '2.1.0'
    };
    
    return mockResponse;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown PowerShell connection error',
      timestamp: new Date().toISOString(),
      executionTime: 0,
      version: '2.1.0'
    };
  }
};

/**
 * PowerShell統合強化機能
 */
export class PowerShellIntegrationService {
  private readonly baseUrl: string;
  private readonly timeout: number;
  
  constructor(baseUrl: string = 'http://localhost:8082', timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }
  
  /**
   * PowerShell APIステータス確認
   */
  async getStatus(): Promise<PowerShellResponse<{ status: 'healthy' | 'degraded' | 'down' }>> {
    try {
      const response = await testPowerShellConnection();
      return {
        ...response,
        data: {
          status: response.success ? 'healthy' : 'down'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'PowerShell service unavailable',
        timestamp: new Date().toISOString(),
        executionTime: 0,
        version: '2.1.0',
        data: { status: 'down' }
      };
    }
  }
}

export const powershellService = new PowerShellIntegrationService();