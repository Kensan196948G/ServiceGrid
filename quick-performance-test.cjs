#!/usr/bin/env node

/**
 * 簡単なパフォーマンステスト
 */

const { performance } = require('perf_hooks');
const os = require('os');
const fs = require('fs');

async function quickTest() {
    console.log('🚀 簡単パフォーマンステスト開始');
    console.log('='.repeat(50));

    const results = {
        timestamp: new Date().toISOString(),
        systemInfo: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
            freeMemory: Math.round(os.freemem() / 1024 / 1024) + ' MB',
            cpuCount: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown'
        },
        tests: {}
    };

    // 1. Node.js パフォーマンステスト
    console.log('\n📊 Node.js パフォーマンス:');
    
    const startMem = process.memoryUsage();
    const startTime = performance.now();
    
    // CPU集約的なタスク
    for (let i = 0; i < 1000000; i++) {
        Math.sqrt(i);
    }
    
    const endTime = performance.now();
    const endMem = process.memoryUsage();
    
    results.tests.nodePerformance = {
        computationTime: Math.round(endTime - startTime),
        memoryUsage: {
            rss: Math.round(endMem.rss / 1024 / 1024),
            heapUsed: Math.round(endMem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(endMem.heapTotal / 1024 / 1024)
        }
    };

    console.log(`  ✅ 計算時間: ${Math.round(endTime - startTime)}ms`);
    console.log(`  📈 RSS メモリ: ${Math.round(endMem.rss / 1024 / 1024)}MB`);
    console.log(`  🧠 ヒープ使用量: ${Math.round(endMem.heapUsed / 1024 / 1024)}MB`);

    // 2. ファイルシステムパフォーマンス
    console.log('\n📁 ファイルシステムパフォーマンス:');
    
    const fileTestStart = performance.now();
    const testData = 'A'.repeat(1024 * 100); // 100KB のテストデータ
    
    fs.writeFileSync('./test-file.tmp', testData);
    const readData = fs.readFileSync('./test-file.tmp', 'utf8');
    fs.unlinkSync('./test-file.tmp');
    
    const fileTestEnd = performance.now();
    
    results.tests.fileSystemPerformance = {
        testDataSize: testData.length,
        totalTime: Math.round(fileTestEnd - fileTestStart),
        throughput: Math.round(testData.length / (fileTestEnd - fileTestStart) * 1000) + ' bytes/sec'
    };

    console.log(`  ✅ 100KB ファイル読み書き: ${Math.round(fileTestEnd - fileTestStart)}ms`);
    console.log(`  📊 スループット: ${Math.round(testData.length / (fileTestEnd - fileTestStart) * 1000)} bytes/sec`);

    // 3. プロジェクト固有の分析
    console.log('\n📦 プロジェクト分析:');
    
    try {
        // package.json分析
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const deps = Object.keys(packageJson.dependencies || {});
        const devDeps = Object.keys(packageJson.devDependencies || {});
        
        results.tests.projectAnalysis = {
            dependencies: deps.length,
            devDependencies: devDeps.length,
            totalDependencies: deps.length + devDeps.length,
            scripts: Object.keys(packageJson.scripts || {}).length
        };

        console.log(`  📚 本番依存関係: ${deps.length}個`);
        console.log(`  🔧 開発依存関係: ${devDeps.length}個`);
        console.log(`  📋 NPMスクリプト: ${Object.keys(packageJson.scripts || {}).length}個`);

        // ソースコード分析
        if (fs.existsSync('./src')) {
            const srcFiles = countFiles('./src', ['.ts', '.tsx', '.js', '.jsx']);
            results.tests.projectAnalysis.sourceFiles = srcFiles;
            console.log(`  📄 ソースファイル数: ${srcFiles}個`);
        }

        // バックエンドファイル分析
        if (fs.existsSync('./backend')) {
            const backendFiles = countFiles('./backend', ['.js', '.ts', '.ps1']);
            results.tests.projectAnalysis.backendFiles = backendFiles;
            console.log(`  🖥️ バックエンドファイル数: ${backendFiles}個`);
        }

    } catch (error) {
        console.log(`  ❌ プロジェクト分析エラー: ${error.message}`);
        results.tests.projectAnalysis = { error: error.message };
    }

    // 4. 基本的な最適化提案
    console.log('\n💡 最適化提案:');
    const recommendations = generateRecommendations(results);
    results.recommendations = recommendations;

    recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.severity === 'High' ? '🔴' : rec.severity === 'Medium' ? '🟡' : '🟢'} ${rec.issue}`);
        console.log(`     ${rec.recommendation}`);
    });

    // 結果を保存
    const reportPath = `./quick-performance-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log('\n✅ 簡単パフォーマンステスト完了');
    console.log(`📊 詳細レポート: ${reportPath}`);

    return results;
}

function countFiles(dir, extensions) {
    let count = 0;
    
    function scanDir(currentDir) {
        try {
            const items = fs.readdirSync(currentDir);
            items.forEach(item => {
                const fullPath = require('path').join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (extensions.some(ext => item.endsWith(ext))) {
                    count++;
                }
            });
        } catch (error) {
            // アクセスできないディレクトリは無視
        }
    }
    
    scanDir(dir);
    return count;
}

function generateRecommendations(results) {
    const recommendations = [];
    
    // メモリ使用量チェック
    if (results.tests.nodePerformance?.memoryUsage.rss > 200) {
        recommendations.push({
            severity: 'Medium',
            issue: `メモリ使用量が ${results.tests.nodePerformance.memoryUsage.rss}MB と高い`,
            recommendation: 'メモリリークの確認、不要なオブジェクトの削除を検討してください'
        });
    }

    // 依存関係チェック
    if (results.tests.projectAnalysis?.totalDependencies > 40) {
        recommendations.push({
            severity: 'Low',
            issue: `依存関係が ${results.tests.projectAnalysis.totalDependencies}個と多い`,
            recommendation: '不要な依存関係の削除、軽量な代替パッケージの検討をお勧めします'
        });
    }

    // 計算パフォーマンスチェック
    if (results.tests.nodePerformance?.computationTime > 100) {
        recommendations.push({
            severity: 'Medium',
            issue: `計算処理が ${results.tests.nodePerformance.computationTime}ms と遅い`,
            recommendation: 'CPU集約的な処理の最適化、ワーカースレッドの活用を検討してください'
        });
    }

    // ファイルシステムパフォーマンスチェック
    if (results.tests.fileSystemPerformance?.totalTime > 100) {
        recommendations.push({
            severity: 'Low',
            issue: `ファイルI/Oが ${results.tests.fileSystemPerformance.totalTime}ms`,
            recommendation: 'ファイル操作の最適化、キャッシュ活用を検討してください'
        });
    }

    // 一般的な提案
    recommendations.push({
        severity: 'Low',
        issue: 'パフォーマンス継続監視',
        recommendation: '定期的なパフォーマンステスト、プロファイリングツールの活用をお勧めします'
    });

    return recommendations;
}

// メイン実行
if (require.main === module) {
    quickTest().catch(error => {
        console.error('❌ テスト実行エラー:', error);
        process.exit(1);
    });
}

module.exports = { quickTest };