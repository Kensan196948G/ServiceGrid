#!/usr/bin/env node

/**
 * フロントエンドパフォーマンステスト
 * 
 * 測定項目:
 * - バンドルサイズ分析
 * - ビルド時間測定
 * - 静的リソース分析
 * - TypeScript コンパイル時間
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class FrontendPerformanceTester {
    constructor() {
        this.projectRoot = process.cwd();
        this.results = {
            timestamp: new Date().toISOString(),
            buildPerformance: {},
            bundleAnalysis: {},
            staticAnalysis: {},
            typeScriptPerformance: {},
            recommendations: []
        };
    }

    async measureBuildTime() {
        console.log('📦 ビルド時間測定開始...');
        
        try {
            // 既存のdistディレクトリを削除
            if (fs.existsSync('./dist')) {
                await execPromise('rm -rf ./dist');
            }

            const startTime = performance.now();
            const { stdout, stderr } = await execPromise('npm run build', { 
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });
            const endTime = performance.now();

            const buildTime = endTime - startTime;

            this.results.buildPerformance = {
                buildTime: Math.round(buildTime),
                buildTimeFormatted: this.formatDuration(buildTime),
                buildOutput: stdout,
                buildErrors: stderr,
                success: true
            };

            console.log(`✅ ビルド完了: ${this.formatDuration(buildTime)}`);

        } catch (error) {
            this.results.buildPerformance = {
                buildTime: 0,
                error: error.message,
                success: false
            };
            console.log('❌ ビルドエラー:', error.message);
        }
    }

    async analyzeBundleSize() {
        console.log('📊 バンドルサイズ分析開始...');
        
        try {
            const distPath = './dist';
            if (!fs.existsSync(distPath)) {
                throw new Error('dist ディレクトリが見つかりません。先にビルドを実行してください。');
            }

            const bundleAnalysis = await this.analyzeDirectory(distPath);
            this.results.bundleAnalysis = bundleAnalysis;

            // 主要ファイルの詳細分析
            const mainFiles = await this.findMainFiles(distPath);
            this.results.bundleAnalysis.mainFiles = mainFiles;

            console.log('✅ バンドルサイズ分析完了');

        } catch (error) {
            this.results.bundleAnalysis = {
                error: error.message
            };
            console.log('❌ バンドル分析エラー:', error.message);
        }
    }

    async analyzeDirectory(dirPath) {
        const stats = await this.getDirectoryStats(dirPath);
        
        return {
            totalSize: stats.totalSize,
            totalSizeFormatted: this.formatBytes(stats.totalSize),
            fileCount: stats.fileCount,
            fileTypes: stats.fileTypes,
            largestFiles: stats.largestFiles
        };
    }

    async getDirectoryStats(dirPath) {
        const stats = {
            totalSize: 0,
            fileCount: 0,
            fileTypes: {},
            largestFiles: []
        };

        const scanDirectory = (currentPath) => {
            const items = fs.readdirSync(currentPath);
            
            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                const itemStat = fs.statSync(itemPath);
                
                if (itemStat.isDirectory()) {
                    scanDirectory(itemPath);
                } else {
                    const size = itemStat.size;
                    const ext = path.extname(item).toLowerCase();
                    
                    stats.totalSize += size;
                    stats.fileCount++;
                    
                    // ファイル種別統計
                    if (!stats.fileTypes[ext]) {
                        stats.fileTypes[ext] = { count: 0, size: 0 };
                    }
                    stats.fileTypes[ext].count++;
                    stats.fileTypes[ext].size += size;
                    
                    // 大きなファイル記録
                    stats.largestFiles.push({
                        name: path.relative(this.projectRoot, itemPath),
                        size: size,
                        sizeFormatted: this.formatBytes(size)
                    });
                }
            }
        };

        scanDirectory(dirPath);
        
        // 大きなファイル上位10件
        stats.largestFiles.sort((a, b) => b.size - a.size);
        stats.largestFiles = stats.largestFiles.slice(0, 10);

        return stats;
    }

    async findMainFiles(distPath) {
        const mainFiles = {};
        
        try {
            // index.html を探す
            const indexPath = path.join(distPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                const indexStat = fs.statSync(indexPath);
                mainFiles.indexHtml = {
                    size: indexStat.size,
                    sizeFormatted: this.formatBytes(indexStat.size)
                };
            }

            // JavaScript バンドルを探す
            const jsFiles = await this.findFilesByExtension(distPath, '.js');
            if (jsFiles.length > 0) {
                mainFiles.javascriptBundles = jsFiles.map(file => ({
                    name: path.basename(file.path),
                    size: file.size,
                    sizeFormatted: this.formatBytes(file.size)
                }));
            }

            // CSS ファイルを探す
            const cssFiles = await this.findFilesByExtension(distPath, '.css');
            if (cssFiles.length > 0) {
                mainFiles.cssFiles = cssFiles.map(file => ({
                    name: path.basename(file.path),
                    size: file.size,
                    sizeFormatted: this.formatBytes(file.size)
                }));
            }

        } catch (error) {
            mainFiles.error = error.message;
        }

        return mainFiles;
    }

    async findFilesByExtension(dirPath, extension) {
        const files = [];
        
        const scanDirectory = (currentPath) => {
            const items = fs.readdirSync(currentPath);
            
            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                const itemStat = fs.statSync(itemPath);
                
                if (itemStat.isDirectory()) {
                    scanDirectory(itemPath);
                } else if (path.extname(item).toLowerCase() === extension) {
                    files.push({
                        path: itemPath,
                        size: itemStat.size
                    });
                }
            }
        };

        scanDirectory(dirPath);
        
        // サイズ順でソート
        files.sort((a, b) => b.size - a.size);
        
        return files;
    }

    async analyzeSourceCode() {
        console.log('🔍 ソースコード分析開始...');
        
        try {
            const srcStats = await this.analyzeDirectory('./src');
            this.results.staticAnalysis = {
                sourceCode: srcStats,
                dependencies: await this.analyzeDependencies()
            };

            console.log('✅ ソースコード分析完了');

        } catch (error) {
            this.results.staticAnalysis = {
                error: error.message
            };
            console.log('❌ ソースコード分析エラー:', error.message);
        }
    }

    async analyzeDependencies() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            
            const deps = Object.keys(packageJson.dependencies || {});
            const devDeps = Object.keys(packageJson.devDependencies || {});
            
            return {
                totalDependencies: deps.length + devDeps.length,
                productionDependencies: deps.length,
                developmentDependencies: devDeps.length,
                heavyDependencies: await this.findHeavyDependencies(deps)
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async findHeavyDependencies(dependencies) {
        const heavyDeps = [];
        const knownHeavyPackages = [
            'react', 'react-dom', 'recharts', '@google/genai', 
            'typescript', 'vite', '@vitejs/plugin-react'
        ];
        
        dependencies.forEach(dep => {
            if (knownHeavyPackages.includes(dep)) {
                heavyDeps.push(dep);
            }
        });
        
        return heavyDeps;
    }

    async measureTypeScriptCompilation() {
        console.log('📝 TypeScript コンパイル時間測定...');
        
        try {
            const startTime = performance.now();
            const { stdout, stderr } = await execPromise('npm run typecheck');
            const endTime = performance.now();

            const compileTime = endTime - startTime;

            this.results.typeScriptPerformance = {
                compileTime: Math.round(compileTime),
                compileTimeFormatted: this.formatDuration(compileTime),
                output: stdout,
                errors: stderr,
                success: stderr.length === 0
            };

            console.log(`✅ TypeScript チェック完了: ${this.formatDuration(compileTime)}`);

        } catch (error) {
            this.results.typeScriptPerformance = {
                compileTime: 0,
                error: error.message,
                success: false
            };
            console.log('❌ TypeScript チェックエラー:', error.message);
        }
    }

    generateRecommendations() {
        console.log('💡 最適化提案生成...');
        
        const recommendations = [];

        // ビルド時間の分析
        if (this.results.buildPerformance.success && this.results.buildPerformance.buildTime > 30000) {
            recommendations.push({
                category: 'Build Performance',
                severity: 'Medium',
                issue: `ビルド時間が ${this.results.buildPerformance.buildTimeFormatted} と長い`,
                recommendation: 'Vite の設定最適化、不要な依存関係の削除、TypeScript設定の見直しを検討してください'
            });
        }

        // バンドルサイズの分析
        if (this.results.bundleAnalysis.totalSize > 5 * 1024 * 1024) { // 5MB
            recommendations.push({
                category: 'Bundle Size',
                severity: 'High',
                issue: `バンドルサイズが ${this.results.bundleAnalysis.totalSizeFormatted} と大きい`,
                recommendation: 'コードスプリッティング、ツリーシェイキングの最適化、重い依存関係の見直しが必要です'
            });
        } else if (this.results.bundleAnalysis.totalSize > 2 * 1024 * 1024) { // 2MB
            recommendations.push({
                category: 'Bundle Size',
                severity: 'Medium',
                issue: `バンドルサイズが ${this.results.bundleAnalysis.totalSizeFormatted}`,
                recommendation: '動的インポートやラジーローディングの実装を検討してください'
            });
        }

        // TypeScript コンパイル時間
        if (this.results.typeScriptPerformance.success && this.results.typeScriptPerformance.compileTime > 10000) {
            recommendations.push({
                category: 'TypeScript Performance',
                severity: 'Medium',
                issue: `TypeScript コンパイル時間が ${this.results.typeScriptPerformance.compileTimeFormatted}`,
                recommendation: 'tsconfig.json の最適化、型定義の整理、インクリメンタルコンパイルの活用を検討してください'
            });
        }

        // 依存関係の分析
        if (this.results.staticAnalysis.dependencies?.totalDependencies > 50) {
            recommendations.push({
                category: 'Dependencies',
                severity: 'Low',
                issue: `依存関係が ${this.results.staticAnalysis.dependencies.totalDependencies}個と多い`,
                recommendation: '不要な依存関係の削除、軽量な代替パッケージの検討をお勧めします'
            });
        }

        // パフォーマンス改善の一般的な提案
        recommendations.push({
            category: 'General Optimization',
            severity: 'Low',
            issue: 'フロントエンドパフォーマンス継続改善',
            recommendation: 'Bundle Analyzer の定期実行、Core Web Vitals の監視、PWA 対応の検討をお勧めします'
        });

        this.results.recommendations = recommendations;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(ms) {
        if (ms < 1000) return Math.round(ms) + 'ms';
        const seconds = Math.round(ms / 1000 * 10) / 10;
        return seconds + 's';
    }

    async runAllTests() {
        console.log('🎨 フロントエンドパフォーマンステスト開始');
        console.log('='.repeat(50));

        try {
            await this.measureBuildTime();
            await this.analyzeBundleSize();
            await this.analyzeSourceCode();
            await this.measureTypeScriptCompilation();
            this.generateRecommendations();

            // 結果を保存
            const reportPath = `./frontend-performance-report-${Date.now()}.json`;
            fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

            console.log('\n=== フロントエンドパフォーマンステスト完了 ===');
            console.log(`詳細レポート: ${reportPath}`);
            
            this.printSummary();

        } catch (error) {
            console.error('テスト実行中にエラーが発生しました:', error);
            this.results.error = error.message;
        }

        return this.results;
    }

    printSummary() {
        console.log('\n📊 フロントエンドパフォーマンス結果サマリー');
        console.log('='.repeat(50));

        // ビルドパフォーマンス
        if (this.results.buildPerformance.success) {
            console.log(`\n📦 ビルド時間: ${this.results.buildPerformance.buildTimeFormatted}`);
        } else {
            console.log('\n❌ ビルドエラーが発生しました');
        }

        // バンドルサイズ
        if (this.results.bundleAnalysis.totalSize) {
            console.log(`📊 バンドル合計サイズ: ${this.results.bundleAnalysis.totalSizeFormatted}`);
            console.log(`📁 ファイル数: ${this.results.bundleAnalysis.fileCount}`);
            
            if (this.results.bundleAnalysis.largestFiles?.length > 0) {
                console.log('\n📈 最大ファイル:');
                this.results.bundleAnalysis.largestFiles.slice(0, 3).forEach(file => {
                    console.log(`  • ${file.name}: ${file.sizeFormatted}`);
                });
            }
        }

        // TypeScript パフォーマンス
        if (this.results.typeScriptPerformance.success) {
            console.log(`\n📝 TypeScript チェック時間: ${this.results.typeScriptPerformance.compileTimeFormatted}`);
        }

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
    const tester = new FrontendPerformanceTester();
    tester.runAllTests().then(() => {
        console.log('\n✅ フロントエンドパフォーマンステスト完了');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ テスト実行エラー:', error);
        process.exit(1);
    });
}

module.exports = FrontendPerformanceTester;