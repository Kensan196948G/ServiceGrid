// ヘルスチェック用スクリプト
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 8082,
  path: '/api/health',
  timeout: 2000,
  method: 'GET'
};

const healthCheck = http.request(options, (res) => {
  console.log(`ヘルスチェック応答: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

healthCheck.on('error', (err) => {
  console.error('ヘルスチェックエラー:', err.message);
  process.exit(1);
});

healthCheck.on('timeout', () => {
  console.error('ヘルスチェックタイムアウト');
  healthCheck.destroy();
  process.exit(1);
});

healthCheck.end();