#!/usr/bin/env node

/**
 * Enhanced API Integration Test Suite
 * 
 * Comprehensive testing for ServiceGrid ITSM Enhanced Server
 * Tests all major functionality including security, performance, and data integrity
 */

const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const CONFIG = {
  baseURL: process.env.TEST_API_URL || 'http://localhost:8082',
  timeout: 10000,
  maxRetries: 3
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  performance: []
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function banner() {
  console.log('\n' + colors.cyan + colors.bright + 
    '╔══════════════════════════════════════════════════════════════╗\n' +
    '║            ServiceGrid ITSM Enhanced API Tests              ║\n' +
    '║                  Integration Test Suite                     ║\n' +
    '╚══════════════════════════════════════════════════════════════╝' +
    colors.reset + '\n');
}

// Create axios instance with default config
const api = axios.create({
  baseURL: CONFIG.baseURL,
  timeout: CONFIG.timeout,
  validateStatus: () => true // Don't throw on HTTP errors
});

// Test helper functions
async function test(name, testFn) {
  results.total++;
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.passed++;
    results.performance.push({ test: name, duration });
    log('green', `✅ ${name} (${duration}ms)`);
  } catch (error) {
    results.failed++;
    results.errors.push({ test: name, error: error.message });
    log('red', `❌ ${name}: ${error.message}`);
  }
}

