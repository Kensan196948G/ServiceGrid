/**
 * Enhanced Database Service for ServiceGrid ITSM
 * Features: Connection pooling, performance monitoring, query optimization,
 * automatic retries, health checks, and comprehensive error handling
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { logError } = require('../utils/errorHandler');

/**
 * Enhanced Database Pool with advanced features
 */
class EnhancedDatabasePool {
  constructor(options = {}) {
    this.dbPath = options.dbPath || process.env.DB_PATH || path.join(__dirname, '..', 'db', 'itsm.sqlite');
    this.maxConnections = options.maxConnections || parseInt(process.env.DB_MAX_CONNECTIONS) || 20;
    this.minConnections = options.minConnections || Math.max(2, Math.ceil(this.maxConnections / 4));
    this.acquireTimeout = options.acquireTimeout || parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000;
    this.idleTimeout = options.idleTimeout || parseInt(process.env.DB_IDLE_TIMEOUT) || 300000; // 5 minutes
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Pool state
    this.pool = [];
    this.waitingQueue = [];
    this.busyConnections = new Set();
    this.isInitialized = false;
    this.isShuttingDown = false;
    
    // Performance and health metrics
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      waitingRequests: 0,
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      slowQueries: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      connectionErrors: 0,
      retryCount: 0,
      queryCache: {
        hits: 0,
        misses: 0,
        size: 0
      }
    };
    
    // Query cache
    this.queryCache = new Map();
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
    
