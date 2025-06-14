// メトリクス収集ミドルウェア
const os = require('os');

// メトリクス収集用のカウンター
let metrics = {
  requests: {
    total: 0,
    errors: 0,
    by_method: {},
    by_status: {},
    by_endpoint: {}
  },
  system: {
    start_time: Date.now(),
    uptime: 0,
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0
  },
  database: {
    connections: 0,
    queries: 0,
    errors: 0
  },
  response_times: []
};

// システムメトリクス収集関数
function collectSystemMetrics() {
  metrics.system.uptime = Date.now() - metrics.system.start_time;
  
  // CPU使用率（簡易計算）
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  metrics.system.cpu_usage = Math.round((1 - totalIdle / totalTick) * 100);
  
  // メモリ使用率
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  metrics.system.memory_usage = Math.round(((totalMem - freeMem) / totalMem) * 100);
}

// Prometheusメトリクス形式でエクスポート
function exportPrometheusMetrics() {
  collectSystemMetrics();
  
  let output = '';
  
  // HTTPリクエスト総数
  output += `# HELP http_requests_total Total number of HTTP requests\n`;
  output += `# TYPE http_requests_total counter\n`;
  output += `http_requests_total ${metrics.requests.total}\n\n`;
  
  // HTTPエラー総数
  output += `# HELP http_requests_errors_total Total number of HTTP errors\n`;
  output += `# TYPE http_requests_errors_total counter\n`;
  output += `http_requests_errors_total ${metrics.requests.errors}\n\n`;
  
  // メソッド別リクエスト数
  output += `# HELP http_requests_by_method HTTP requests by method\n`;
  output += `# TYPE http_requests_by_method counter\n`;
  for (const [method, count] of Object.entries(metrics.requests.by_method)) {
    output += `http_requests_by_method{method="${method}"} ${count}\n`;
  }
  output += '\n';
  
  // ステータス別リクエスト数
  output += `# HELP http_requests_by_status HTTP requests by status\n`;
  output += `# TYPE http_requests_by_status counter\n`;
  for (const [status, count] of Object.entries(metrics.requests.by_status)) {
    output += `http_requests_by_status{status="${status}"} ${count}\n`;
  }
  output += '\n';
  
  // レスポンス時間（ヒストグラム風）
  if (metrics.response_times.length > 0) {
    const sorted = [...metrics.response_times].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    output += `# HELP http_request_duration_seconds HTTP request duration in seconds\n`;
    output += `# TYPE http_request_duration_seconds histogram\n`;
    output += `http_request_duration_seconds{quantile="0.5"} ${p50 / 1000}\n`;
    output += `http_request_duration_seconds{quantile="0.95"} ${p95 / 1000}\n`;
    output += `http_request_duration_seconds{quantile="0.99"} ${p99 / 1000}\n\n`;
  }
  
  // システムメトリクス
  output += `# HELP system_cpu_usage_percent System CPU usage percentage\n`;
  output += `# TYPE system_cpu_usage_percent gauge\n`;
  output += `system_cpu_usage_percent ${metrics.system.cpu_usage}\n\n`;
  
  output += `# HELP system_memory_usage_percent System memory usage percentage\n`;
  output += `# TYPE system_memory_usage_percent gauge\n`;
  output += `system_memory_usage_percent ${metrics.system.memory_usage}\n\n`;
  
  output += `# HELP system_uptime_seconds System uptime in seconds\n`;
  output += `# TYPE system_uptime_seconds counter\n`;
  output += `system_uptime_seconds ${Math.floor(metrics.system.uptime / 1000)}\n\n`;
  
  // サービス稼働状態
  output += `# HELP up Service up status (1 = up, 0 = down)\n`;
  output += `# TYPE up gauge\n`;
  output += `up 1\n\n`;
  
  return output;
}

// リクエスト監視ミドルウェア
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // リクエスト数をカウント
  metrics.requests.total++;
  
  // メソッド別カウント
  if (!metrics.requests.by_method[req.method]) {
    metrics.requests.by_method[req.method] = 0;
  }
  metrics.requests.by_method[req.method]++;
  
  // エンドポイント別カウント
  const endpoint = req.route ? req.route.path : req.path;
  if (!metrics.requests.by_endpoint[endpoint]) {
    metrics.requests.by_endpoint[endpoint] = 0;
  }
  metrics.requests.by_endpoint[endpoint]++;
  
  // レスポンス処理
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // レスポンス時間を記録
    metrics.response_times.push(responseTime);
    
    // 古いレスポンス時間データを削除（最大1000件保持）
    if (metrics.response_times.length > 1000) {
      metrics.response_times = metrics.response_times.slice(-1000);
    }
    
    // ステータス別カウント
    if (!metrics.requests.by_status[res.statusCode]) {
      metrics.requests.by_status[res.statusCode] = 0;
    }
    metrics.requests.by_status[res.statusCode]++;
    
    // エラーカウント
    if (res.statusCode >= 400) {
      metrics.requests.errors++;
    }
    
    originalSend.call(this, data);
  };
  
  next();
}

// メトリクス取得用のエンドポイントハンドラー
function getMetrics(req, res) {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(exportPrometheusMetrics());
}

// JSON形式でのメトリクス取得
function getMetricsJSON(req, res) {
  collectSystemMetrics();
  res.json({
    timestamp: new Date().toISOString(),
    requests: metrics.requests,
    system: {
      ...metrics.system,
      uptime_seconds: Math.floor(metrics.system.uptime / 1000),
      platform: os.platform(),
      arch: os.arch(),
      node_version: process.version,
      total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
      free_memory_mb: Math.round(os.freemem() / 1024 / 1024),
      load_average: os.loadavg()
    },
    database: metrics.database
  });
}

// データベースメトリクス記録用関数
function recordDatabaseQuery(success = true) {
  metrics.database.queries++;
  if (!success) {
    metrics.database.errors++;
  }
}

function recordDatabaseConnection() {
  metrics.database.connections++;
}

module.exports = {
  metricsMiddleware,
  getMetrics,
  getMetricsJSON,
  recordDatabaseQuery,
  recordDatabaseConnection,
  getMetricsData: () => metrics
};