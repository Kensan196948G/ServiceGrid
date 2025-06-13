# ITSM Platform テスト戦略

## 概要

ITSM Platformのテスト戦略は、品質保証と継続的な改善を目的とした包括的なアプローチです。
tmux並列開発環境における効率的なテスト実行と、自動化による品質維持を実現します。

## テスト戦略の基本方針

### 1. テストピラミッド

```
        /\
       /  \
      /E2E \      少数・高価値
     /______\
    /        \
   /Integration\   中程度・重要パス
  /__________\
 /            \
/  Unit Tests  \    多数・高速・安価
/______________\
```

### 2. テストレベル

| レベル | 目的 | 実行環境 | 自動化レベル |
|--------|------|----------|-------------|
| **単体テスト** | 個別機能の検証 | 開発環境 | 100%自動化 |
| **統合テスト** | コンポーネント間連携 | CI環境 | 100%自動化 |
| **システムテスト** | 全体機能検証 | ステージング | 90%自動化 |
| **受入テスト** | ビジネス要件検証 | 本番同等環境 | 70%自動化 |

## 並列開発環境でのテスト分担

### Feature-A（統合リーダー）
- **責務**: テスト戦略統括、品質メトリクス監視
- **実行内容**:
  - 全体テスト結果の統合
  - テストカバレッジ監視
  - 品質ゲートの実行

### Feature-B（UI/テスト）
- **責務**: フロントエンドテスト、UI/UXテスト
- **実行内容**:
  - React コンポーネント単体テスト
  - ユーザーインタラクションテスト
  - アクセシビリティテスト

### Feature-C（API開発）
- **責務**: バックエンドテスト、API統合テスト
- **実行内容**:
  - REST API単体テスト
  - API統合テスト
  - データベーステスト

### Feature-D（PowerShell）
- **責務**: PowerShell環境テスト、Windows統合テスト
- **実行内容**:
  - PowerShell スクリプトテスト
  - Windows環境統合テスト
  - 外部システム連携テスト

### Feature-E（非機能要件）
- **責務**: 非機能テスト、セキュリティテスト
- **実行内容**:
  - パフォーマンステスト
  - セキュリティテスト
  - 運用監視テスト

## テスト技術・ツール

### フロントエンドテスト

#### 単体テスト
```typescript
// Jest + React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetPage } from '../AssetPage';

describe('AssetPage', () => {
  test('displays asset list', () => {
    render(<AssetPage />);
    expect(screen.getByText('資産一覧')).toBeInTheDocument();
  });
  
  test('handles asset creation', async () => {
    render(<AssetPage />);
    fireEvent.click(screen.getByText('新規作成'));
    // アサーション...
  });
});
```

#### 統合テスト
```typescript
// MSW (Mock Service Worker) を使用
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/assets', (req, res, ctx) => {
    return res(ctx.json([
      { id: 1, name: 'Test Asset', status: 'Active' }
    ]));
  })
);
```

### バックエンドテスト

#### API単体テスト
```javascript
// Jest + Supertest
const request = require('supertest');
const app = require('../app');

describe('Assets API', () => {
  test('GET /api/assets returns asset list', async () => {
    const response = await request(app)
      .get('/api/assets')
      .expect(200);
    
    expect(response.body).toHaveLength(0);
  });
  
  test('POST /api/assets creates new asset', async () => {
    const assetData = {
      name: 'Test Asset',
      category: 'Hardware',
      type: 'Server'
    };
    
    await request(app)
      .post('/api/assets')
      .send(assetData)
      .expect(201);
  });
});
```

