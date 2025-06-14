#!/usr/bin/env node

/**
 * ITSM システム 包括的パフォーマンステスト
 * 
 * 測定項目:
 * 1. API レスポンス時間（資産管理、インシデント管理、認証API）
 * 2. データベースクエリパフォーマンス
 * 3. フロントエンドレンダリング速度
 * 4. メモリ使用量とリソース効率性
 * 5. 同時接続数の処理能力
 */

const fs = require('fs');
const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const os = require('os');
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class PerformanceTester {
    constructor() {
        this.baseUrl = 'http://localhost:8082';
        this.frontendUrl = 'http://localhost:3001';
        this.results = {
            timestamp: new Date().toISOString(),
            systemInfo: this.getSystemInfo(),
            apiTests: {},
            databaseTests: {},
            frontendTests: {},
            loadTests: {},
            resourceUsage: {},
            recommendations: []
        };
    }

    getSystemInfo() {
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
            freeMemory: Math.round(os.freemem() / 1024 / 1024) + ' MB',
            cpuCount: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            uptime: Math.round(os.uptime()) + ' seconds'
        };
    }

    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const startTime = performance.now();
            const module = url.startsWith('https') ? https : http;
            
            const req = module.request(url, {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const endTime = performance.now();
                    resolve({
                        statusCode: res.statusCode,
                        responseTime: endTime - startTime,
                        data: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', (err) => {
                const endTime = performance.now();
                reject({
                    error: err.message,
                    responseTime: endTime - startTime
                });
            });

            if (options.data) {
                req.write(JSON.stringify(options.data));
            }
            req.end();
        });
    }

    async testApiEndpoint(name, endpoint, options = {}) {
        console.log(`Testing ${name}...`);
        const iterations = options.iterations || 5;
        const results = [];

        for (let i = 0; i < iterations; i++) {
            try {
                const result = await this.makeRequest(`${this.baseUrl}${endpoint}`, options);
                results.push({
                    iteration: i + 1,
                    responseTime: result.responseTime,
                    statusCode: result.statusCode,
                    success: result.statusCode >= 200 && result.statusCode < 400
                });
            } catch (error) {
                results.push({
                    iteration: i + 1,
                    responseTime: error.responseTime || 0,
                    statusCode: 0,
                    success: false,
                    error: error.error
                });
            }
            // 少し待機
            await this.sleep(100);
        }

        const successfulResults = results.filter(r => r.success);
        const avgResponseTime = successfulResults.length > 0 
            ? successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length 
            : 0;

        return {
            endpoint,
            iterations,
            successRate: (successfulResults.length / iterations) * 100,
            averageResponseTime: Math.round(avgResponseTime * 100) / 100,
            minResponseTime: successfulResults.length > 0 ? Math.min(...successfulResults.map(r => r.responseTime)) : 0,
            maxResponseTime: successfulResults.length > 0 ? Math.max(...successfulResults.map(r => r.responseTime)) : 0,
            results
        };
    }

    async testApiPerformance() {
        console.log('\n=== API パフォーマンステスト開始 ===');
        
        const endpoints = [
            { name: 'Health Check', endpoint: '/api/health' },
            { name: 'Assets List', endpoint: '/api/assets' },
            { name: 'Assets Stats', endpoint: '/api/assets/stats' },
            { name: 'Incidents List', endpoint: '/api/incidents' },
            { name: 'Incidents Stats', endpoint: '/api/incidents/stats' },
            { name: 'Service Requests', endpoint: '/api/service-requests' }
        ];

        for (const ep of endpoints) {
            this.results.apiTests[ep.name] = await this.testApiEndpoint(ep.name, ep.endpoint);
        }

        // 認証APIテスト
        console.log('Testing Authentication API...');
        this.results.apiTests['Authentication'] = await this.testApiEndpoint(
            'Authentication', 
            '/api/auth/login',
            {
                method: 'POST',
                data: { username: 'admin', password: 'admin123' }
            }
        );
    }

    async testDatabasePerformance() {
        console.log('\n=== データベースパフォーマンステスト開始 ===');
        
        try {
            // SQLiteデータベースファイルの確認
            const dbPath = './backend/db/itsm.sqlite';
            const dbStats = fs.statSync(dbPath);
            
            this.results.databaseTests = {
                databaseSize: Math.round(dbStats.size / 1024) + ' KB',
                lastModified: dbStats.mtime.toISOString(),
                tests: {}
            };

            // データベース操作パフォーマンステスト
            const dbTests = [
                { name: 'Assets Query', endpoint: '/api/assets?limit=100' },
                { name: 'Incidents Query', endpoint: '/api/incidents?limit=100' },
                { name: 'Assets Filter Query', endpoint: '/api/assets?type=Server' },
                { name: 'Incidents Filter Query', endpoint: '/api/incidents?status=Open' }
            ];

            for (const test of dbTests) {
                this.results.databaseTests.tests[test.name] = await this.testApiEndpoint(
                    test.name, 
                    test.endpoint,
                    { iterations: 10 }
                );
            }

        } catch (error) {
            this.results.databaseTests = {
                error: `Database test failed: ${error.message}`
            };
        }
    }

    async testFrontendPerformance() {
        console.log('\n=== フロントエンドパフォーマンステスト開始 ===');
        
        try {
            // バンドルサイズ分析
            const buildPath = './dist';
            if (fs.existsSync(buildPath)) {
                const buildStats = await this.analyzeBuildSize(buildPath);
                this.results.frontendTests.buildAnalysis = buildStats;
            }

            // フロントエンドのレンダリング速度テスト（基本的なHTTPリクエスト）
            const frontendTests = [
                { name: 'Main Page Load', endpoint: '/' },
                { name: 'Assets Page', endpoint: '/assets' },
                { name: 'Dashboard Page', endpoint: '/dashboard' }
            ];

            this.results.frontendTests.pageLoadTests = {};
            for (const test of frontendTests) {
                try {
                    const result = await this.makeRequest(`${this.frontendUrl}${test.endpoint}`);
                    this.results.frontendTests.pageLoadTests[test.name] = {
                        responseTime: result.responseTime,
                        statusCode: result.statusCode,
                        contentLength: result.data ? result.data.length : 0
                    };
                } catch (error) {
                    this.results.frontendTests.pageLoadTests[test.name] = {
                        error: error.error || 'Request failed',
                        responseTime: error.responseTime || 0
                    };
                }
            }

        } catch (error) {
            this.results.frontendTests = {
                error: `Frontend test failed: ${error.message}`
            };
        }
    }

    async analyzeBuildSize(buildPath) {
        try {
            const { stdout } = await execPromise(`du -sh ${buildPath}/*`);
            const files = stdout.split('\n').filter(line => line.trim());
            
            return {
                totalSize: files[0]?.split('\t')[0] || 'Unknown',
                fileBreakdown: files.map(line => {
                    const [size, path] = line.split('\t');
                    return { size, file: path.split('/').pop() };
                })
            };
        } catch (error) {
            return { error: `Build analysis failed: ${error.message}` };
        }
    }

    async testConcurrentConnections() {
        console.log('\n=== 同時接続数テスト開始 ===');
        
        const concurrencyLevels = [1, 5, 10, 20, 50];
        this.results.loadTests = {};

        for (const level of concurrencyLevels) {
            console.log(`Testing ${level} concurrent connections...`);
            const startTime = performance.now();
            const promises = [];

            for (let i = 0; i < level; i++) {
                promises.push(this.makeRequest(`${this.baseUrl}/api/health`));
            }

            try {
                const results = await Promise.all(promises);
                const endTime = performance.now();
                const successful = results.filter(r => r.statusCode === 200).length;

                this.results.loadTests[`${level}_concurrent`] = {
                    concurrentRequests: level,
                    totalTime: endTime - startTime,
                    successfulRequests: successful,
                    successRate: (successful / level) * 100,
                    averageResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
                };
            } catch (error) {
                this.results.loadTests[`${level}_concurrent`] = {
                    concurrentRequests: level,
                    error: error.message,
                    successRate: 0
                };
            }

            await this.sleep(1000); // 1秒待機
        }
    }

    async monitorResourceUsage() {
        console.log('\n=== システムリソース監視開始 ===');
        
        const initialMemory = process.memoryUsage();
        const initialCpuUsage = process.cpuUsage();
        
        // 負荷をかけながらリソース使用量を監視
        const monitoringPromise = new Promise((resolve) => {
            let samples = 0;
            const maxSamples = 10;
            const memoryUsage = [];
            const cpuUsage = [];

            const interval = setInterval(() => {
                const memory = process.memoryUsage();
                const cpu = process.cpuUsage();
                
                memoryUsage.push({
                    rss: Math.round(memory.rss / 1024 / 1024), // MB
                    heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
                    heapTotal: Math.round(memory.heapTotal / 1024 / 1024) // MB
                });

                cpuUsage.push({
                    user: cpu.user,
                    system: cpu.system
                });

                samples++;
                if (samples >= maxSamples) {
                    clearInterval(interval);
                    resolve({ memoryUsage, cpuUsage });
                }
            }, 500); // 500ms間隔
        });

        // 負荷をかける
        const loadPromises = [];
        for (let i = 0; i < 20; i++) {
            loadPromises.push(this.makeRequest(`${this.baseUrl}/api/assets`));
        }

        const [resourceData] = await Promise.all([monitoringPromise, Promise.all(loadPromises)]);

        this.results.resourceUsage = {
            initialMemory: {
                rss: Math.round(initialMemory.rss / 1024 / 1024),
                heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024),
                heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024)
            },
            samples: resourceData.memoryUsage,
            peakMemoryUsage: Math.max(...resourceData.memoryUsage.map(m => m.rss)),
            averageMemoryUsage: Math.round(
                resourceData.memoryUsage.reduce((sum, m) => sum + m.rss, 0) / resourceData.memoryUsage.length
            )
        };
    }

    generateRecommendations() {
        console.log('\n=== 最適化提案生成 ===');
        
        const recommendations = [];

        // API レスポンス時間の分析
        Object.entries(this.results.apiTests).forEach(([name, test]) => {
            if (test.averageResponseTime > 1000) {
                recommendations.push({
                    category: 'API Performance',
                    severity: 'High',
                    issue: `${name} の平均レスポンス時間が ${test.averageResponseTime}ms と遅い`,
                    recommendation: 'データベースクエリの最適化、インデックスの追加、キャッシュの実装を検討してください'
                });
            } else if (test.averageResponseTime > 500) {
                recommendations.push({
                    category: 'API Performance',
                    severity: 'Medium',
                    issue: `${name} の平均レスポンス時間が ${test.averageResponseTime}ms`,
                    recommendation: 'クエリ最適化やレスポンス圧縮を検討してください'
                });
            }

            if (test.successRate < 100) {
                recommendations.push({
                    category: 'API Reliability',
                    severity: 'High',
                    issue: `${name} の成功率が ${test.successRate}%`,
                    recommendation: 'エラーハンドリングの改善とログ記録の強化が必要です'
                });
            }
        });

        // メモリ使用量の分析
        if (this.results.resourceUsage.peakMemoryUsage > 500) {
            recommendations.push({
                category: 'Memory Usage',
                severity: 'Medium',
                issue: `ピークメモリ使用量が ${this.results.resourceUsage.peakMemoryUsage}MB`,
                recommendation: 'メモリリークの確認、不要なオブジェクトの削除、ガベージコレクション設定の最適化を検討してください'
            });
        }

        // 同時接続数の分析
        Object.entries(this.results.loadTests).forEach(([key, test]) => {
            if (test.successRate < 95 && test.concurrentRequests >= 20) {
                recommendations.push({
                    category: 'Concurrency',
                    severity: 'High',
                    issue: `${test.concurrentRequests}同時接続で成功率が${test.successRate}%に低下`,
                    recommendation: 'コネクションプール設定の最適化、ロードバランシングの検討、サーバー設定のチューニングが必要です'
                });
            }
        });

        // 一般的な最適化提案
        recommendations.push({
            category: 'General Optimization',
            severity: 'Low',
            issue: 'パフォーマンス継続監視',
            recommendation: 'APM（Application Performance Monitoring）ツールの導入、継続的なパフォーマンステストの自動化を検討してください'
        });

        this.results.recommendations = recommendations;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runAllTests() {
        console.log('🚀 ITSM システム 包括的パフォーマンステスト開始');
        console.log('='.repeat(60));

        try {
            await this.testApiPerformance();
            await this.testDatabasePerformance();
            await this.testFrontendPerformance();
            await this.testConcurrentConnections();
            await this.monitorResourceUsage();
            this.generateRecommendations();

            // 結果を保存
            const reportPath = `./performance-test-report-${Date.now()}.json`;
            fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

            console.log('\n=== パフォーマンステスト完了 ===');
            console.log(`詳細レポート: ${reportPath}`);
            
            this.printSummary();

        } catch (error) {
            console.error('テスト実行中にエラーが発生しました:', error);
            this.results.error = error.message;
        }

        return this.results;
    }

    printSummary() {
        console.log('\n📊 パフォーマンステスト結果サマリー');
        console.log('='.repeat(50));

        // API パフォーマンス
        console.log('\n🔗 API パフォーマンス:');
        Object.entries(this.results.apiTests).forEach(([name, test]) => {
            const status = test.successRate === 100 ? '✅' : test.successRate >= 95 ? '⚠️' : '❌';
            console.log(`  ${status} ${name}: ${test.averageResponseTime}ms (成功率: ${test.successRate}%)`);
        });

        // 同時接続テスト
        console.log('\n⚡ 同時接続テスト:');
        Object.entries(this.results.loadTests).forEach(([key, test]) => {
            const status = test.successRate === 100 ? '✅' : test.successRate >= 95 ? '⚠️' : '❌';
            console.log(`  ${status} ${test.concurrentRequests}同時接続: 成功率 ${test.successRate}%`);
        });

        // リソース使用量
        console.log('\n💾 リソース使用量:');
        console.log(`  📈 ピークメモリ: ${this.results.resourceUsage.peakMemoryUsage}MB`);
        console.log(`  📊 平均メモリ: ${this.results.resourceUsage.averageMemoryUsage}MB`);

        // 最適化提案
        console.log('\n🔧 最適化提案:');
        const highPriority = this.results.recommendations.filter(r => r.severity === 'High').length;
        const mediumPriority = this.results.recommendations.filter(r => r.severity === 'Medium').length;
        console.log(`  🔴 高優先度: ${highPriority}項目`);
        console.log(`  🟡 中優先度: ${mediumPriority}項目`);

        if (highPriority > 0) {
            console.log('\n🔴 緊急対応が必要な項目:');
            this.results.recommendations
                .filter(r => r.severity === 'High')
                .forEach(r => console.log(`    • ${r.issue}`));
        }
    }
}

// メイン実行
if (require.main === module) {
    const tester = new PerformanceTester();
    tester.runAllTests().then(() => {
        console.log('\n✅ パフォーマンステスト完了');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ テスト実行エラー:', error);
        process.exit(1);
    });
}

module.exports = PerformanceTester;