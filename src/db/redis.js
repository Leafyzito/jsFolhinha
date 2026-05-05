const { createClient } = require("redis");

class RedisClient {
  constructor(host, port, shouldUseRedis = true) {
    this.host = host;
    this.port = port;
    this.redisConnecting = false;
    this.cacheTTL = 24 * 60 * 60; // 24 hours in seconds

    // Initialize local cache as fallback
    this.localCache = new Map(); // key -> { value, expiresAt }
    this.localStats = new Map(); // key -> number

    // If Redis env vars are missing/empty, skip Redis and use local cache directly
    if (!shouldUseRedis) {
      this.useLocalCache = true;
      this.redisClient = null;

      // Only log to Discord if it's available (it might not be initialized yet)
      if (global.fb?.discord?.importantLog) {
        global.fb.discord.importantLog(
          "* Redis environment variables not configured, using local in-memory cache"
        );
      }
      return;
    }

    // Otherwise, try to connect to Redis
    this.useLocalCache = false;
    this.redisClient = this.createRedisClient(host, parseInt(port, 10));

    // Check connection after a short delay and fallback to local cache if needed
    this.checkConnectionAndFallback();
  }

  async checkConnectionAndFallback() {
    // Wait a bit for connection to establish
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await this.ensureRedisConnection();
      // If we get here, Redis is connected
      this.useLocalCache = false;
    } catch {
      // Redis connection failed, use local cache
      console.log(
        "* Redis connection unavailable, using local in-memory cache"
      );
      if (global.fb?.discord?.importantLog) {
        global.fb.discord.importantLog(
          "* Redis connection unavailable, using local in-memory cache"
        );
      }
      this.useLocalCache = true;
    }
  }

  createRedisClient(host, port, isFallback = false) {
    const client = createClient({
      socket: {
        host: host,
        port: port,
        reconnectStrategy: (retries) => {
          // Stop retrying after 10 attempts
          if (retries > 10) {
            return false;
          }
          return Math.min(retries * 50, 1000);
        },
      },
    });

    client.on("error", (err) => {
      // Only log error if it's not a connection error that we're handling
      if (
        err.code !== "ENOTFOUND" ||
        host === "localhost" ||
        host === "127.0.0.1"
      ) {
        console.error("Redis Client Error:", err);
      }
    });

    client.on("connect", () => {
      console.log(`* Redis client connected to ${host}:${port}`);
    });

    // Connect to Redis with fallback logic
    if (!isFallback) {
      client.connect().catch(async (err) => {
        if (
          err.code === "ENOTFOUND" &&
          host !== "localhost" &&
          host !== "127.0.0.1" &&
          !this.redisConnecting
        ) {
          this.redisConnecting = true;
          console.log(
            `Cannot resolve ${host}, trying localhost as fallback...`
          );

          // Disconnect the old client
          try {
            if (client.isOpen || client.isReady) {
              await client.quit().catch(() => {
                // Ignore quit errors
              });
            }
            await client.disconnect().catch(() => {
              // Ignore disconnect errors
            });
          } catch {
            // Ignore errors when closing
          }

          // Create new client with localhost
          const fallbackClient = this.createRedisClient(
            "localhost",
            port,
            true
          );
          this.redisClient = fallbackClient;
          this.host = "localhost";
          try {
            await fallbackClient.connect();
            this.redisConnecting = false;
          } catch (fallbackErr) {
            this.redisConnecting = false;
            console.error(
              "Failed to connect to Redis (localhost fallback):",
              fallbackErr
            );
          }
        } else {
          console.error("Failed to connect to Redis:", err);
        }
      });
    } else {
      // For fallback client, connect immediately
      client.connect().catch((err) => {
        console.error("Failed to connect to Redis (fallback):", err);
      });
    }

    return client;
  }

  async ensureRedisConnection() {
    if (this.useLocalCache || !this.redisClient) {
      return; // Skip Redis if using local cache or Redis client not initialized
    }

    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
      }
    } catch {
      // Connection failed, switch to local cache
      if (!this.useLocalCache) {
        console.log(
          "* Redis connection lost, switching to local in-memory cache"
        );
        this.useLocalCache = true;
      }
    }
  }

  // Local cache helper methods
  getLocalCacheKey(collectionName, documentId) {
    return `cache:${collectionName}:${JSON.stringify(documentId)}`;
  }

  getLocalStatsKey(collectionName, statType) {
    return `stats:${collectionName}:${statType}`;
  }

  cleanupExpiredLocalCache() {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.localCache.delete(key);
      }
    }
  }

  getCacheKey(collectionName, documentId) {
    return `cache:${collectionName}:${JSON.stringify(documentId)}`;
  }

  getStatsKey(collectionName, statType) {
    return `stats:${collectionName}:${statType}`;
  }

  async incrementStat(collectionName, statType) {
    if (this.useLocalCache) {
      const key = this.getLocalStatsKey(collectionName, statType);
      const current = this.localStats.get(key) || 0;
      this.localStats.set(key, current + 1);
      return;
    }

    try {
      await this.ensureRedisConnection();
      const key = this.getStatsKey(collectionName, statType);
      await this.redisClient.incr(key);
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
        const key = this.getLocalStatsKey(collectionName, statType);
        const current = this.localStats.get(key) || 0;
        this.localStats.set(key, current + 1);
      }
    }
  }

  async getStat(collectionName, statType) {
    if (this.useLocalCache) {
      const key = this.getLocalStatsKey(collectionName, statType);
      return this.localStats.get(key) || 0;
    }

    try {
      await this.ensureRedisConnection();
      const key = this.getStatsKey(collectionName, statType);
      const value = await this.redisClient.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
      }
      const key = this.getLocalStatsKey(collectionName, statType);
      return this.localStats.get(key) || 0;
    }
  }

  async setCache(collectionName, documentId, document) {
    if (this.useLocalCache) {
      const key = this.getLocalCacheKey(collectionName, documentId);
      const expiresAt = Date.now() + this.cacheTTL * 1000;
      this.localCache.set(key, { value: document, expiresAt });
      this.cleanupExpiredLocalCache();
      return;
    }

    try {
      await this.ensureRedisConnection();
      const key = this.getCacheKey(collectionName, documentId);
      await this.redisClient.setEx(
        key,
        this.cacheTTL,
        JSON.stringify(document)
      );
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
      }
      const key = this.getLocalCacheKey(collectionName, documentId);
      const expiresAt = Date.now() + this.cacheTTL * 1000;
      this.localCache.set(key, { value: document, expiresAt });
      this.cleanupExpiredLocalCache();
    }
  }

  async getCache(collectionName, documentId) {
    if (this.useLocalCache) {
      const key = this.getLocalCacheKey(collectionName, documentId);
      const entry = this.localCache.get(key);
      if (entry) {
        // Check if expired
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          this.localCache.delete(key);
          return null;
        }
        return entry.value;
      }
      return null;
    }

    try {
      await this.ensureRedisConnection();
      const key = this.getCacheKey(collectionName, documentId);
      const value = await this.redisClient.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
      }
      const key = this.getLocalCacheKey(collectionName, documentId);
      const entry = this.localCache.get(key);
      if (entry) {
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          this.localCache.delete(key);
          return null;
        }
        return entry.value;
      }
      return null;
    }
  }

  async deleteCache(collectionName, documentId) {
    if (this.useLocalCache) {
      const key = this.getLocalCacheKey(collectionName, documentId);
      this.localCache.delete(key);
      return;
    }

    try {
      await this.ensureRedisConnection();
      const key = this.getCacheKey(collectionName, documentId);
      await this.redisClient.del(key);
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
      }
      const key = this.getLocalCacheKey(collectionName, documentId);
      this.localCache.delete(key);
    }
  }

  async getCacheSize(collectionName) {
    if (this.useLocalCache) {
      this.cleanupExpiredLocalCache();
      const prefix = `cache:${collectionName}:`;
      let count = 0;
      for (const key of this.localCache.keys()) {
        if (key.startsWith(prefix)) {
          count++;
        }
      }
      return count;
    }

    try {
      await this.ensureRedisConnection();
      const pattern = `cache:${collectionName}:*`;
      const keys = await this.redisClient.keys(pattern);
      return keys.length;
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
      }
      this.cleanupExpiredLocalCache();
      const prefix = `cache:${collectionName}:`;
      let count = 0;
      for (const key of this.localCache.keys()) {
        if (key.startsWith(prefix)) {
          count++;
        }
      }
      return count;
    }
  }

  async searchCache(collectionName, query) {
    if (this.useLocalCache) {
      this.cleanupExpiredLocalCache();
      const queryKeys = Object.keys(query);
      const matches = [];
      const prefix = `cache:${collectionName}:`;

      // For single field queries, try direct cache lookup first
      if (queryKeys.length === 1) {
        const key = queryKeys[0];
        const value = query[key];

        // If querying by _id, use direct cache lookup
        if (key === "_id") {
          const doc = await this.getCache(collectionName, value);
          if (doc) {
            return [doc];
          }
          return [];
        }

        // For other single field queries, search all cached documents
        for (const [cacheKey, entry] of this.localCache.entries()) {
          if (cacheKey.startsWith(prefix)) {
            const doc = entry.value;
            if (doc[key] === value) {
              matches.push(doc);
            }
          }
        }
        return matches;
      } else {
        // For multi-field queries, search all cached documents
        for (const [cacheKey, entry] of this.localCache.entries()) {
          if (cacheKey.startsWith(prefix)) {
            const doc = entry.value;
            let isMatch = true;
            for (const [key, value] of Object.entries(query)) {
              if (doc[key] !== value) {
                isMatch = false;
                break;
              }
            }
            if (isMatch) {
              matches.push(doc);
            }
          }
        }
        return matches;
      }
    }

    try {
      await this.ensureRedisConnection();
      const queryKeys = Object.keys(query);
      const matches = [];

      // For single field queries, try direct cache lookup first
      if (queryKeys.length === 1) {
        const key = queryKeys[0];
        const value = query[key];

        // If querying by _id, use direct cache lookup
        if (key === "_id") {
          const doc = await this.getCache(collectionName, value);
          if (doc) {
            return [doc];
          }
          return [];
        }

        // For other single field queries, search all cached documents
        const pattern = `cache:${collectionName}:*`;
        const keys = await this.redisClient.keys(pattern);

        for (const cacheKey of keys) {
          const docStr = await this.redisClient.get(cacheKey);
          if (docStr) {
            try {
              const doc = JSON.parse(docStr);
              if (doc[key] === value) {
                matches.push(doc);
              }
            } catch {
              // Skip invalid JSON
              continue;
            }
          }
        }
        return matches;
      } else {
        // For multi-field queries, search all cached documents
        const pattern = `cache:${collectionName}:*`;
        const keys = await this.redisClient.keys(pattern);

        for (const cacheKey of keys) {
          const docStr = await this.redisClient.get(cacheKey);
          if (docStr) {
            try {
              const doc = JSON.parse(docStr);
              let isMatch = true;
              for (const [key, value] of Object.entries(query)) {
                if (doc[key] !== value) {
                  isMatch = false;
                  break;
                }
              }
              if (isMatch) {
                matches.push(doc);
              }
            } catch {
              // Skip invalid JSON
              continue;
            }
          }
        }
        return matches;
      }
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
      }
      return await this.searchCache(collectionName, query); // Recursive call with local cache
    }
  }

  async initializeCacheContainers(collections) {
    try {
      console.log("Initializing cache containers...");

      if (this.useLocalCache) {
        // Clear all cache on startup
        this.localCache.clear();
        this.localStats.clear();

        const collectionsToIgnore = ["commandlog"]; // for ram's sake

        // Initialize stats for each collection
        for (const collection of collections) {
          const collectionName = collection.name;
          if (collectionsToIgnore.includes(collectionName)) {
            continue;
          }

          // Initialize hit/miss counters if they don't exist
          const hitsKey = this.getLocalStatsKey(collectionName, "hits");
          const missesKey = this.getLocalStatsKey(collectionName, "misses");
          if (!this.localStats.has(hitsKey)) {
            this.localStats.set(hitsKey, 0);
          }
          if (!this.localStats.has(missesKey)) {
            this.localStats.set(missesKey, 0);
          }
        }
        console.log("* Cache containers initialized (local cache)");
        return;
      }

      try {
        await this.ensureRedisConnection();

        // Clear all cache on startup
        await this.clearCache();

        const collectionsToIgnore = ["commandlog"]; // for ram's sake

        // Initialize stats for each collection
        for (const collection of collections) {
          const collectionName = collection.name;
          if (collectionsToIgnore.includes(collectionName)) {
            continue;
          }

          // Initialize hit/miss counters if they don't exist
          const hitsKey = this.getStatsKey(collectionName, "hits");
          const missesKey = this.getStatsKey(collectionName, "misses");
          await this.redisClient.setNX(hitsKey, "0");
          await this.redisClient.setNX(missesKey, "0");
        }
        console.log("* Cache containers initialized");
      } catch {
        // Fallback to local cache
        console.log(
          "* Redis unavailable during initialization, using local cache"
        );
        if (global.fb?.discord?.importantLog) {
          global.fb.discord.importantLog(
            "* Redis connection unavailable, using local in-memory cache"
          );
        }
        this.useLocalCache = true;
        await this.initializeCacheContainers(collections); // Recursive call
      }
    } catch (err) {
      console.error("Failed to initialize cache containers:", err);
    }
  }

  async clearCache(collectionName = null) {
    if (this.useLocalCache) {
      if (collectionName) {
        const prefix = `cache:${collectionName}:`;
        for (const key of this.localCache.keys()) {
          if (key.startsWith(prefix)) {
            this.localCache.delete(key);
          }
        }
        // Also clear stats
        this.localStats.delete(this.getLocalStatsKey(collectionName, "hits"));
        this.localStats.delete(this.getLocalStatsKey(collectionName, "misses"));
        console.log(`Cleared cache for collection: ${collectionName}`);
      } else {
        // Clear all caches
        this.localCache.clear();
        this.localStats.clear();
        console.log("Cleared all caches");
      }
      return;
    }

    try {
      await this.ensureRedisConnection();
      if (collectionName) {
        const pattern = `cache:${collectionName}:*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        // Also clear stats
        await this.redisClient.del(
          this.getStatsKey(collectionName, "hits"),
          this.getStatsKey(collectionName, "misses")
        );
        console.log(`Cleared cache for collection: ${collectionName}`);
      } else {
        // Clear all caches
        const pattern = "cache:*";
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        // Clear all stats
        const statsPattern = "stats:*";
        const statsKeys = await this.redisClient.keys(statsPattern);
        if (statsKeys.length > 0) {
          await this.redisClient.del(statsKeys);
        }
        console.log("Cleared all caches");
      }
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
      }
      await this.clearCache(collectionName); // Recursive call
    }
  }

  async getCacheStats(collectionName = null, collections = []) {
    if (this.useLocalCache) {
      if (collectionName) {
        const size = await this.getCacheSize(collectionName);
        const hits = await this.getStat(collectionName, "hits");
        const misses = await this.getStat(collectionName, "misses");
        return {
          collection: collectionName,
          size: size,
          max: null,
          ttl: this.cacheTTL,
          hits: hits,
          misses: misses,
        };
      } else {
        // Return stats for all collections
        const stats = {};

        for (const collection of collections) {
          const collectionName = collection.name;
          const size = await this.getCacheSize(collectionName);
          const hits = await this.getStat(collectionName, "hits");
          const misses = await this.getStat(collectionName, "misses");
          stats[collectionName] = {
            size: size,
            max: null,
            ttl: this.cacheTTL,
            hits: hits,
            misses: misses,
          };
        }
        return stats;
      }
    }

    try {
      await this.ensureRedisConnection();
      if (collectionName) {
        const size = await this.getCacheSize(collectionName);
        const hits = await this.getStat(collectionName, "hits");
        const misses = await this.getStat(collectionName, "misses");
        return {
          collection: collectionName,
          size: size,
          max: null, // Redis doesn't have a max like LRU cache
          ttl: this.cacheTTL,
          hits: hits,
          misses: misses,
        };
      } else {
        // Return stats for all collections
        const stats = {};

        for (const collection of collections) {
          const collectionName = collection.name;
          const size = await this.getCacheSize(collectionName);
          const hits = await this.getStat(collectionName, "hits");
          const misses = await this.getStat(collectionName, "misses");
          stats[collectionName] = {
            size: size,
            max: null,
            ttl: this.cacheTTL,
            hits: hits,
            misses: misses,
          };
        }
        return stats;
      }
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
      }
      return await this.getCacheStats(collectionName, collections); // Recursive call
    }
  }

  // Method to check if a document is cached
  async isCached(collectionName, documentId) {
    if (this.useLocalCache) {
      const key = this.getLocalCacheKey(collectionName, documentId);
      const entry = this.localCache.get(key);
      if (entry) {
        // Check if expired
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          this.localCache.delete(key);
          return false;
        }
        return true;
      }
      return false;
    }

    try {
      await this.ensureRedisConnection();
      const key = this.getCacheKey(collectionName, documentId);
      const exists = await this.redisClient.exists(key);
      return exists === 1;
    } catch {
      // Fallback to local cache on error
      if (!this.useLocalCache) {
        this.useLocalCache = true;
      }
      return await this.isCached(collectionName, documentId); // Recursive call
    }
  }

  // Method to get cache hit ratio
  async getCacheHitRatio(collectionName = null, collections = []) {
    if (collectionName) {
      const hits = await this.getStat(collectionName, "hits");
      const misses = await this.getStat(collectionName, "misses");
      const total = hits + misses;
      return total > 0 ? ((hits / total) * 100).toFixed(2) + "%" : "0%";
    } else {
      // Calculate overall hit ratio
      let totalHits = 0;
      let totalMisses = 0;

      for (const collection of collections) {
        const collectionName = collection.name;
        totalHits += await this.getStat(collectionName, "hits");
        totalMisses += await this.getStat(collectionName, "misses");
      }

      const total = totalHits + totalMisses;
      return total > 0 ? ((totalHits / total) * 100).toFixed(2) + "%" : "0%";
    }
  }
}

module.exports = RedisClient;
