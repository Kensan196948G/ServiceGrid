const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

const PORT = 3001;

// ポート使用状況チェック関数
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close(() => resolve(false));
    });
    server.on('error', () => resolve(true));
  });
}

// ポート強制解放関数
function forceKillPort(port) {
  return new Promise((resolve) => {
    exec(`pkill -f "${port}" && sleep 2`, (error) => {
      resolve();
    });
  });
}

// 自動ポート解放とリトライ機能
async function startServerWithRetry() {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    const inUse = await checkPortInUse(PORT);
    if (!inUse) {
      startServer();
      return;
    }
    console.log(`⚠️  ポート ${PORT} が使用中です - 強制解放中... (試行: ${i + 1})`);
    await forceKillPort(PORT);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  console.log(`❌ ポート ${PORT} の解放に失敗しました`);
  process.exit(1);
}

function startServer() {

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // APIプロキシ
  if (pathname.startsWith('/api/')) {
    console.log(`🔄 Proxying: ${req.method} ${pathname}`);
    
    // リクエストボディを収集
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      const options = {
        hostname: 'localhost',
        port: 8082,
        path: pathname + (parsedUrl.search || ''),
        method: req.method,
        headers: {
          ...req.headers,
          'host': 'localhost:8082'
        }
      };
      
      console.log('🔍 Headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
      
      const proxyReq = http.request(options, (proxyRes) => {
        console.log(`✅ Backend response: ${proxyRes.statusCode}`);
        
        // CORSヘッダーを追加
        const responseHeaders = {
          ...proxyRes.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        };
        
        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
      });
      
      proxyReq.on('error', (err) => {
        console.error('❌ Proxy error:', err);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Proxy error', details: err.message}));
      });
      
      if (body && req.method !== 'GET' && req.method !== 'HEAD') {
        proxyReq.write(body);
      }
      proxyReq.end();
    });
    return;
  }
  
  // 静的ファイル配信
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);
  
  const ext = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  }[ext] || 'text/plain';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPAルーティングのため、見つからないパスはindex.htmlを返す
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end('Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 Frontend server running at http://localhost:${PORT}`);
  console.log(`🔄 API proxy to http://localhost:8082`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use!`);
    console.log(`💡 Try using a different port or stop other services:`);
    console.log(`   PORT=8081 npm start`);
    console.log(`   Or check: lsof -ti:${PORT} | xargs kill -9`);
  }
  throw err;
});

}

// 自動ポート解放機能付きでサーバー開始
startServerWithRetry();