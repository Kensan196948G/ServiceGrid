const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (parsedUrl.pathname === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: '✅ Emergency Backend OK',
      timestamp: new Date().toISOString(),
      version: 'emergency-1.0.0',
      message: 'Emergency backend server running successfully',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      port: 8082
    }));
  } else if (parsedUrl.pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: '✅ ServiceGrid Emergency Backend API',
      status: 'RUNNING',
      endpoints: ['/api/health'],
      note: 'Emergency backend for testing purposes'
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({
      error: 'Endpoint not found',
      available: ['/api/health', '/']
    }));
  }
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Emergency Backend Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📡 CORS enabled for all origins`);
});