    // Health check interval
    this.healthCheckInterval = null;
    this.startHealthMonitoring();
  }

  /**
   * Initialize the database pool
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log(`🔄 Initializing enhanced database pool: ${this.dbPath}`);
      
      // Verify database file exists and is accessible
      await this.verifyDatabaseFile();
      
      // Create initial connections
      await this.createInitialConnections();
      
      // Start cleanup timer
      this.startCleanupTimer();
      
      this.isInitialized = true;
      console.log(`✅ Enhanced database pool initialized: ${this.pool.length}/${this.minConnections} connections`);
      
    } catch (error) {
      console.error('❌ Failed to initialize database pool:', error);
      throw error;
    }
  }

  /**
   * Verify database file exists and is accessible
   */
  async verifyDatabaseFile() {
    try {
      // Check if directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      // Check file access
      await promisify(fs.access)(this.dbPath, fs.constants.R_OK | fs.constants.W_OK);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📁 Database file not found, will be created: ${this.dbPath}`);
      } else {
        throw new Error(`Database file access error: ${error.message}`);
      }
    }
  }

  /**
   * Create initial pool connections
   */
  async createInitialConnections() {
    const promises = [];
    
    for (let i = 0; i < this.minConnections; i++) {
      promises.push(this.createConnection().catch(error => {
        console.error(`Failed to create initial connection ${i}:`, error);
        return null;
      }));
    }
    
    const connections = await Promise.all(promises);
    
    connections.forEach((connection, index) => {
      if (connection) {
        this.pool.push({
          connection,
          id: `conn-${index}`,
          created: Date.now(),
          lastUsed: Date.now(),
          totalQueries: 0,
          errors: 0
        });
      }
    });
    
    if (this.pool.length === 0) {
      throw new Error('Failed to create any database connections');
    }
  }

  /**
   * Create a new database connection with optimized settings
   */
  async createConnection() {
    return new Promise((resolve, reject) => {
      const connection = new sqlite3.Database(
        this.dbPath, 
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        (err) => {
          if (err) {
            this.metrics.connectionErrors++;
            reject(new Error(`Database connection failed: ${err.message}`));
            return;
          }
          
          // Apply performance optimizations
          this.optimizeConnection(connection)
            .then(() => {
              this.metrics.totalConnections++;
              resolve(connection);
            })
            .catch(reject);
        }
      );
      
      // Set up error handlers
      connection.on('error', (err) => {
        console.error('Database connection error:', err);
        this.metrics.connectionErrors++;
      });
    });
  }

  /**
   * Apply performance optimizations to a connection
   */
  async optimizeConnection(connection) {
    const optimizations = [
      'PRAGMA journal_mode = WAL',
      'PRAGMA synchronous = NORMAL', 
      'PRAGMA cache_size = 10000',
      'PRAGMA temp_store = MEMORY',
      'PRAGMA mmap_size = 268435456', // 256MB
      'PRAGMA page_size = 4096',
      'PRAGMA auto_vacuum = INCREMENTAL',
      'PRAGMA busy_timeout = 30000'
    ];
    
    for (const pragma of optimizations) {
      await new Promise((resolve, reject) => {
        connection.run(pragma, (err) => {
          if (err) {
            console.warn(`Warning: Failed to set ${pragma}:`, err.message);
          }
          resolve();
        });
      });
    }
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down');
    }
    
    return new Promise((resolve, reject) => {
      // Try to find an available connection
      const availableConnection = this.pool.find(item => 
        !this.busyConnections.has(item.connection) && 
        item.errors < 5 // Skip connections with too many errors
      );
      
      if (availableConnection) {
        this.busyConnections.add(availableConnection.connection);
        availableConnection.lastUsed = Date.now();
        this.metrics.activeConnections++;
        resolve(availableConnection);
        return;
      }
      
      // Create new connection if pool not at max capacity
      if (this.metrics.totalConnections < this.maxConnections) {
        this.createConnection()
          .then(connection => {
            const poolItem = {
              connection,
              id: `conn-${this.metrics.totalConnections}`,
              created: Date.now(),
              lastUsed: Date.now(),
              totalQueries: 0,
              errors: 0
            };
            
            this.pool.push(poolItem);
            this.busyConnections.add(connection);
            this.metrics.activeConnections++;
            resolve(poolItem);
          })
          .catch(reject);
        return;
      }
      
      // Add to waiting queue
      this.metrics.waitingRequests++;
      const timeout = setTimeout(() => {
        this.metrics.waitingRequests--;
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.acquireTimeout);
      
      this.waitingQueue.push({
        resolve: (poolItem) => {
          clearTimeout(timeout);
          this.metrics.waitingRequests--;
          resolve(poolItem);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.metrics.waitingRequests--;
          reject(error);
        }
      });
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(poolItem) {
    if (!poolItem || !poolItem.connection) return;
    
    const { connection } = poolItem;
    
    if (this.busyConnections.has(connection)) {
      this.busyConnections.delete(connection);
      this.metrics.activeConnections--;
      poolItem.lastUsed = Date.now();
      
      // Process waiting queue
      if (this.waitingQueue.length > 0) {
        const waiting = this.waitingQueue.shift();
        this.busyConnections.add(connection);
        this.metrics.activeConnections++;
        poolItem.lastUsed = Date.now();
        waiting.resolve(poolItem);
      }
    }
  }

  /**
   * Execute a query with performance monitoring and caching
   */
  async query(sql, params = [], options = {}) {
    const startTime = Date.now();
    const cacheKey = options.cache ? `${sql}:${JSON.stringify(params)}` : null;
    
    // Check cache first
    if (cacheKey && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        this.metrics.queryCache.hits++;
        return cached.result;
      } else {
        this.queryCache.delete(cacheKey);
      }
    }
    
    let poolItem = null;
    let attempt = 0;
    
    while (attempt < this.retryAttempts) {
      try {
        poolItem = await this.acquire();
        const result = await this.executeQuery(poolItem, sql, params);
        
        // Update metrics
        const responseTime = Date.now() - startTime;
        this.updateQueryMetrics(true, responseTime);
        poolItem.totalQueries++;
        
        // Cache result if requested
        if (cacheKey && options.cache) {
          this.cacheResult(cacheKey, result);
        }
        
        this.release(poolItem);
        return result;
        
      } catch (error) {
        if (poolItem) {
          poolItem.errors++;
          this.release(poolItem);
        }
        
        attempt++;
        this.metrics.retryCount++;
        
        if (attempt >= this.retryAttempts) {
          const responseTime = Date.now() - startTime;
          this.updateQueryMetrics(false, responseTime);
          
          logError(error, {
            sql: sql.substring(0, 100),
            params: JSON.stringify(params).substring(0, 100),
            attempt,
            responseTime
          });
          
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
  }

  /**
   * Execute query on a specific connection
   */
  executeQuery(poolItem, sql, params) {
    return new Promise((resolve, reject) => {
      const { connection } = poolItem;
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      const method = isSelect ? 'all' : 'run';
      
      connection[method](sql, params, function(err, result) {
        if (err) {
          reject(new Error(`Query failed: ${err.message}`));
          return;
        }
        
        if (method === 'run') {
          resolve({
            lastID: this.lastID,
            changes: this.changes,
            sql,
            params
          });
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(queries) {
    let poolItem = null;
    
    try {
      poolItem = await this.acquire();
      const { connection } = poolItem;
      
      return new Promise((resolve, reject) => {
        connection.serialize(() => {
          connection.run('BEGIN TRANSACTION');
          
          const results = [];
          let completed = 0;
          let hasError = false;
          
          const executeNext = (index) => {
            if (hasError || index >= queries.length) {
              if (hasError) return;
              
              connection.run('COMMIT', (err) => {
                if (err) {
                  reject(new Error(`Transaction commit failed: ${err.message}`));
                } else {
                  resolve(results);
                }
              });
              return;
            }
            
            const { sql, params } = queries[index];
            const isSelect = sql.trim().toLowerCase().startsWith('select');
            const method = isSelect ? 'all' : 'run';
            
            connection[method](sql, params || [], function(err, result) {
              if (err) {
                hasError = true;
                connection.run('ROLLBACK', () => {
                  reject(new Error(`Transaction query failed: ${err.message}`));
                });
                return;
              }
              
              results.push(method === 'run' ? {
                lastID: this.lastID,
                changes: this.changes
              } : result);
              
              executeNext(index + 1);
            });
          };
          
          executeNext(0);
        });
      });
      
    } finally {
      if (poolItem) {
        this.release(poolItem);
      }
    }
  }

  /**
   * Cache query result
   */
  cacheResult(key, result) {
    if (this.queryCache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.queryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(this.maxCacheSize / 4));
      toRemove.forEach(([key]) => this.queryCache.delete(key));
    }
    
    this.queryCache.set(key, {
      result: JSON.parse(JSON.stringify(result)), // Deep clone
      timestamp: Date.now()
    });
    
    this.metrics.queryCache.size = this.queryCache.size;
    this.metrics.queryCache.misses++;
  }

  /**
   * Update query performance metrics
   */
  updateQueryMetrics(success, responseTime) {
    this.metrics.totalQueries++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = Math.round(this.metrics.totalResponseTime / this.metrics.totalQueries);
    
    if (success) {
      this.metrics.successfulQueries++;
    } else {
      this.metrics.failedQueries++;
    }
    
    if (responseTime > 1000) { // Queries over 1 second are considered slow
      this.metrics.slowQueries++;
    }
  }

  /**
   * Get comprehensive pool statistics
   */
  getStats() {
    return {
      pool: {
        total: this.pool.length,
        active: this.metrics.activeConnections,
        idle: this.pool.length - this.metrics.activeConnections,
        waiting: this.waitingQueue.length,
        maxConnections: this.maxConnections
      },
      queries: {
        total: this.metrics.totalQueries,
        successful: this.metrics.successfulQueries,
        failed: this.metrics.failedQueries,
        slow: this.metrics.slowQueries,
        averageResponseTime: this.metrics.averageResponseTime,
        successRate: this.metrics.totalQueries > 0 ? 
          Math.round((this.metrics.successfulQueries / this.metrics.totalQueries) * 100) : 0
      },
      cache: {
        size: this.metrics.queryCache.size,
        hits: this.metrics.queryCache.hits,
        misses: this.metrics.queryCache.misses,
        hitRate: (this.metrics.queryCache.hits + this.metrics.queryCache.misses) > 0 ?
          Math.round((this.metrics.queryCache.hits / (this.metrics.queryCache.hits + this.metrics.queryCache.misses)) * 100) : 0
      },
      errors: {
        connections: this.metrics.connectionErrors,
        retries: this.metrics.retryCount
      },
      health: this.getHealthStatus()
    };
  }

  /**
   * Get health status of the pool
   */
  getHealthStatus() {
    const stats = {
      status: 'healthy',
      issues: []
    };
    
    // Check connection health
    if (this.metrics.connectionErrors > 10) {
      stats.status = 'warning';
      stats.issues.push('High connection error rate');
    }
    
    // Check query performance
    if (this.metrics.averageResponseTime > 5000) {
      stats.status = 'warning';
      stats.issues.push('High average response time');
    }
    
    // Check pool utilization
    const utilization = this.metrics.activeConnections / this.maxConnections;
    if (utilization > 0.9) {
      stats.status = 'warning';
      stats.issues.push('High pool utilization');
    }
    
    // Check error rate
    const errorRate = this.metrics.totalQueries > 0 ? 
      this.metrics.failedQueries / this.metrics.totalQueries : 0;
    if (errorRate > 0.1) {
      stats.status = 'critical';
      stats.issues.push('High query error rate');
    }
    
    return stats;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      const health = this.getHealthStatus();
      
      if (health.status !== 'healthy') {
        console.warn(`⚠️ Database pool health: ${health.status}`, health.issues);
        
        if (health.status === 'critical') {
          logError(new Error('Database pool in critical state'), {
            health,
            stats: this.getStats()
          });
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Start cleanup timer for idle connections
   */
  startCleanupTimer() {
    setInterval(() => {
      if (this.isShuttingDown) return;
      
      const now = Date.now();
      const toRemove = [];
      
      this.pool.forEach((poolItem, index) => {
        const { connection } = poolItem;
        
        if (!this.busyConnections.has(connection) && 
            (now - poolItem.lastUsed) > this.idleTimeout &&
            this.pool.length > this.minConnections) {
          toRemove.push(index);
        }
      });
      
      // Remove idle connections
      toRemove.reverse().forEach(index => {
        const poolItem = this.pool[index];
        poolItem.connection.close((err) => {
          if (err) console.error('Error closing idle connection:', err);
        });
        this.pool.splice(index, 1);
        this.metrics.totalConnections--;
      });
      
      // Clean query cache
      if (this.queryCache.size > 0) {
        const cutoff = now - this.cacheTimeout;
        for (const [key, value] of this.queryCache.entries()) {
          if (value.timestamp < cutoff) {
            this.queryCache.delete(key);
          }
        }
        this.metrics.queryCache.size = this.queryCache.size;
      }
      
      if (toRemove.length > 0) {
        console.log(`🧹 Cleaned up ${toRemove.length} idle connections`);
      }
    }, 300000); // Check every 5 minutes
  }

  /**
   * Gracefully close the pool
   */
  async close() {
    if (this.isShuttingDown) return;
    
    console.log('🔄 Shutting down enhanced database pool...');
    this.isShuttingDown = true;
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Wait for active connections to finish
    let attempts = 0;
    while (this.metrics.activeConnections > 0 && attempts < 30) {
      console.log(`⏳ Waiting for ${this.metrics.activeConnections} active connections...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    // Force close all connections
    const closePromises = this.pool.map(poolItem => {
      return new Promise(resolve => {
        poolItem.connection.close(err => {
          if (err) console.error('Error closing connection:', err);
          resolve();
        });
      });
    });
    
    await Promise.all(closePromises);
    
    this.pool = [];
    this.busyConnections.clear();
    this.queryCache.clear();
    
    console.log('✅ Enhanced database pool closed');
  }
}

// Create singleton instance
const pool = new EnhancedDatabasePool({
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'db', 'itsm.sqlite'),
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  minConnections: parseInt(process.env.DB_MIN_CONNECTIONS) || 5
});

module.exports = {
  pool,
  EnhancedDatabasePool
};