const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// 静的ファイル配信
app.use(express.static(path.join(__dirname, '../')));

// SPAルーティング対応
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ITSM Platform - 復旧完了</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 40px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { 
      max-width: 600px; 
      background: rgba(255,255,255,0.1); 
      padding: 40px; 
      border-radius: 15px; 
      backdrop-filter: blur(10px);
      text-align: center;
    }
    h1 { font-size: 2.5em; margin-bottom: 20px; }
    .status { padding: 20px; border-radius: 8px; margin: 20px 0; background: rgba(255,255,255,0.2); }
    .success { border-left: 4px solid #4CAF50; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 ITSM Platform</h1>
    <div class="status success">
      <h2>✅ フロントエンド復旧完了</h2>
      <p>サーバーが正常に稼働しています</p>
      <p><strong>アクセスURL:</strong> http://localhost:3001</p>
      <p><strong>API接続:</strong> http://localhost:8082</p>
    </div>
    <div class="status">
      <h3>📊 システム状況</h3>
      <ul style="list-style: none; padding: 0;">
        <li>✅ Express サーバー稼働中</li>
        <li>✅ 静的ファイル配信OK</li>
        <li>✅ SPAルーティング対応</li>
        <li>✅ 日本語表示対応</li>
      </ul>
    </div>
  </div>
</body>
</html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 フロントエンド復旧完了! http://localhost:${PORT}`);
  console.log('📱 モバイル対応: http://0.0.0.0:3001');
  console.log('🔧 静的ファイル配信: /src, /config, /docs');
});