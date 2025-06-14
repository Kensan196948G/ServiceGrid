// データベース接続プール
const sqlite3 = require('sqlite3').verbose();
const { recordDatabaseQuery, recordDatabaseConnection } = require('../middleware/metrics');

class DatabasePool {
  constructor(options = {}) {
    this.dbPath = options.dbPath || process.env.DB_PATH || './backend/db/itsm.sqlite';
    this.maxConnections = options.maxConnections || 10;
    this.acquireTimeout = options.acquireTimeout || 5000;
    this.idleTimeout = options.idleTimeout || 30000;
    
    this.pool = [];
    this.waitingQueue = [];
    this.busyConnections = new Set();
    
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      waitingRequests: 0,
      totalQueries: 0,
      failedQueries: 0
    };
  }

  // 接続プールの初期化
  async initialize() {
    console.log(`データベースプール初期化中: ${this.dbPath}`);
    
    // 最小接続数を作成
    const minConnections = Math.ceil(this.maxConnections / 2);
    
    for (let i = 0; i < minConnections; i++) {
      try {
        const connection = await this.createConnection();
        this.pool.push({
          connection,
          lastUsed: Date.now(),
          id: i
        });
      } catch (error) {
        console.error(`接続作成エラー (${i}):`, error);
      }
    }
    
    console.log(`データベースプール初期化完了: ${this.pool.length}/${minConnections} 接続`);
    
    // アイドル接続のクリーンアップタイマー
    this.startCleanupTimer();
  }

  // 新しい接続を作成
  createConnection() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          reject(err);
        } else {
          // パフォーマンス設定
          db.configure('busyTimeout', 30000);
          db.run('PRAGMA journal_mode = WAL');
          db.run('PRAGMA synchronous = NORMAL');
          db.run('PRAGMA cache_size = 10000');
          db.run('PRAGMA temp_store = MEMORY');
          db.run('PRAGMA mmap_size = 268435456'); // 256MB
          
          this.metrics.totalConnections++;
          recordDatabaseConnection();
          resolve(db);
        }
      });
    });
  }

  // 接続を取得
  async acquire() {
    return new Promise(async (resolve, reject) => {
      // プールから利用可能な接続を探す
      const available = this.pool.find(item => !this.busyConnections.has(item.connection));
      
      if (available) {
        this.busyConnections.add(available.connection);
        available.lastUsed = Date.now();
        this.metrics.activeConnections++;
        resolve(available.connection);
        return;
      }

      // プールが満杯で新しい接続を作成可能な場合
      if (this.metrics.totalConnections < this.maxConnections) {
        try {
          const connection = await this.createConnection();
          const poolItem = {
            connection,
            lastUsed: Date.now(),
            id: this.metrics.totalConnections
          };
          
          this.pool.push(poolItem);
          this.busyConnections.add(connection);
          this.metrics.activeConnections++;
          resolve(connection);
          return;
        } catch (error) {
          reject(error);
          return;
        }
      }

      // 待機キューに追加
      this.metrics.waitingRequests++;
      const timeout = setTimeout(() => {
        this.metrics.waitingRequests--;
        reject(new Error('接続取得タイムアウト'));
      }, this.acquireTimeout);

      this.waitingQueue.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          this.metrics.waitingRequests--;
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.metrics.waitingRequests--;
          reject(error);
        }
      });
    });
  }

  // 接続を解放
  release(connection) {
    if (this.busyConnections.has(connection)) {
      this.busyConnections.delete(connection);
      this.metrics.activeConnections--;
      
      // 待機中のリクエストがある場合
      if (this.waitingQueue.length > 0) {
        const waiting = this.waitingQueue.shift();
        this.busyConnections.add(connection);
        this.metrics.activeConnections++;
        
        const poolItem = this.pool.find(item => item.connection === connection);
        if (poolItem) {
          poolItem.lastUsed = Date.now();
        }
        
        waiting.resolve(connection);
      } else {
        // 最後に使用した時間を更新
        const poolItem = this.pool.find(item => item.connection === connection);
        if (poolItem) {
          poolItem.lastUsed = Date.now();
        }
      }
    }
  }

  // クエリ実行ヘルパー
  async query(sql, params = []) {
    const connection = await this.acquire();
    
    return new Promise((resolve, reject) => {
      const method = sql.trim().toLowerCase().startsWith('select') ? 'all' : 'run';
      
      connection[method](sql, params, function(err, result) {
        // メトリクス記録
        if (err) {
          pool.metrics.failedQueries++;
          recordDatabaseQuery(false);
        } else {
          pool.metrics.totalQueries++;
          recordDatabaseQuery(true);
        }
        
        pool.release(connection);
        
        if (err) {
          reject(err);
        } else {
          if (method === 'run') {
            resolve({
              lastID: this.lastID,
              changes: this.changes
            });
          } else {
            resolve(result);
          }
        }
      });
    });
  }

  // トランザクション実行
  async transaction(queries) {
    const connection = await this.acquire();
    
    return new Promise((resolve, reject) => {
      connection.serialize(() => {
        connection.run('BEGIN TRANSACTION');
        
        const results = [];
        let completed = 0;
        
        const executeQuery = (index) => {
          if (index >= queries.length) {
            connection.run('COMMIT', (err) => {
              this.release(connection);
              if (err) {
                reject(err);
              } else {
                resolve(results);
              }
            });
            return;
          }
          
          const { sql, params } = queries[index];
          const method = sql.trim().toLowerCase().startsWith('select') ? 'all' : 'run';
          
          connection[method](sql, params || [], function(err, result) {
            if (err) {
              connection.run('ROLLBACK', () => {
                pool.release(connection);
                reject(err);
              });
              return;
            }
            
            results.push(method === 'run' ? {
              lastID: this.lastID,
              changes: this.changes
            } : result);
            
            executeQuery(index + 1);
          });
        };
        
        executeQuery(0);
      });
    });
  }

  // プール統計情報
  getStats() {
    return {
      ...this.metrics,
      poolSize: this.pool.length,
      maxConnections: this.maxConnections,
      waitingRequests: this.waitingQueue.length,
      idleConnections: this.pool.length - this.busyConnections.size
    };
  }

  // アイドル接続のクリーンアップ
  startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      const toRemove = [];
      
      this.pool.forEach((item, index) => {
        if (!this.busyConnections.has(item.connection) && 
            (now - item.lastUsed) > this.idleTimeout &&
            this.pool.length > 2) { // 最小2接続は保持
          toRemove.push(index);
        }
      });
      
      toRemove.reverse().forEach(index => {
        const item = this.pool[index];
        item.connection.close();
        this.pool.splice(index, 1);
        this.metrics.totalConnections--;
      });
      
      if (toRemove.length > 0) {
        console.log(`アイドル接続を${toRemove.length}件クリーンアップしました`);
      }
    }, 60000); // 1分間隔でチェック
  }

  // プールの終了
  async close() {
    console.log('データベースプールをクローズしています...');
    
    // すべての接続を閉じる
    const closePromises = this.pool.map(item => {
      return new Promise((resolve) => {
        item.connection.close((err) => {
          if (err) {
            console.error('接続クローズエラー:', err);
          }
          resolve();
        });
      });
    });
    
    await Promise.all(closePromises);
    this.pool = [];
    this.busyConnections.clear();
    
    console.log('データベースプールをクローズしました');
  }
}

// シングルトンインスタンス
const pool = new DatabasePool();

module.exports = {
  pool,
  DatabasePool
};