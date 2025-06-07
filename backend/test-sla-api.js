/**
 * SLA API テストスクリプト
 * 
 * SLA管理APIの基本的な動作をテストします
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8082';
let authToken = '';

async function login() {
  try {
    console.log('🔐 ログイン中...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = response.data.token;
    console.log('✅ ログイン成功');
    return true;
  } catch (error) {
    console.error('❌ ログイン失敗:', error.response?.data || error.message);
    return false;
  }
}

async function testSLAEndpoints() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. SLA一覧取得テスト
    console.log('\n📋 SLA一覧取得テスト...');
    const listResponse = await axios.get(`${BASE_URL}/api/slas`, { headers });
    console.log(`✅ SLA一覧取得成功: ${listResponse.data.data.length}件`);
    console.log('サンプル SLA:', listResponse.data.data[0]);

    // 2. SLA統計取得テスト
    console.log('\n📊 SLA統計取得テスト...');
    const statsResponse = await axios.get(`${BASE_URL}/api/slas/stats`, { headers });
    console.log('✅ SLA統計取得成功');
    console.log('統計情報:', {
      total: statsResponse.data.total,
      performance_metrics: statsResponse.data.performance_metrics
    });

    // 3. SLA詳細取得テスト
    if (listResponse.data.data.length > 0) {
      const slaId = listResponse.data.data[0].sla_id;
      console.log(`\n🔍 SLA詳細取得テスト (ID: ${slaId})...`);
      const detailResponse = await axios.get(`${BASE_URL}/api/slas/${slaId}`, { headers });
      console.log('✅ SLA詳細取得成功');
      console.log('詳細情報:', detailResponse.data);
    }

    // 4. 新しいSLA作成テスト
    console.log('\n🆕 SLA作成テスト...');
    const newSLA = {
      service_name: 'テストサービス',
      metric_name: 'API応答時間',
      metric_type: 'Response Time',
      target_value: 1.5,
      actual_value: 1.2,
      unit: '秒',
      measurement_period: 'Daily',
      measurement_date: new Date().toISOString().split('T')[0],
      responsible_team: 'テストチーム'
    };

    const createResponse = await axios.post(`${BASE_URL}/api/slas`, newSLA, { headers });
    console.log('✅ SLA作成成功');
    console.log('作成されたSLA:', createResponse.data.data);
    const createdSlaId = createResponse.data.data.sla_id;

    // 5. SLA更新テスト
    console.log(`\n📝 SLA更新テスト (ID: ${createdSlaId})...`);
    const updateData = {
      actual_value: 1.0,
      corrective_action: 'キャッシュ最適化により応答時間改善'
    };

    await axios.put(`${BASE_URL}/api/slas/${createdSlaId}`, updateData, { headers });
    console.log('✅ SLA更新成功');

    // 6. SLAアラート生成テスト（管理者権限必要）
    console.log('\n🚨 SLAアラート生成テスト...');
    const alertResponse = await axios.get(`${BASE_URL}/api/slas/alerts?days_ahead=30`, { headers });
    console.log('✅ SLAアラート生成成功');
    console.log('アラート概要:', alertResponse.data.summary);

    // 7. SLA削除テスト
    console.log(`\n🗑️ SLA削除テスト (ID: ${createdSlaId})...`);
    await axios.delete(`${BASE_URL}/api/slas/${createdSlaId}`, { headers });
    console.log('✅ SLA削除成功');

    console.log('\n🎉 全てのSLA APIテストが正常に完了しました！');

  } catch (error) {
    console.error('❌ テスト失敗:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 認証エラー: トークンが無効です。再ログインしてください。');
    }
  }
}

async function runTests() {
  console.log('🔄 SLA API テスト開始...');
  console.log(`サーバー: ${BASE_URL}`);
  
  if (await login()) {
    await testSLAEndpoints();
  }
  
  console.log('\n🏁 テスト終了');
}

// テスト実行
runTests().catch(console.error);