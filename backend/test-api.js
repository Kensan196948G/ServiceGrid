#!/usr/bin/env node

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:8082';

// HTTPリクエストヘルパー関数
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ServiceGrid-API-Tester/1.0',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: body,
            json: null
          };
          
          if (body) {
            try {
              response.json = JSON.parse(body);
            } catch (e) {
              // JSONパース失敗時はそのまま
            }
          }
          
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.setTimeout(10000);

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// テスト実行関数
async function runAPITests() {
  console.log('🚀 ServiceGrid API自動テスト開始');
  console.log('=====================================');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // テスト1: サーバー基本接続
  try {
    console.log('\n📡 Test 1: サーバー基本接続');
    const pingResponse = await makeRequest('GET', '/ping');
    if (pingResponse.status === 200 && pingResponse.body === 'pong') {
      console.log('✅ PASS: Ping test');
      results.passed++;
    } else {
      console.log('❌ FAIL: Ping test - 期待されたレスポンスと異なります');
      console.log(`   Status: ${pingResponse.status}, Body: ${pingResponse.body}`);
      results.failed++;
      results.errors.push('Ping test failed');
    }
  } catch (error) {
    console.log('❌ FAIL: Ping test - ' + error.message);
    results.failed++;
    results.errors.push('Ping test error: ' + error.message);
  }

  // テスト2: ヘルスチェック
  try {
    console.log('\n🏥 Test 2: ヘルスチェック');
    const healthResponse = await makeRequest('GET', '/api/health');
    if (healthResponse.status === 200 && healthResponse.json && healthResponse.json.status) {
      console.log('✅ PASS: Health check');
      console.log(`   Server status: ${healthResponse.json.status}`);
      console.log(`   Version: ${healthResponse.json.version}`);
      results.passed++;
    } else {
      console.log('❌ FAIL: Health check');
      console.log(`   Status: ${healthResponse.status}`);
      results.failed++;
      results.errors.push('Health check failed');
    }
  } catch (error) {
    console.log('❌ FAIL: Health check - ' + error.message);
    results.failed++;
    results.errors.push('Health check error: ' + error.message);
  }

  // テスト3: 認証API - ログイン
  let authToken = null;
  try {
    console.log('\n🔐 Test 3: 認証API - ログイン');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.status === 200 && loginResponse.json && loginResponse.json.success) {
      console.log('✅ PASS: ログイン認証');
      authToken = loginResponse.json.token;
      console.log(`   Token取得成功: ${authToken ? 'Yes' : 'No'}`);
      results.passed++;
    } else {
      console.log('❌ FAIL: ログイン認証');
      console.log(`   Status: ${loginResponse.status}`);
      console.log(`   Response: ${JSON.stringify(loginResponse.json, null, 2)}`);
      results.failed++;
      results.errors.push('Login authentication failed');
    }
  } catch (error) {
    console.log('❌ FAIL: ログイン認証 - ' + error.message);
    results.failed++;
    results.errors.push('Login authentication error: ' + error.message);
  }

  // テスト4: 認証必須エンドポイント（認証ヘッダーなし）
  try {
    console.log('\n🚫 Test 4: 認証必須エンドポイント（認証なし）');
    const unauthorizedResponse = await makeRequest('GET', '/api/auth/me');
    if (unauthorizedResponse.status === 401) {
      console.log('✅ PASS: 認証なしアクセスは適切に拒否');
      results.passed++;
    } else {
      console.log('❌ FAIL: 認証なしアクセスの拒否に失敗');
      console.log(`   Status: ${unauthorizedResponse.status} (期待値: 401)`);
      results.failed++;
      results.errors.push('Unauthorized access not properly blocked');
    }
  } catch (error) {
    console.log('❌ FAIL: 認証テスト - ' + error.message);
    results.failed++;
    results.errors.push('Authentication test error: ' + error.message);
  }

  // テスト5: 認証済みエンドポイント
  if (authToken) {
    try {
      console.log('\n👤 Test 5: 認証済みユーザー情報取得');
      const userResponse = await makeRequest('GET', '/api/auth/me', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (userResponse.status === 200 && userResponse.json && userResponse.json.user) {
        console.log('✅ PASS: 認証済みユーザー情報取得');
        console.log(`   Username: ${userResponse.json.user.username}`);
        console.log(`   Role: ${userResponse.json.user.role}`);
        results.passed++;
      } else {
        console.log('❌ FAIL: 認証済みユーザー情報取得');
        console.log(`   Status: ${userResponse.status}`);
        results.failed++;
        results.errors.push('Authenticated user info retrieval failed');
      }
    } catch (error) {
      console.log('❌ FAIL: 認証済みユーザー情報取得 - ' + error.message);
      results.failed++;
      results.errors.push('Authenticated user info error: ' + error.message);
    }
  }

  // テスト6: 資産管理API
  if (authToken) {
    try {
      console.log('\n📦 Test 6: 資産管理API');
      const assetsResponse = await makeRequest('GET', '/api/assets', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (assetsResponse.status === 200) {
        console.log('✅ PASS: 資産一覧取得');
        const assetsData = assetsResponse.json;
        if (assetsData && assetsData.data) {
          console.log(`   取得された資産数: ${assetsData.data.length}件`);
        }
        results.passed++;
      } else {
        console.log('❌ FAIL: 資産一覧取得');
        console.log(`   Status: ${assetsResponse.status}`);
        console.log(`   Error: ${assetsResponse.json ? assetsResponse.json.error : 'Unknown'}`);
        results.failed++;
        results.errors.push('Assets API failed');
      }
    } catch (error) {
      console.log('❌ FAIL: 資産管理API - ' + error.message);
      results.failed++;
      results.errors.push('Assets API error: ' + error.message);
    }
  }

  // テスト7: インシデント管理API
  if (authToken) {
    try {
      console.log('\n🚨 Test 7: インシデント管理API');
      const incidentsResponse = await makeRequest('GET', '/api/incidents', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (incidentsResponse.status === 200) {
        console.log('✅ PASS: インシデント一覧取得');
        const incidentsData = incidentsResponse.json;
        if (incidentsData && incidentsData.data) {
          console.log(`   取得されたインシデント数: ${incidentsData.data.length}件`);
        }
        results.passed++;
      } else {
        console.log('❌ FAIL: インシデント一覧取得');
        console.log(`   Status: ${incidentsResponse.status}`);
        console.log(`   Error: ${incidentsResponse.json ? incidentsResponse.json.error : 'Unknown'}`);
        results.failed++;
        results.errors.push('Incidents API failed');
      }
    } catch (error) {
      console.log('❌ FAIL: インシデント管理API - ' + error.message);
      results.failed++;
      results.errors.push('Incidents API error: ' + error.message);
    }
  }

  // テスト8: サービスリクエストAPI
  if (authToken) {
    try {
      console.log('\n📋 Test 8: サービスリクエストAPI');
      const serviceRequestsResponse = await makeRequest('GET', '/api/service-requests', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (serviceRequestsResponse.status === 200) {
        console.log('✅ PASS: サービスリクエスト一覧取得');
        results.passed++;
      } else {
        console.log('❌ FAIL: サービスリクエスト一覧取得');
        console.log(`   Status: ${serviceRequestsResponse.status}`);
        console.log(`   Error: ${serviceRequestsResponse.json ? serviceRequestsResponse.json.error : 'Unknown'}`);
        results.failed++;
        results.errors.push('Service Requests API failed');
      }
    } catch (error) {
      console.log('❌ FAIL: サービスリクエストAPI - ' + error.message);
      results.failed++;
      results.errors.push('Service Requests API error: ' + error.message);
    }
  }

  // テスト9: 変更管理API
  if (authToken) {
    try {
      console.log('\n🔄 Test 9: 変更管理API');
      const changesResponse = await makeRequest('GET', '/api/changes', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (changesResponse.status === 200) {
        console.log('✅ PASS: 変更管理一覧取得');
        results.passed++;
      } else {
        console.log('❌ FAIL: 変更管理一覧取得');
        console.log(`   Status: ${changesResponse.status}`);
        console.log(`   Error: ${changesResponse.json ? changesResponse.json.error : 'Unknown'}`);
        results.failed++;
        results.errors.push('Changes API failed');
      }
    } catch (error) {
      console.log('❌ FAIL: 変更管理API - ' + error.message);
      results.failed++;
      results.errors.push('Changes API error: ' + error.message);
    }
  }

  // 結果サマリー
  console.log('\n=====================================');
  console.log('📊 テスト結果サマリー');
  console.log('=====================================');
  console.log(`✅ 成功: ${results.passed}件`);
  console.log(`❌ 失敗: ${results.failed}件`);
  console.log(`📈 成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n🔍 発見された問題:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  return results;
}

// メイン実行
runAPITests().then(results => {
  console.log('\n🏁 API自動テスト完了');
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('💥 テスト実行エラー:', error);
  process.exit(1);
});