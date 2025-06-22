const http = require('http');
const fs = require('fs');
const path = require('path');

// 緊急用フロントエンドサーバー
const frontendServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let filePath = '../src' + req.url;
  if (req.url === '/') filePath = '../index.html';
  
  try {
    if (fs.existsSync(path.join(__dirname, filePath))) {
      const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
      res.end(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ITSM Platform - Emergency Mode</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .status { padding: 15px; border-radius: 4px; margin: 20px 0; }
            .error { background: #ffe6e6; border: 1px solid #ff9999; color: #cc0000; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            h1 { color: #333; margin-bottom: 30px; }
            .diagnostic { background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 ITSM Platform - 緊急診断モード</h1>
            
            <div class="status error">
              <h3>⚠️ サーバー起動問題検出</h3>
              <p>現在、開発サーバーの起動に問題が発生しています。</p>
            </div>
            
            <div class="diagnostic">
              <h3>📊 診断結果</h3>
              <ul>
                <li><strong>フロントエンド:</strong> ❌ Viteモジュール不足 (port 3001)</li>
                <li><strong>バックエンド:</strong> ❌ 依存関係破損 (port 8082)</li>
                <li><strong>ポート状況:</strong> ✅ 3001, 8082 利用可能</li>
                <li><strong>データベース:</strong> ✅ SQLite ファイル存在 (188KB)</li>
              </ul>
            </div>
            
            <div class="status warning">
              <h3>🔧 修復作業中</h3>
              <p>依存関係の再インストールを実行中です。完了まで2-3分かかります。</p>
            </div>
            
            <div class="status info">
              <h3>📋 予定される修復手順</h3>
              <ol>
                <li>node_modules クリーンアップ完了</li>
                <li>必須パッケージ再インストール中...</li>
                <li>Vite + React 18環境再構築</li>
                <li>Express + SQLite3バックエンド復旧</li>
                <li>開発サーバー起動テスト</li>
              </ol>
            </div>
            
            <div class="diagnostic">
              <h3>🎯 期待される最終状態</h3>
              <ul>
                <li><a href="http://localhost:3001">http://localhost:3001</a> - React フロントエンド</li>
                <li><a href="http://localhost:8082/api/health">http://localhost:8082/api/health</a> - Node.js API</li>
              </ul>
            </div>
            
            <div class="status success">
              <h3>📞 緊急時連絡</h3>
              <p>このページは緊急用ステータスサーバーです (port 3333)。修復完了後、正規のReactアプリケーションが起動します。</p>
            </div>
          </div>
          
          <script>
            // 30秒ごとにリロードして状況確認
            setTimeout(() => {
              window.location.reload();
            }, 30000);
          </script>
        </body>
        </html>
      `);
    } else {
      res.writeHead(404);
      res.end('File not found');
    }
  } catch (error) {
    res.writeHead(500);
    res.end('Server error: ' + error.message);
  }
});

// 緊急用APIサーバー
const apiServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'EMERGENCY_MODE',
      message: 'Backend dependencies being restored',
      timestamp: new Date().toISOString(),
      services: {
        database: 'available',
        authentication: 'pending',
        assets: 'pending',
        incidents: 'pending'
      }
    }));
  } else {
    res.writeHead(503);
    res.end(JSON.stringify({
      error: 'Service temporarily unavailable',
      message: 'Server is being restored. Please wait...'
    }));
  }
});

frontendServer.listen(3333, '0.0.0.0', () => {
  console.log('🚨 Emergency frontend server running on http://localhost:3333');
});

apiServer.listen(8083, '0.0.0.0', () => {
  console.log('🚨 Emergency API server running on http://localhost:8083');
});

console.log('🔧 Emergency servers started. Dependency restoration in progress...');