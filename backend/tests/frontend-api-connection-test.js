/**
 * フロントエンド・API連携テスト
 * React環境での認証・API接続テスト
 */
const http = require('http');
const { URL } = require('url');

// APIベースURL
const API_BASE_URL = 'http://localhost:8082';

/**
 * APIテスト実行クラス
 */
class FrontendApiConnectionTest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            errors: []
        };
    }

    /**
     * HTTPリクエスト実行（Promise版）
     */
    async makeRequest(options, postData = null) {
        return new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: jsonData
                        });
                    } catch (error) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: data
                        });
                    }
                });
            });

            req.on('error', reject);

            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    /**
     * CORS設定テスト
     */
    async testCorsSettings() {
        console.log('\n🧪 Testing CORS Settings...');
        
        try {
            const options = {
                hostname: 'localhost',
                port: 8082,
                path: '/',
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://localhost:3001',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type, Authorization'
                }
            };

            const response = await this.makeRequest(options);
            
            const corsHeaders = response.headers;
            const hasOriginHeader = corsHeaders['access-control-allow-origin'];
            const hasMethodsHeader = corsHeaders['access-control-allow-methods'];
            const hasHeadersHeader = corsHeaders['access-control-allow-headers'];

            if (hasOriginHeader && hasMethodsHeader && hasHeadersHeader) {
                console.log('✅ CORS settings are properly configured');
                console.log(`   Origin: ${hasOriginHeader}`);
                console.log(`   Methods: ${hasMethodsHeader}`);
                console.log(`   Headers: ${hasHeadersHeader}`);
                this.testResults.passed++;
            } else {
                console.log('❌ CORS settings may need adjustment');
                this.testResults.failed++;
                this.testResults.errors.push('CORS headers missing or incomplete');
            }
        } catch (error) {
            console.log('❌ CORS test failed:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`CORS test error: ${error.message}`);
        }
        
        this.testResults.total++;
    }

    /**
     * 認証エンドポイントテスト
     */
    async testAuthenticationEndpoint() {
        console.log('\n🧪 Testing Authentication Endpoint...');
        
        try {
            // 正常ログインテスト
            const loginOptions = {
                hostname: 'localhost',
                port: 8082,
                path: '/api/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'http://localhost:3001'
                }
            };

            const loginData = JSON.stringify({
                username: 'admin',
                password: 'admin123'
            });

            const loginResponse = await this.makeRequest(loginOptions, loginData);

            if (loginResponse.statusCode === 200 && loginResponse.data.success) {
                console.log('✅ Authentication endpoint working correctly');
                console.log(`   Token: ${loginResponse.data.token.substring(0, 20)}...`);
                console.log(`   User Role: ${loginResponse.data.user.role}`);
                this.testResults.passed++;
                
                // 取得したトークンを保存
                this.authToken = loginResponse.data.token;
            } else {
                console.log('❌ Authentication endpoint failed');
                console.log(`   Status: ${loginResponse.statusCode}`);
                console.log(`   Response: ${JSON.stringify(loginResponse.data, null, 2)}`);
                this.testResults.failed++;
                this.testResults.errors.push('Authentication endpoint failed');
            }
        } catch (error) {
            console.log('❌ Authentication test failed:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Authentication test error: ${error.message}`);
        }
        
        this.testResults.total++;
    }

    /**
     * 保護されたAPIエンドポイントテスト
     */
    async testProtectedEndpoints() {
        console.log('\n🧪 Testing Protected API Endpoints...');
        
        const endpoints = [
            '/api/assets',
            '/api/service-requests',
            '/api/incidents',
            '/api/dashboard'
        ];

        for (const endpoint of endpoints) {
            try {
                const options = {
                    hostname: 'localhost',
                    port: 8082,
                    path: endpoint,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`,
                        'Origin': 'http://localhost:3001'
                    }
                };

                const response = await this.makeRequest(options);

                if (response.statusCode === 200) {
                    console.log(`✅ ${endpoint} - Working correctly`);
                    this.testResults.passed++;
                } else {
                    console.log(`❌ ${endpoint} - Failed (Status: ${response.statusCode})`);
                    this.testResults.failed++;
                    this.testResults.errors.push(`${endpoint} failed with status ${response.statusCode}`);
                }
            } catch (error) {
                console.log(`❌ ${endpoint} - Error: ${error.message}`);
                this.testResults.failed++;
                this.testResults.errors.push(`${endpoint} error: ${error.message}`);
            }
            
            this.testResults.total++;
        }
    }

    /**
     * フロントエンド用設定情報テスト
     */
    async testFrontendConfiguration() {
        console.log('\n🧪 Testing Frontend Configuration...');
        
        try {
            // API基本情報取得
            const options = {
                hostname: 'localhost',
                port: 8082,
                path: '/',
                method: 'GET',
                headers: {
                    'Origin': 'http://localhost:3001'
                }
            };

            const response = await this.makeRequest(options);
            
            if (response.statusCode === 200 && response.data.endpoints) {
                console.log('✅ API configuration available for frontend');
                console.log(`   Available endpoints: ${response.data.endpoints.length}`);
                console.log(`   API Version: ${response.data.version}`);
                console.log(`   Server Platform: ${response.data.platform}`);
                this.testResults.passed++;
            } else {
                console.log('❌ API configuration incomplete');
                this.testResults.failed++;
                this.testResults.errors.push('API configuration incomplete');
            }
        } catch (error) {
            console.log('❌ Frontend configuration test failed:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Frontend config test error: ${error.message}`);
        }
        
        this.testResults.total++;
    }

    /**
     * React開発環境準備確認
     */
    async checkReactEnvironment() {
        console.log('\n🧪 Checking React Environment Setup...');
        
        try {
            // フロントエンドのpackage.jsonを確認
            const fs = require('fs');
            const path = require('path');
            
            const frontendPackagePath = path.join('/mnt/e/ServiceGrid', 'package.json');
            
            if (fs.existsSync(frontendPackagePath)) {
                const packageData = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
                
                console.log('✅ Frontend package.json found');
                console.log(`   Project name: ${packageData.name}`);
                console.log(`   Version: ${packageData.version}`);
                
                // 重要な依存関係確認
                const dependencies = packageData.dependencies || {};
                const devDependencies = packageData.devDependencies || {};
                
                const requiredDeps = ['react', 'react-dom', 'axios'];
                const missingDeps = requiredDeps.filter(dep => !dependencies[dep] && !devDependencies[dep]);
                
                if (missingDeps.length === 0) {
                    console.log('✅ Required dependencies are present');
                    this.testResults.passed++;
                } else {
                    console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
                    this.testResults.failed++;
                    this.testResults.errors.push(`Missing React dependencies: ${missingDeps.join(', ')}`);
                }
            } else {
                console.log('❌ Frontend package.json not found');
                this.testResults.failed++;
                this.testResults.errors.push('Frontend package.json not found');
            }
        } catch (error) {
            console.log('❌ React environment check failed:', error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`React environment check error: ${error.message}`);
        }
        
        this.testResults.total++;
    }

    /**
     * 全テスト実行
     */
    async runAllTests() {
        console.log('🚀 Frontend-API Connection Test Started');
        console.log('=======================================');
        
        await this.testCorsSettings();
        await this.testAuthenticationEndpoint();
        
        if (this.authToken) {
            await this.testProtectedEndpoints();
        } else {
            console.log('⚠️  Skipping protected endpoints test (no auth token)');
        }
        
        await this.testFrontendConfiguration();
        await this.checkReactEnvironment();
        
        this.printSummary();
        
        return this.testResults;
    }

    /**
     * テスト結果サマリー表示
     */
    printSummary() {
        console.log('\n📊 Test Results Summary');
        console.log('=======================');
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`📈 Success Rate: ${Math.round((this.testResults.passed / this.testResults.total) * 100)}%`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n💥 Errors:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 All tests passed! Frontend-API integration is ready.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the errors above.');
        }
    }

    /**
     * フロントエンド起動手順生成
     */
    generateFrontendStartupGuide() {
        console.log('\n📋 Frontend Startup Guide');
        console.log('========================');
        console.log('1. Navigate to frontend directory:');
        console.log('   cd /mnt/e/ServiceGrid');
        console.log('');
        console.log('2. Install dependencies (if needed):');
        console.log('   npm install');
        console.log('');
        console.log('3. Start development server:');
        console.log('   npm run dev');
        console.log('   # Server will start on http://localhost:3000');
        console.log('');
        console.log('4. API Base URL for frontend configuration:');
        console.log('   VITE_API_BASE_URL=http://localhost:8082');
        console.log('');
        console.log('5. Test login credentials:');
        console.log('   Username: admin, Password: admin123');
        console.log('   Username: operator, Password: operator123');
        console.log('');
        console.log('6. Backend API is running on:');
        console.log('   http://localhost:8082');
    }
}

// メイン実行
if (require.main === module) {
    const tester = new FrontendApiConnectionTest();
    
    tester.runAllTests()
        .then(() => {
            tester.generateFrontendStartupGuide();
        })
        .catch(error => {
            console.error('Test execution failed:', error);
        });
}

module.exports = { FrontendApiConnectionTest };