#### データベーステスト
```javascript
// SQLite テストデータベース
const Database = require('better-sqlite3');
const path = require('path');

describe('Database Operations', () => {
  let db;
  
  beforeEach(() => {
    db = new Database(':memory:');
    // スキーマ作成
    db.exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
  });
  
  afterEach(() => {
    db.close();
  });
  
  test('creates asset with auto-generated tag', () => {
    const stmt = db.prepare(`
      INSERT INTO assets (name, category, type) 
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run('Test Server', 'Hardware', 'Server');
    expect(result.changes).toBe(1);
  });
});
```

### PowerShellテスト

#### Pester テスト
```powershell
# Test-APIs.Tests.ps1
Describe "ITSM PowerShell APIs" {
    Context "Asset Management API" {
        It "Should return asset list" {
            $result = & .\api\Assets.ps1 -Action "GetAll"
            $result | Should -Not -BeNullOrEmpty
            $result.Count | Should -BeGreaterOrEqual 0
        }
        
        It "Should create new asset" {
            $assetData = @{
                Name = "Test Asset"
                Category = "Hardware"
                Type = "Server"
            }
            
            $result = & .\api\Assets.ps1 -Action "Create" -Data $assetData
            $result.Success | Should -Be $true
        }
    }
    
    Context "Database Connection" {
        It "Should connect to SQLite database" {
            { Import-Module .\modules\DBUtil.psm1 } | Should -Not -Throw
            
            $connection = Connect-ITSMDatabase
            $connection | Should -Not -BeNullOrEmpty
        }
    }
}
```

## テスト自動化戦略

### CI/CDパイプライン統合

```yaml
# GitHub Actions / Azure DevOps Pipeline
name: ITSM Platform CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Setup PowerShell
      uses: azure/powershell@v1
      with:
        inlineScript: |
          Install-Module -Name Pester -Force
    
    - name: Install Dependencies
      run: |
        npm ci
        cd backend && npm ci
    
    - name: Run Frontend Tests
      run: npm run test:ci
    
    - name: Run Backend Tests
      run: cd backend && npm test
    
    - name: Run PowerShell Tests
      run: cd backend/test && pwsh -c "Invoke-Pester"
    
    - name: Run Integration Tests
      run: ./tmux/tools/test-runner.sh
    
    - name: Code Quality Check
      run: ./tmux/tools/lint-checker.sh
    
    - name: Build Validation
      run: ./tmux/tools/build-validator.sh
```

### テスト環境管理

#### 並列テスト実行
```bash
#!/bin/bash
# parallel-test-runner.sh

# Feature別並列テスト実行
run_feature_tests() {
    local feature=$1
    
    case $feature in
        "ui")
            echo "Running UI Tests..."
            npm run test:ui -- --watchAll=false
            ;;
        "api")
            echo "Running API Tests..."
            cd backend && npm test
            ;;
        "powershell")
            echo "Running PowerShell Tests..."
            cd backend/test && ./run-tests.sh
            ;;
        "integration")
            echo "Running Integration Tests..."
            ./tools/test-runner.sh
            ;;
    esac
}

# 並列実行
run_feature_tests "ui" &
run_feature_tests "api" &
run_feature_tests "powershell" &

# 全テスト完了待機
wait

# 統合テスト実行
run_feature_tests "integration"
```

## パフォーマンステスト

### フロントエンドパフォーマンス
```javascript
// Lighthouse CI
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3001'],
      startServerCommand: 'npm run serve',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['warn', {minScore: 0.8}],
        'categories:seo': ['warn', {minScore: 0.8}],
      },
    },
  },
};
```

### API パフォーマンステスト
```javascript
// Artillery.js
config:
  target: 'http://localhost:8082'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: "Asset Management API"
    weight: 70
    flow:
      - get:
          url: "/api/assets"
      - post:
          url: "/api/assets"
          json:
            name: "Test Asset {{ $randomString() }}"
            category: "Hardware"
            type: "Server"

  - name: "Authentication API"
    weight: 30
    flow:
      - post:
          url: "/api/auth/login"
          json:
            username: "admin"
            password: "admin123"
```

## セキュリティテスト

### OWASP Top 10 対応

| 脆弱性 | テスト方法 | 自動化レベル |
|--------|------------|-------------|
| **インジェクション** | SQLマップ、手動テスト | 80% |
| **認証の不備** | 自動テスト、ペネトレーション | 90% |
| **センシティブデータ露出** | 静的解析、設定レビュー | 70% |
| **XXE** | 自動スキャン、手動検証 | 85% |
| **アクセス制御の不備** | 自動テスト、手動検証 | 90% |
| **セキュリティ設定ミス** | 設定監査、自動スキャン | 95% |
| **XSS** | 自動スキャン、手動テスト | 85% |
| **安全でないデシリアライゼーション** | 静的解析、手動レビュー | 60% |
| **既知の脆弱性** | 依存関係スキャン | 100% |
| **不十分なログと監視** | 設定レビュー、手動確認 | 70% |

### セキュリティテスト自動化
```javascript
// OWASP ZAP Automation
const zapClient = require('zaproxy');

