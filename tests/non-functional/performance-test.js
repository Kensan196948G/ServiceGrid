/**
 * 非機能要件パフォーマンステストスイート
 * Feature-E-NonFunc: 包括的品質評価
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PerformanceTestSuite {
  constructor(baseUrl = 'http://localhost:8082') {
    this.baseUrl = baseUrl;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        averageResponse: 0,
        maxResponse: 0,
        minResponse: Infinity
      }
    };
  }
  
  /**
   * 単一エンドポイントのパフォーマンステスト
   */
  async testEndpointPerformance(endpoint, method = 'GET', data = null, expectedTime = 200, iterations = 10) {
    console.log(`Testing ${method} ${endpoint} (${iterations} iterations)`);
    
    const times = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = Date.now();
        
        const config = {
          method,
          url: `${this.baseUrl}${endpoint}`,
          timeout: 5000
        };
        
        if (data) {
          config.data = data;
          config.headers = { 'Content-Type': 'application/json' };
        }
        
        const response = await axios(config);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        times.push(responseTime);
        successCount++;
        
        if (response.status >= 400) {
          errorCount++;
        }
        
      } catch (error) {
        errorCount++;
        console.warn(`Request ${i + 1} failed:`, error.message);
      }
    }
    
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const maxTime = times.length > 0 ? Math.max(...times) : 0;
    const minTime = times.length > 0 ? Math.min(...times) : 0;
    const successRate = (successCount / iterations) * 100;
    
    const testResult = {
      endpoint,
      method,
      iterations,
      averageTime: Math.round(avgTime),
      maxTime,
      minTime,
      successRate: Math.round(successRate),
      expectedTime,
      passed: avgTime <= expectedTime && successRate >= 95,
      details: {
        successCount,
        errorCount,
        times: times.slice(0, 5) // 最初の5回分のタイムを記録
      }
    };
    
    this.results.tests.push(testResult);
    this.updateSummary(testResult);
    
    console.log(`  Average: ${testResult.averageTime}ms | Success: ${testResult.successRate}% | ${testResult.passed ? '✅ PASS' : '❌ FAIL'}`);
    
    return testResult;
  }
  
  /**
   * 負荷テスト
   */
  async testLoadCapacity(endpoint, concurrentUsers = 50, duration = 10000) {
    console.log(`Load testing ${endpoint} with ${concurrentUsers} concurrent users for ${duration}ms`);
    
    const startTime = Date.now();
    const requests = [];
    const results = [];
    
    // 同時リクエスト開始
    for (let i = 0; i < concurrentUsers; i++) {
      const promise = this.performLoadTestRequest(endpoint, startTime, duration, i);
      requests.push(promise);
    }
    
    // すべてのリクエスト完了まで待機
    const responses = await Promise.allSettled(requests);
    
    responses.forEach((response, index) => {
      if (response.status === 'fulfilled') {
        results.push(response.value);
      } else {
        console.warn(`User ${index} failed:`, response.reason?.message);
      }
    });
    
    const totalRequests = results.reduce((sum, r) => sum + r.requestCount, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
    const avgResponseTime = results.length > 0 
      ? results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length 
      : 0;
    
    const loadTestResult = {
      endpoint,
      concurrentUsers,
      duration,
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(totalRequests / (duration / 1000)),
      passed: totalErrors / totalRequests < 0.05 && avgResponseTime < 500 // 5%エラー率、500ms以下
    };
    
    this.results.tests.push({
      ...loadTestResult,
      type: 'load_test'
    });
    
    console.log(`  RPS: ${loadTestResult.requestsPerSecond} | Error Rate: ${loadTestResult.errorRate.toFixed(2)}% | ${loadTestResult.passed ? '✅ PASS' : '❌ FAIL'}`);
    
    return loadTestResult;
  }
  
  /**
   * 負荷テスト用リクエスト実行
   */
  async performLoadTestRequest(endpoint, startTime, duration, userId) {
    const result = {
      userId,
      requestCount: 0,
      errorCount: 0,
      responseTimes: [],
      avgResponseTime: 0
    };
    
    while (Date.now() - startTime < duration) {
      try {
        const reqStartTime = Date.now();
        await axios.get(`${this.baseUrl}${endpoint}`, { timeout: 2000 });
        const reqEndTime = Date.now();
        
        result.requestCount++;
        result.responseTimes.push(reqEndTime - reqStartTime);
        
      } catch (error) {
        result.errorCount++;
      }
      
      // 小さな遅延で次のリクエスト
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    result.avgResponseTime = result.responseTimes.length > 0
      ? result.responseTimes.reduce((a, b) => a + b, 0) / result.responseTimes.length
      : 0;
    
    return result;
  }
  
  /**
   * メモリ使用量テスト
   */
  async testMemoryUsage() {
    console.log('Testing memory usage patterns');
    
    const initialMemory = process.memoryUsage();
    
    // 多数のリクエストを実行してメモリ使用量を監視
    const memorySnapshots = [initialMemory];
    
    for (let i = 0; i < 100; i++) {
      try {
        await axios.get(`${this.baseUrl}/api/health`);
        
        if (i % 10 === 0) {
          memorySnapshots.push(process.memoryUsage());
        }
      } catch (error) {
        // エラーは無視してメモリテストを継続
      }
    }
    
    const finalMemory = process.memoryUsage();
    const memoryGrowth = {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external
    };
    
    const memoryTestResult = {
      type: 'memory_test',
      initialMemory,
      finalMemory,
      memoryGrowth,
      snapshots: memorySnapshots,
      passed: memoryGrowth.heapUsed < 50 * 1024 * 1024 // 50MB以下の成長
    };
    
    this.results.tests.push(memoryTestResult);
    
    console.log(`  Memory growth: ${Math.round(memoryGrowth.heapUsed / 1024 / 1024)}MB | ${memoryTestResult.passed ? '✅ PASS' : '❌ FAIL'}`);
    
    return memoryTestResult;
  }
  
  /**
   * 統計情報更新
   */
  updateSummary(testResult) {
    this.results.summary.totalTests++;
    
    if (testResult.passed) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
    }
    
    if (testResult.averageTime) {
      const totalTime = this.results.summary.averageResponse * (this.results.summary.totalTests - 1) + testResult.averageTime;
      this.results.summary.averageResponse = Math.round(totalTime / this.results.summary.totalTests);
      
      this.results.summary.maxResponse = Math.max(this.results.summary.maxResponse, testResult.maxTime || testResult.averageTime);
      this.results.summary.minResponse = Math.min(this.results.summary.minResponse, testResult.minTime || testResult.averageTime);
    }
  }
  
  /**
   * 包括的パフォーマンステスト実行
   */
  async runFullSuite() {
    console.log('🚀 Starting comprehensive performance test suite...\n');
    
    try {
      // 基本エンドポイントのパフォーマンステスト
      await this.testEndpointPerformance('/api/health', 'GET', null, 100, 20);
      await this.testEndpointPerformance('/api/test', 'GET', null, 150, 15);
      await this.testEndpointPerformance('/api/incidents', 'GET', null, 300, 10);
      await this.testEndpointPerformance('/api/assets', 'GET', null, 400, 10);
      await this.testEndpointPerformance('/api/dashboard', 'GET', null, 500, 8);
      
      // 認証エンドポイント
      await this.testEndpointPerformance('/api/auth/login', 'POST', {
        username: 'admin',
        password: 'admin123'
      }, 300, 5);
      
      // 負荷テスト
      await this.testLoadCapacity('/api/health', 30, 5000);
      await this.testLoadCapacity('/api/test', 20, 3000);
      
      // メモリ使用量テスト
      await this.testMemoryUsage();
      
      // 結果保存
      await this.saveResults();
      
      // サマリー表示
      this.displaySummary();
      
    } catch (error) {
      console.error('Performance test suite failed:', error);
    }
  }
  
  /**
   * 結果保存
   */
  async saveResults() {
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const filename = `performance-test-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\n📊 Results saved to: ${filepath}\n`);
  }
  
  /**
   * サマリー表示
   */
  displaySummary() {
    const summary = this.results.summary;
    
    console.log('📈 PERFORMANCE TEST SUMMARY');
    console.log('================================');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`Success Rate: ${Math.round((summary.passed / summary.totalTests) * 100)}%`);
    console.log(`Average Response Time: ${summary.averageResponse}ms`);
    console.log(`Max Response Time: ${summary.maxResponse}ms`);
    console.log(`Min Response Time: ${summary.minResponse === Infinity ? 0 : summary.minResponse}ms`);
    console.log('================================\n');
    
    // 推奨事項
    if (summary.failed > 0) {
      console.log('🔧 RECOMMENDATIONS:');
      
      this.results.tests.forEach(test => {
        if (!test.passed) {
          if (test.averageTime > test.expectedTime) {
            console.log(`- ${test.endpoint}: Optimize response time (current: ${test.averageTime}ms, target: ${test.expectedTime}ms)`);
          }
          if (test.successRate < 95) {
            console.log(`- ${test.endpoint}: Improve reliability (current: ${test.successRate}%, target: 95%+)`);
          }
        }
      });
      console.log();
    }
  }
}

module.exports = PerformanceTestSuite;

// 直接実行時のテスト
if (require.main === module) {
  const testSuite = new PerformanceTestSuite();
  testSuite.runFullSuite().catch(console.error);
}