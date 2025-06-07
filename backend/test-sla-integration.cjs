/**
 * SLA管理システム統合テストスクリプト
 * 
 * フロントエンドとバックエンドの完全な統合をテストします
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8082';
let authToken = '';

// テスト結果を保存する配列
const testResults = [];

function addTestResult(testName, success, details, data = null) {
  testResults.push({
    test: testName,
    success,
    details,
    data,
    timestamp: new Date().toISOString()
  });
  
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}: ${details}`);
  if (data && success) {
    console.log('   データ:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
  }
}

async function login() {
  try {
    console.log('🔐 管理者ログイン...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = response.data.token;
    addTestResult('管理者認証', true, 'JWT トークン取得成功');
    return true;
  } catch (error) {
    addTestResult('管理者認証', false, `ログイン失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testBasicSLAOperations() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('\n📋 基本SLA操作テスト開始...');

  // 1. SLA一覧取得
  try {
    const listResponse = await axios.get(`${BASE_URL}/api/slas`, { headers });
    const slas = listResponse.data.data;
    addTestResult('SLA一覧取得', true, `${slas.length}件のSLAを取得`, {
      count: slas.length,
      sample: slas[0] ? {
        service: slas[0].service_name,
        metric: slas[0].metric_name,
        status: slas[0].status
      } : null
    });
  } catch (error) {
    addTestResult('SLA一覧取得', false, `API エラー: ${error.response?.status} ${error.response?.statusText}`);
  }

  // 2. SLA統計取得
  try {
    const statsResponse = await axios.get(`${BASE_URL}/api/slas/stats`, { headers });
    const stats = statsResponse.data;
    addTestResult('SLA統計取得', true, '統計データ取得成功', {
      total: stats.total,
      achievement_rate: stats.performance_metrics.overall_achievement_rate,
      breached: stats.performance_metrics.breached_slas
    });
  } catch (error) {
    addTestResult('SLA統計取得', false, `統計API エラー: ${error.response?.status}`);
  }

  // 3. 新しいSLA作成
  const newSLA = {
    service_name: 'Integration Test Service',
    metric_name: 'API Availability',
    metric_type: 'Availability',
    target_value: 99.9,
    actual_value: 99.95,
    unit: '%',
    measurement_period: 'Monthly',
    measurement_date: new Date().toISOString().split('T')[0],
    responsible_team: 'Test Team'
  };

  try {
    const createResponse = await axios.post(`${BASE_URL}/api/slas`, newSLA, { headers });
    const createdSLA = createResponse.data.data;
    addTestResult('SLA作成', true, `新しいSLA作成成功 (ID: ${createdSLA.sla_id})`, {
      sla_id: createdSLA.sla_id,
      service: createdSLA.service_name,
      status: createdSLA.status
    });

    // 4. 作成したSLAの詳細取得
    try {
      const detailResponse = await axios.get(`${BASE_URL}/api/slas/${createdSLA.sla_id}`, { headers });
      const slaDetail = detailResponse.data;
      addTestResult('SLA詳細取得', true, '作成したSLAの詳細取得成功', {
        sla_id: slaDetail.sla_id,
        has_historical: slaDetail.historical_data && slaDetail.historical_data.length > 0
      });
    } catch (error) {
      addTestResult('SLA詳細取得', false, `詳細取得エラー: ${error.response?.status}`);
    }

    // 5. SLA更新
    try {
      const updateData = {
        actual_value: 99.98,
        corrective_action: 'Integration test improvement implemented'
      };
      await axios.put(`${BASE_URL}/api/slas/${createdSLA.sla_id}`, updateData, { headers });
      addTestResult('SLA更新', true, 'SLA更新成功');
    } catch (error) {
      addTestResult('SLA更新', false, `更新エラー: ${error.response?.status}`);
    }

    // 6. SLA削除
    try {
      await axios.delete(`${BASE_URL}/api/slas/${createdSLA.sla_id}`, { headers });
      addTestResult('SLA削除', true, 'SLA削除成功');
    } catch (error) {
      addTestResult('SLA削除', false, `削除エラー: ${error.response?.status}`);
    }

  } catch (error) {
    addTestResult('SLA作成', false, `作成エラー: ${error.response?.status} ${error.response?.data?.error}`);
  }
}

async function testAdvancedSLAFeatures() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('\n🚨 高度なSLA機能テスト開始...');

  // 1. SLAアラート生成
  try {
    const alertResponse = await axios.get(`${BASE_URL}/api/slas/alerts?days_ahead=30`, { headers });
    const alerts = alertResponse.data;
    addTestResult('SLAアラート生成', true, `アラート生成成功`, {
      total_alerts: alerts.summary.total_alerts,
      breached: alerts.summary.breached,
      at_risk: alerts.summary.at_risk
    });
  } catch (error) {
    addTestResult('SLAアラート生成', false, `アラート生成エラー: ${error.response?.status}`);
  }

  // 2. バルクSLA更新
  try {
    const bulkUpdates = [
      {
        service_name: 'Webサービス',
        metric_type: 'Availability',
        actual_value: 99.97,
        measurement_date: new Date().toISOString().split('T')[0]
      }
    ];

    const bulkResponse = await axios.post(`${BASE_URL}/api/slas/bulk-update`, { updates: bulkUpdates }, { headers });
    addTestResult('バルクSLA更新', true, 'バルク更新成功');
  } catch (error) {
    addTestResult('バルクSLA更新', false, `バルク更新エラー: ${error.response?.status}`);
  }
}

async function testPermissions() {
  console.log('\n🔒 権限テスト開始...');

  // オペレータでログイン
  try {
    const operatorResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'operator',
      password: 'operator123'
    });
    
    const operatorToken = operatorResponse.data.token;
    const operatorHeaders = {
      'Authorization': `Bearer ${operatorToken}`,
      'Content-Type': 'application/json'
    };

    // オペレータでSLA読み取り
    try {
      await axios.get(`${BASE_URL}/api/slas`, { headers: operatorHeaders });
      addTestResult('オペレータ読み取り権限', true, 'オペレータがSLA一覧を取得可能');
    } catch (error) {
      addTestResult('オペレータ読み取り権限', false, 'オペレータがSLA一覧を取得できない');
    }

    // オペレータでSLA作成（許可されるべき）
    try {
      const testSLA = {
        service_name: 'Operator Test Service',
        metric_name: 'Test Metric',
        metric_type: 'Performance',
        target_value: 95.0,
        unit: '%',
        measurement_period: 'Monthly',
        measurement_date: new Date().toISOString().split('T')[0]
      };

      const createResponse = await axios.post(`${BASE_URL}/api/slas`, testSLA, { headers: operatorHeaders });
      addTestResult('オペレータ作成権限', true, 'オペレータがSLA作成可能');

      // 作成したSLAを削除しようとする（管理者のみ許可）
      const createdId = createResponse.data.data.sla_id;
      try {
        await axios.delete(`${BASE_URL}/api/slas/${createdId}`, { headers: operatorHeaders });
        addTestResult('オペレータ削除権限制限', false, 'オペレータがSLAを削除できてしまった（本来は管理者のみ）');
      } catch (error) {
        if (error.response?.status === 403) {
          addTestResult('オペレータ削除権限制限', true, 'オペレータの削除が正しく拒否された');
        } else {
          addTestResult('オペレータ削除権限制限', false, `予期しないエラー: ${error.response?.status}`);
        }
      }

      // 管理者で削除
      try {
        await axios.delete(`${BASE_URL}/api/slas/${createdId}`, { 
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        addTestResult('管理者削除権限', true, '管理者がSLA削除成功');
      } catch (error) {
        addTestResult('管理者削除権限', false, `管理者削除エラー: ${error.response?.status}`);
      }

    } catch (error) {
      addTestResult('オペレータ作成権限', false, `オペレータ作成エラー: ${error.response?.status}`);
    }

  } catch (error) {
    addTestResult('オペレータログイン', false, 'オペレータログインに失敗');
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 データ整合性テスト開始...');

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  // 無効なデータでSLA作成を試行
  const invalidSLAs = [
    {
      // 必須フィールド不足
      service_name: 'Test Service'
      // metric_name, metric_type, target_value が不足
    },
    {
      // 無効なmetric_type
      service_name: 'Test Service',
      metric_name: 'Test Metric',
      metric_type: 'InvalidType',
      target_value: 99.9,
      measurement_date: new Date().toISOString().split('T')[0]
    },
    {
      // 負の target_value
      service_name: 'Test Service',
      metric_name: 'Test Metric',
      metric_type: 'Availability',
      target_value: -50,
      measurement_date: new Date().toISOString().split('T')[0]
    }
  ];

  for (let i = 0; i < invalidSLAs.length; i++) {
    try {
      await axios.post(`${BASE_URL}/api/slas`, invalidSLAs[i], { headers });
      addTestResult(`データ検証テスト ${i+1}`, false, '無効なデータが受け入れられた');
    } catch (error) {
      if (error.response?.status === 400) {
        addTestResult(`データ検証テスト ${i+1}`, true, '無効なデータが正しく拒否された');
      } else {
        addTestResult(`データ検証テスト ${i+1}`, false, `予期しないエラー: ${error.response?.status}`);
      }
    }
  }
}

async function generateTestReport() {
  console.log('\n📊 テストレポート生成中...');

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const successRate = Math.round((passedTests / totalTests) * 100);

  const report = {
    summary: {
      total_tests: totalTests,
      passed: passedTests,
      failed: failedTests,
      success_rate: `${successRate}%`,
      execution_time: new Date().toISOString()
    },
    test_categories: {
      basic_operations: testResults.filter(r => r.test.includes('SLA')).length,
      advanced_features: testResults.filter(r => r.test.includes('アラート') || r.test.includes('バルク')).length,
      security: testResults.filter(r => r.test.includes('権限')).length,
      data_integrity: testResults.filter(r => r.test.includes('データ検証')).length
    },
    results: testResults
  };

  // レポートをファイルに保存
  const reportPath = path.join(__dirname, 'sla-integration-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n🎯 テスト結果サマリー');
  console.log('==================================');
  console.log(`総テスト数: ${totalTests}`);
  console.log(`成功: ${passedTests} (${successRate}%)`);
  console.log(`失敗: ${failedTests}`);
  console.log(`レポート保存先: ${reportPath}`);
  console.log('==================================');

  if (successRate >= 90) {
    console.log('🎉 SLA管理システムの統合テストが成功しました！');
  } else if (successRate >= 70) {
    console.log('⚠️ SLA管理システムは概ね正常ですが、いくつかの問題があります。');
  } else {
    console.log('❌ SLA管理システムに重大な問題があります。修正が必要です。');
  }

  return report;
}

async function runFullIntegrationTest() {
  console.log('🚀 SLA管理システム完全統合テスト開始');
  console.log(`テストサーバー: ${BASE_URL}`);
  console.log(`開始時刻: ${new Date().toISOString()}`);
  console.log('==========================================\n');

  try {
    // 1. 認証テスト
    if (!(await login())) {
      console.log('❌ 認証に失敗したため、テストを中断します。');
      return;
    }

    // 2. 基本操作テスト
    await testBasicSLAOperations();

    // 3. 高度な機能テスト
    await testAdvancedSLAFeatures();

    // 4. 権限テスト
    await testPermissions();

    // 5. データ整合性テスト
    await testDataIntegrity();

    // 6. レポート生成
    const report = await generateTestReport();

    return report;

  } catch (error) {
    console.error('🔥 テスト実行中に予期しないエラーが発生しました:', error);
    addTestResult('テスト実行', false, `予期しないエラー: ${error.message}`);
  }
}

// テスト実行
if (require.main === module) {
  runFullIntegrationTest()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runFullIntegrationTest };