describe('Security Tests', () => {
  let zap;
  
  beforeAll(async () => {
    zap = new zapClient({
      proxy: 'http://localhost:8080'
    });
    await zap.spider.scan('http://localhost:3001');
  });
  
  test('should not have high risk vulnerabilities', async () => {
    const alerts = await zap.core.alerts('High');
    expect(alerts).toHaveLength(0);
  });
  
  test('should not have SQL injection vulnerabilities', async () => {
    await zap.ascan.scan('http://localhost:8082/api');
    const sqlAlerts = await zap.core.alerts('High', 'http://localhost:8082', 'SQL Injection');
    expect(sqlAlerts).toHaveLength(0);
  });
});
```

## テストデータ管理

### テストデータ戦略

#### 1. データセットの分類
- **基本データセット**: 最小限の機能テスト用
- **包括データセット**: 全機能テスト用
- **パフォーマンスデータセット**: 負荷テスト用
- **エラーデータセット**: 異常系テスト用

#### 2. データ生成
```javascript
// Test Data Factory
class TestDataFactory {
  static createAsset(overrides = {}) {
    return {
      asset_tag: `TST-${Math.floor(Math.random() * 10000)}`,
      name: `Test Asset ${Math.floor(Math.random() * 1000)}`,
      category: 'Hardware',
      type: 'Server',
      status: 'Active',
      owner_id: 1,
      location: 'Test Lab',
      ...overrides
    };
  }
  
  static createIncident(overrides = {}) {
    return {
      title: `Test Incident ${Date.now()}`,
      description: 'This is a test incident',
      priority: 'Medium',
      status: 'Open',
      reported_by: 1,
      assigned_to: 2,
      ...overrides
    };
  }
}
```

#### 3. データベース初期化
```sql
-- test-data.sql
INSERT INTO users (username, password_hash, email, role) VALUES
  ('testuser1', '$2b$10$hash1', 'test1@example.com', 'user'),
  ('testuser2', '$2b$10$hash2', 'test2@example.com', 'operator'),
  ('testadmin', '$2b$10$hash3', 'admin@example.com', 'administrator');

INSERT INTO assets (asset_tag, name, category, type, status, owner_id) VALUES
  ('TST-001', 'Test Server 1', 'Hardware', 'Server', 'Active', 1),
  ('TST-002', 'Test Laptop 1', 'Hardware', 'Laptop', 'Active', 2),
  ('TST-003', 'Test Software 1', 'Software', 'Application', 'Active', 1);
```

## テスト監視・レポート

### テストメトリクス

| メトリクス | 目標値 | 測定方法 |
|-----------|--------|----------|
| **テスト実行時間** | < 10分 | CI/CDパイプライン |
| **テストカバレッジ** | > 80% | Jest、Nyc |
| **テスト成功率** | > 95% | テスト結果集計 |
| **回帰テスト検出率** | > 90% | 手動追跡 |

### レポート自動生成
```javascript
// test-reporter.js
const fs = require('fs');
const path = require('path');

class TestReporter {
  static generateReport(testResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: testResults.numTotalTests,
        passed: testResults.numPassedTests,
        failed: testResults.numFailedTests,
        coverage: testResults.coverageMap
      },
      details: testResults.testResults
    };
    
    // Markdown レポート生成
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync('test-report.md', markdown);
    
    // JSON レポート生成
    fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  }
  
  static generateMarkdownReport(report) {
    return `
# テスト実行レポート

## 実行日時
${report.timestamp}

## サマリー
- 総テスト数: ${report.summary.total}
- 成功: ${report.summary.passed}
- 失敗: ${report.summary.failed}
- カバレッジ: ${Math.round(report.summary.coverage.global.lines.pct)}%

## 詳細結果
${report.details.map(test => `
### ${test.testFilePath}
- 実行時間: ${test.perfStats.runtime}ms
- テスト数: ${test.numPassingTests + test.numFailingTests}
- 成功率: ${Math.round(test.numPassingTests / (test.numPassingTests + test.numFailingTests) * 100)}%
`).join('')}
    `;
  }
}
```

## 継続的改善

### テスト戦略の進化

1. **月次レビュー**: テストメトリクスの評価
2. **四半期改善**: テスト戦略の見直し
3. **年次計画**: 新技術導入の検討

### 技術負債管理

- **テスト負債の可視化**: 未テスト機能の追跡
- **リファクタリング**: テストコードの改善
- **知識共有**: テストノウハウの文書化

## トラブルシューティング

### よくあるテスト問題

#### 1. フレイキーテスト
**原因**: 非同期処理、外部依存、タイミング問題
**対策**: 
- モック・スタブの活用
- 適切な待機処理
- 独立性の確保

#### 2. テスト実行時間の増加
**原因**: テスト数の増加、重複テスト
**対策**:
- 並列実行
- テストの分類・最適化
- 不要テストの削除

#### 3. 環境依存のテスト失敗
**原因**: 環境設定の違い、データ不整合
**対策**:
- コンテナ化
- 環境変数の統一
- セットアップ・ティアダウンの改善

---

**更新日**: 2025年6月14日  
**バージョン**: v1.0  
**作成者**: Claude Code AI Assistant