function expect(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} - Expected: ${expected}, Got: ${actual}`);
  }
}

function expectStatus(response, expectedStatus, message = '') {
  if (response.status !== expectedStatus) {
    throw new Error(`${message} - Expected status: ${expectedStatus}, Got: ${response.status} (${response.data?.error || response.statusText})`);
  }
}

function expectProperty(obj, property, message = '') {
  if (!(property in obj)) {
    throw new Error(`${message} - Missing property: ${property}`);
  }
}

// Test data
const testData = {
  validUser: {
    username: 'admin',
    password: 'admin123'
  },
  invalidUser: {
    username: 'invalid',
    password: 'wrongpassword'
  },
  asset: {
    name: `Test Asset ${crypto.randomBytes(4).toString('hex')}`,
    type: 'Server',
    status: 'Active',
    description: 'Automated test asset',
    manufacturer: 'Test Corp',
    model: 'Test Model 1',
    location: 'Test Data Center',
    department: 'IT',
    owner: 'Test Owner'
  },
  incident: {
    title: `Test Incident ${crypto.randomBytes(4).toString('hex')}`,
    description: 'Automated test incident for API validation',
    reported_by: 'Test User',
    priority: 'Medium',
    status: 'Open',
    category: 'Infrastructure'
  }
};

let authToken = null;
let testAssetId = null;
let testIncidentId = null;

// Test suites
async function testServerHealth() {
  log('blue', '\n🏥 Testing Server Health...');
  
  await test('Ping endpoint', async () => {
    const response = await api.get('/ping');
    expectStatus(response, 200);
    expect(response.data, 'pong');
  });
  
  await test('Root endpoint', async () => {
    const response = await api.get('/');
    expectStatus(response, 200);
    expectProperty(response.data, 'message');
    expectProperty(response.data, 'version');
    expectProperty(response.data, 'security_features');
  });
  
  await test('Health check endpoint', async () => {
    const response = await api.get('/api/health');
    expectStatus(response, 200);
    expectProperty(response.data, 'status');
    expectProperty(response.data, 'uptime');
    expectProperty(response.data, 'memory');
  });
  
  await test('Metrics endpoint', async () => {
    const response = await api.get('/api/metrics');
    expectStatus(response, 200);
    expectProperty(response.data, 'server');
    expectProperty(response.data, 'database');
    expectProperty(response.data, 'system');
  });
}

async function testAuthentication() {
  log('blue', '\n🔐 Testing Authentication...');
  
  await test('Login with invalid credentials', async () => {
    const response = await api.post('/api/auth/login', testData.invalidUser);
    expectStatus(response, 401);
    expectProperty(response.data, 'error');
  });
  
  await test('Login without credentials', async () => {
    const response = await api.post('/api/auth/login', {});
    expectStatus(response, 400);
  });
  
  await test('Login with valid credentials', async () => {
    const response = await api.post('/api/auth/login', testData.validUser);
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
    expectProperty(response.data.data, 'tokens');
    expectProperty(response.data.data.tokens, 'access_token');
    
    authToken = response.data.data.tokens.access_token;
  });
  
  await test('Get user profile with token', async () => {
    const response = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
    expectProperty(response.data.data, 'user');
  });
  
  await test('Access protected endpoint without token', async () => {
    const response = await api.get('/api/auth/me');
    expectStatus(response, 401);
  });
  
  await test('Access protected endpoint with invalid token', async () => {
    const response = await api.get('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid-token' }
    });
    expectStatus(response, 403);
  });
}

async function testRateLimiting() {
  log('blue', '\n🚦 Testing Rate Limiting...');
  
  await test('Rate limiting on auth endpoints', async () => {
    const promises = [];
    
    // Send 10 rapid requests to login endpoint
    for (let i = 0; i < 10; i++) {
      promises.push(api.post('/api/auth/login', testData.invalidUser));
    }
    
    const responses = await Promise.all(promises);
    
    // At least one should be rate limited
    const rateLimited = responses.some(response => response.status === 429);
    if (!rateLimited) {
      throw new Error('Expected at least one request to be rate limited');
    }
  });
}

async function testInputValidation() {
  log('blue', '\n🛡️  Testing Input Validation & Security...');
  
  await test('SQL injection protection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await api.post('/api/auth/login', {
      username: maliciousInput,
      password: 'test'
    });
    // Should be handled gracefully, not cause server error
    expect(response.status < 500, true, 'Server should handle SQL injection attempts gracefully');
  });
  
  await test('XSS protection', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const response = await api.post('/api/auth/login', {
      username: xssPayload,
      password: 'test'
    });
    // Should be sanitized and handled gracefully
    expect(response.status < 500, true, 'Server should handle XSS attempts gracefully');
  });
  
  await test('Large request body protection', async () => {
    const largePayload = 'x'.repeat(20 * 1024 * 1024); // 20MB
    const response = await api.post('/api/auth/login', {
      username: 'test',
      password: largePayload
    });
    // Should reject large payloads
    expect(response.status === 413 || response.status === 400, true, 'Should reject large request bodies');
  });
}

async function testAssetManagement() {
  log('blue', '\n📦 Testing Enhanced Assets API...');
  
  await test('Get assets without authentication', async () => {
    const response = await api.get('/api/assets');
    expectStatus(response, 401);
  });
  
  await test('Get assets with authentication', async () => {
    const response = await api.get('/api/assets', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
    expectProperty(response.data.data, 'assets');
    expectProperty(response.data.data, 'pagination');
  });
  
  await test('Get asset statistics', async () => {
    const response = await api.get('/api/assets/stats', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
  });
  
  await test('Generate asset tag', async () => {
    const response = await api.get('/api/assets/generate-tag?type=Server', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
    expectProperty(response.data.data, 'asset_tag');
    
    // Use generated tag for test asset
    testData.asset.asset_tag = response.data.data.asset_tag;
  });
  
  await test('Create asset with invalid data', async () => {
    const response = await api.post('/api/assets', {
      name: '', // Invalid empty name
      type: 'InvalidType'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 400);
  });
  
  await test('Create asset with valid data', async () => {
    const response = await api.post('/api/assets', testData.asset, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 201);
    expectProperty(response.data, 'data');
    expectProperty(response.data.data, 'asset');
    
    testAssetId = response.data.data.asset.id;
  });
  
  await test('Get specific asset', async () => {
    const response = await api.get(`/api/assets/${testAssetId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
    expectProperty(response.data.data, 'asset');
  });
  
  await test('Update asset', async () => {
    const updateData = {
      description: 'Updated description for test asset',
      status: 'Maintenance'
    };
    
    const response = await api.put(`/api/assets/${testAssetId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
  });
  
  await test('Search assets', async () => {
    const response = await api.get('/api/assets?search=Test', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
  });
  
  await test('Filter assets by status', async () => {
    const response = await api.get('/api/assets?status=Active', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
  });
}

async function testIncidentManagement() {
  log('blue', '\n🚨 Testing Incidents API...');
  
  await test('Get incidents', async () => {
    const response = await api.get('/api/incidents', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
    expectProperty(response.data, 'data');
  });
  
  await test('Create incident', async () => {
    const response = await api.post('/api/incidents', testData.incident, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 201);
    expectProperty(response.data, 'incident');
    
    testIncidentId = response.data.id;
  });
  
  await test('Get incident statistics', async () => {
    const response = await api.get('/api/incidents/stats', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expectStatus(response, 200);
  });
}

async function testErrorHandling() {
  log('blue', '\n⚠️  Testing Error Handling...');
  
  await test('404 for non-existent endpoint', async () => {
    const response = await api.get('/api/nonexistent');
    expectStatus(response, 404);
    expectProperty(response.data, 'error');
  });
  
  await test('405 for invalid method', async () => {
    const response = await api.delete('/ping');
    expect(response.status === 404 || response.status === 405, true, 'Should handle invalid methods');
  });
  
  await test('Invalid JSON handling', async () => {
    try {
      await api.post('/api/auth/login', 'invalid-json', {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      // Should handle gracefully
    }
  });
}

async function testPerformance() {
  log('blue', '\n⚡ Testing Performance...');
  
  await test('Response time under load', async () => {
    const promises = [];
    const requestCount = 20;
    
    for (let i = 0; i < requestCount; i++) {
      promises.push(api.get('/api/health'));
    }
    
    const startTime = Date.now();
    await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / requestCount;
    
    log('cyan', `   Average response time: ${avgTime}ms`);
    
    if (avgTime > 2000) {
      throw new Error(`Average response time too high: ${avgTime}ms`);
    }
  });
}

async function cleanup() {
  log('blue', '\n🧹 Cleaning up test data...');
  
  if (testAssetId && authToken) {
    await test('Delete test asset', async () => {
      const response = await api.delete(`/api/assets/${testAssetId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      // May return 200 (soft delete) or 404 (not found)
      expect(response.status < 500, true, 'Delete should not cause server error');
    });
  }
  
  if (authToken) {
    await test('Logout', async () => {
      const response = await api.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expectStatus(response, 200);
    });
  }
}

