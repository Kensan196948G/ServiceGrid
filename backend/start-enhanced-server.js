#!/usr/bin/env node

/**
 * Enhanced ServiceGrid ITSM Server Startup Script
 * 
 * This script handles:
 * - Environment validation
 * - Database initialization
 * - Configuration validation
 * - Performance monitoring setup
 * - Enhanced error handling
 * - Production-ready startup
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function banner() {
  console.log('\n' + colors.cyan + colors.bright + 
    '╔══════════════════════════════════════════════════════════════╗\n' +
    '║                ServiceGrid ITSM Enhanced Server             ║\n' +
    '║                     Startup Manager                         ║\n' +
    '╚══════════════════════════════════════════════════════════════╝' +
    colors.reset + '\n');
}

async function validateEnvironment() {
  colorLog('blue', '🔍 Validating environment...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    colorLog('red', `❌ Node.js version ${nodeVersion} is not supported. Please upgrade to Node.js 18 or higher.`);
    process.exit(1);
  }
  
  colorLog('green', `✅ Node.js version: ${nodeVersion}`);
  
  // Check required environment variables
  const requiredEnvVars = ['JWT_SECRET'];
  const missingVars = [];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    colorLog('yellow', '⚠️  Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    
    // Generate JWT secret if missing
    if (missingVars.includes('JWT_SECRET')) {
      const crypto = require('crypto');
      const jwtSecret = crypto.randomBytes(64).toString('hex');
      
      colorLog('yellow', '🔑 Generating JWT secret...');
      
      // Try to write to .env file
      const envPath = path.join(__dirname, '..', '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      if (!envContent.includes('JWT_SECRET=')) {
        envContent += `\nJWT_SECRET=${jwtSecret}\n`;
        fs.writeFileSync(envPath, envContent);
        colorLog('green', '✅ JWT secret generated and saved to .env file');
        
        // Set in current process
        process.env.JWT_SECRET = jwtSecret;
      }
    }
  } else {
    colorLog('green', '✅ All required environment variables are set');
  }
  
  // Display configuration
  console.log('\n📋 Configuration:');
  console.log(`   Port: ${process.env.PORT || 8082}`);
  console.log(`   Node Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Database Path: ${process.env.DB_PATH || './backend/db/itsm.sqlite'}`);
  console.log(`   Max Connections: ${process.env.DB_MAX_CONNECTIONS || 20}`);
  console.log(`   Rate Limit: ${process.env.RATE_LIMIT_MAX || 100} requests per ${(process.env.RATE_LIMIT_WINDOW_MS || 900000) / 60000} minutes`);
}

async function validateDatabase() {
  colorLog('blue', '\n🗃️  Validating database...');
  
  const dbPath = path.join(__dirname, process.env.DB_PATH || 'db/itsm.sqlite');
  const dbDir = path.dirname(dbPath);
  
  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    colorLog('yellow', '📁 Creating database directory...');
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Check if database file exists
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    colorLog('green', `✅ Database file exists (${Math.round(stats.size / 1024)}KB)`);
    
    // Basic connectivity test
    try {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          colorLog('red', `❌ Database connection failed: ${err.message}`);
          process.exit(1);
        }
      });
      
      await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"', (err, row) => {
          if (err) {
            reject(err);
          } else {
            colorLog('green', `✅ Database accessible with ${row.count} tables`);
            resolve();
          }
        });
        
        db.close();
      });
      
    } catch (error) {
      colorLog('red', `❌ Database validation failed: ${error.message}`);
      process.exit(1);
    }
    
  } else {
    colorLog('yellow', '⚠️  Database file not found - will be created on first connection');
  }
}

async function checkSystemResources() {
  colorLog('blue', '\n💻 Checking system resources...');
  
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = (usedMem / totalMem) * 100;
  
  console.log(`   Total Memory: ${Math.round(totalMem / 1024 / 1024 / 1024)}GB`);
  console.log(`   Used Memory: ${Math.round(usedMem / 1024 / 1024 / 1024)}GB (${Math.round(memUsage)}%)`);
  console.log(`   Free Memory: ${Math.round(freeMem / 1024 / 1024 / 1024)}GB`);
  console.log(`   CPU Cores: ${os.cpus().length}`);
  console.log(`   Platform: ${os.platform()} ${os.arch()}`);
  console.log(`   Load Average: ${os.loadavg().map(load => load.toFixed(2)).join(', ')}`);
  
  if (memUsage > 90) {
    colorLog('yellow', '⚠️  High memory usage detected - monitor performance');
  } else {
    colorLog('green', '✅ System resources look good');
  }
}

async function checkDependencies() {
  colorLog('blue', '\n📦 Checking dependencies...');
  
  const packagePath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    colorLog('red', '❌ package.json not found');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = Object.keys(packageJson.dependencies || {});
  
  console.log(`   Dependencies: ${dependencies.length} packages`);
  
  // Check critical dependencies
  const criticalDeps = [
    'express', 'sqlite3', 'bcrypt', 'jsonwebtoken', 
    'helmet', 'cors', 'express-rate-limit'
  ];
  
  const missing = criticalDeps.filter(dep => !dependencies.includes(dep));
  
  if (missing.length > 0) {
    colorLog('red', '❌ Missing critical dependencies:');
    missing.forEach(dep => console.log(`   - ${dep}`));
    colorLog('yellow', '💡 Run: npm install');
    process.exit(1);
  } else {
    colorLog('green', '✅ All critical dependencies available');
  }
}

async function performanceOptimization() {
  colorLog('blue', '\n⚡ Applying performance optimizations...');
  
  // Set max listeners to prevent memory leaks warning
  process.setMaxListeners(15);
  
  // Optimize garbage collection for long-running process
  if (process.env.NODE_ENV === 'production') {
    // Enable advanced GC optimizations in production
    process.env.NODE_OPTIONS = '--max-old-space-size=2048 --optimize-for-size';
  }
  
  colorLog('green', '✅ Performance optimizations applied');
}

function setupSignalHandlers() {
  colorLog('blue', '\n🛡️  Setting up signal handlers...');
  
  // Handle process termination gracefully
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  
  signals.forEach(signal => {
    process.on(signal, () => {
      colorLog('yellow', `\n🛑 Received ${signal} - initiating graceful shutdown...`);
      // The actual shutdown logic is handled by the enhanced server
    });
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    colorLog('red', `❌ Uncaught Exception: ${error.message}`);
    console.error(error.stack);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    colorLog('red', `❌ Unhandled Rejection at:`, promise, 'reason:', reason);
  });
  
  colorLog('green', '✅ Signal handlers configured');
}

async function startEnhancedServer() {
  try {
    colorLog('blue', '\n🚀 Starting ServiceGrid ITSM Enhanced Server...');
    
    // Import and start the enhanced server
    const { startServer } = require('./enhanced-server');
    await startServer();
    
  } catch (error) {
    colorLog('red', `❌ Failed to start enhanced server: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

async function main() {
  try {
    banner();
    
    // Load environment variables
    require('dotenv').config();
    
    // Validation and setup steps
    await validateEnvironment();
    await checkDependencies();
    await validateDatabase();
    await checkSystemResources();
    await performanceOptimization();
    setupSignalHandlers();
    
    // Start the server
    await startEnhancedServer();
    
  } catch (error) {
    colorLog('red', `❌ Startup failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the startup script
if (require.main === module) {
  main();
}

module.exports = { main };