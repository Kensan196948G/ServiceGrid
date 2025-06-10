// API接続テスト用ヘルパー
export async function testApiConnection(): Promise<boolean> {
  try {
    const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8082';
    console.log('Testing API connection to:', API_BASE_URL);
    
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    
    console.log('API Health Check:', response.ok, data);
    return response.ok;
  } catch (error) {
    console.error('API Connection Test Failed:', error);
    return false;
  }
}

export async function testIncidentsApi(): Promise<any> {
  try {
    const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8082';
    console.log('Testing incidents API:', `${API_BASE_URL}/api/incidents`);
    
    const response = await fetch(`${API_BASE_URL}/api/incidents`);
    const data = await response.json();
    
    console.log('Incidents API Response:', response.status, data);
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error('Incidents API Test Failed:', error);
    return { success: false, error: error.message };
  }
}