function printResults() {
  console.log('\n' + colors.bright + '📊 Test Results:' + colors.reset);
  console.log('═'.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  log('green', `Passed: ${results.passed}`);
  log('red', `Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.performance.length > 0) {
    const avgTime = results.performance.reduce((sum, test) => sum + test.duration, 0) / results.performance.length;
    console.log(`Average Test Duration: ${avgTime.toFixed(0)}ms`);
    
    const slowTests = results.performance.filter(test => test.duration > 1000);
    if (slowTests.length > 0) {
      log('yellow', '\n⚠️  Slow Tests (>1000ms):');
      slowTests.forEach(test => {
        console.log(`   ${test.test}: ${test.duration}ms`);
      });
    }
  }
  
  if (results.errors.length > 0) {
    log('red', '\n❌ Failed Tests:');
    results.errors.forEach(error => {
      console.log(`   ${error.test}: ${error.error}`);
    });
  }
  
  console.log('═'.repeat(60) + '\n');
}

async function main() {
  banner();
  
  log('blue', `🎯 Testing API at: ${CONFIG.baseURL}`);
  log('blue', `⏱️  Timeout: ${CONFIG.timeout}ms\n`);
  
  try {
    // Check if server is running
    const healthCheck = await api.get('/ping');
    if (healthCheck.status !== 200) {
      throw new Error('Server is not responding. Please start the enhanced server first.');
    }
    
    // Run test suites
    await testServerHealth();
    await testAuthentication();
    await testRateLimiting();
    await testInputValidation();
    await testAssetManagement();
    await testIncidentManagement();
    await testErrorHandling();
    await testPerformance();
    await cleanup();
    
    printResults();
    
    if (results.failed === 0) {
      log('green', '🎉 All tests passed!');
      process.exit(0);
    } else {
      log('red', '❌ Some tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    log('red', `❌ Test suite failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main();
}

module.exports = { main };