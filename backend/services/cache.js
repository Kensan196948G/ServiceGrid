// Redis キャッシュサービス
const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5分
  }

  // Redis接続
  async connect() {
    try {
      // Docker環境ではredis、開発環境ではlocalhost
      const redisUrl = process.env.REDIS_URL || 
                      (process.env.NODE_ENV === 'production' ? 'redis://redis:6379' : 'redis://localhost:6379');
      
      this.client = redis.createClient({ url: redisUrl });
      
      this.client.on('error', (err) => {
        console.error('Redis接続エラー:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis接続成功');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redisクライアント準備完了');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis接続終了');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Redis接続失敗:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // キャッシュ取得
  async get(key) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('キャッシュ取得エラー:', error);
      return null;
    }
  }

  // キャッシュ設定
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('キャッシュ設定エラー:', error);
      return false;
    }
  }

  // キャッシュ削除
  async del(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('キャッシュ削除エラー:', error);
      return false;
    }
  }

  // パターンマッチでキャッシュ削除
  async delPattern(pattern) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('パターンキャッシュ削除エラー:', error);
      return false;
    }
  }

  // キャッシュ存在確認
  async exists(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('キャッシュ存在確認エラー:', error);
      return false;
    }
  }

  // TTL取得
  async ttl(key) {
    if (!this.isConnected) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('TTL取得エラー:', error);
      return -1;
    }
  }

  // キャッシュ統計情報
  async getStats() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory_info: this.parseRedisInfo(info),
        keyspace_info: this.parseRedisInfo(keyspace)
      };
    } catch (error) {
      console.error('キャッシュ統計取得エラー:', error);
      return null;
    }
  }

  // Redis情報パース
  parseRedisInfo(info) {
    const result = {};
    const lines = info.split('\r\n');
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    });
    
    return result;
  }

  // 接続切断
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.log('Redis接続を切断しました');
      } catch (error) {
        console.error('Redis切断エラー:', error);
      }
    }
  }
}

// キャッシュキー生成ヘルパー
const cacheKeys = {
  assets: {
    list: (page, limit, filters) => `assets:list:${page}:${limit}:${JSON.stringify(filters)}`,
    item: (id) => `assets:item:${id}`,
    stats: () => 'assets:stats',
    tags: (type) => `assets:tags:${type}`
  },
  incidents: {
    list: (page, limit, filters) => `incidents:list:${page}:${limit}:${JSON.stringify(filters)}`,
    item: (id) => `incidents:item:${id}`,
    stats: () => 'incidents:stats'
  },
  dashboard: {
    stats: () => 'dashboard:stats',
    activity: (userId) => `dashboard:activity:${userId}`
  }
};

// キャッシュミドルウェア
function cacheMiddleware(keyGenerator, ttl = 300) {
  return async (req, res, next) => {
    if (!cacheService.isConnected) {
      return next();
    }

    try {
      const key = keyGenerator(req);
      const cached = await cacheService.get(key);
      
      if (cached) {
        console.log(`キャッシュヒット: ${key}`);
        return res.json(cached);
      }

      // レスポンスデータをキャッシュに保存
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200) {
          cacheService.set(key, data, ttl).catch(err => {
            console.error('キャッシュ保存エラー:', err);
          });
        }
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('キャッシュミドルウェアエラー:', error);
      next();
    }
  };
}

// シングルトンインスタンス
const cacheService = new CacheService();

module.exports = {
  cacheService,
  cacheKeys,
  cacheMiddleware
};