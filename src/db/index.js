const { MongoClient } = require("mongodb");
const RedisClient = require("./redis");
const { getInsertTemplate } = require("./insert-templates");

const mongoUri = process.env.MONGO_URI;
const clientMongo = new MongoClient(mongoUri);
const db = clientMongo.db("folhinha");

// Check if Redis environment variables are provided
// Only use Redis if both REDIS_HOST and REDIS_PORT are set and non-empty
const redisHostRaw = process.env.REDIS_HOST;
const redisPortRaw = process.env.REDIS_PORT;
const redisHost = redisHostRaw?.trim();
const redisPort = redisPortRaw?.trim();
const shouldUseRedis = !!(
  redisHost &&
  redisPort &&
  redisHost.length > 0 &&
  redisPort.length > 0
);

// Debug: Log Redis configuration status
if (!shouldUseRedis) {
  console.warn(
    `* Redis disabled: REDIS_HOST=${
      redisHostRaw === undefined ? "undefined" : `"${redisHostRaw}"`
    }, REDIS_PORT=${
      redisPortRaw === undefined ? "undefined" : `"${redisPortRaw}"`
    }`
  );
}

class MongoUtils {
  constructor() {
    this.client = clientMongo;
    this.db = db;
    this.isConnected = false;

    // Initialize Redis client (or local cache if env vars are missing)
    this.redis = new RedisClient(
      redisHost || "localhost",
      redisPort || "6379",
      shouldUseRedis
    );

    // Initialize cache containers
    this.initializeCacheContainers();
  }

  async ensureConnection() {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
    }
  }

  async initializeCacheContainers() {
    try {
      await this.ensureConnection();
      const collections = await this.db.listCollections().toArray();
      await this.redis.initializeCacheContainers(collections);
    } catch (err) {
      console.error("Failed to initialize cache containers:", err);
    }
  }

  async insert(collectionName, data) {
    // Insert into DB first to get _id
    await this.ensureConnection();
    const collection = this.db.collection(collectionName);
    const result = await collection.insertOne(data);

    // Add _id to data object
    const dataWithId = { ...data, _id: result.insertedId };

    // Update cache with document containing _id
    await this.setCache(collectionName, result.insertedId, dataWithId);

    // Return the result so we can access insertedId
    return result;
  }

  async insertTemplate(templateName, params) {
    const template = getInsertTemplate(templateName);
    if (!template) {
      throw new Error(`Unknown insert template '${templateName}'`);
    }

    const doc = await template.build(params);
    const result = await this.insert(template.collection, doc);
    return { result, doc };
  }

  async setCache(collectionName, documentId, document) {
    await this.redis.setCache(collectionName, documentId, document);
  }

  async getCache(collectionName, documentId) {
    return await this.redis.getCache(collectionName, documentId);
  }

  async deleteCache(collectionName, documentId) {
    await this.redis.deleteCache(collectionName, documentId);
  }

  async get(collectionName, query, forceDb = false) {
    if (!forceDb) {
      // Search cache for matching documents
      const matches = await this.redis.searchCache(collectionName, query);

      if (matches.length > 0) {
        await this.redis.incrementStat(collectionName, "hits");
        return matches.length === 1 ? matches[0] : matches;
      }

      // Manually track cache miss
      await this.redis.incrementStat(collectionName, "misses");
      // If not in cache, fetch from DB and update cache (lazy loading)
      return await this.fetchFromDbAndCache(collectionName, query);
    }

    // If forceDb=true, fetch from DB and update cache
    return await this.fetchFromDbAndCache(collectionName, query);
  }

  async fetchFromDbAndCache(collectionName, query) {
    try {
      await this.ensureConnection();
      const collection = this.db.collection(collectionName);
      const results = await collection.find(query).toArray();

      // Cache each document using its _id as key
      for (const doc of results) {
        await this.setCache(collectionName, doc._id, doc);
      }

      // Return single item directly if only one result, otherwise return array
      // Return null if no results found
      if (results.length === 0) {
        return null;
      }
      return results.length === 1 ? results[0] : results;
    } catch (err) {
      console.error(
        `Failed to fetch from DB for collection ${collectionName}:`,
        err
      );
      return null;
    }
  }

  async update(collectionName, query, update) {
    await this.ensureConnection();
    const collection = this.db.collection(collectionName);

    await collection.updateOne(query, update);

    const updatedDoc = await collection.findOne(query);

    if (updatedDoc) {
      await this.setCache(collectionName, updatedDoc._id, updatedDoc);
      return updatedDoc;
    }

    return null;
  }

  async updateMany(collectionName, query, update) {
    await this.ensureConnection();
    const collection = this.db.collection(collectionName);

    await collection.updateMany(query, update);

    const updatedDocs = await collection.find(query).toArray();

    for (const doc of updatedDocs) {
      await this.setCache(collectionName, doc._id, doc);
    }

    return updatedDocs;
  }

  async delete(collectionName, query) {
    const docToDelete = await this.get(collectionName, query);
    if (!docToDelete) {
      return;
    }

    // Remove from cache immediately
    await this.deleteCache(collectionName, docToDelete._id);

    // Delete from DB asynchronously
    this.ensureConnection().then(() => {
      const collection = this.db.collection(collectionName);
      collection.deleteOne(query).catch(async (err) => {
        console.error("Failed to delete from DB:", err);
        // Rollback cache on error
        await this.setCache(collectionName, docToDelete._id, docToDelete);
      });
    });
  }

  async count(collectionName, query = {}, skipCache = false) {
    if (skipCache) {
      await this.ensureConnection();
      const collection = this.db.collection(collectionName);
      return await collection.countDocuments(query);
    }

    // If no query, return cache size (only cached documents)
    if (!query || Object.keys(query).length === 0) {
      return await this.getCacheSize(collectionName);
    }

    // Check cache first using the helper function
    const matches = await this.redis.searchCache(collectionName, query);
    const count = matches.length;

    // If we have cached results, return them
    if (count > 0) {
      return count;
    }

    // If cache is empty and we have a query, fetch from DB
    // This ensures we get accurate counts even when cache is empty
    try {
      await this.ensureConnection();
      const collection = this.db.collection(collectionName);
      return await collection.countDocuments(query);
    } catch (err) {
      console.error(`Failed to count documents in ${collectionName}:`, err);
      return 0;
    }
  }

  async getCacheSize(collectionName) {
    return await this.redis.getCacheSize(collectionName);
  }

  async aggregate(collectionName, pipeline) {
    await this.ensureConnection();
    const collection = this.db.collection(collectionName);
    try {
      const results = await collection.aggregate(pipeline).toArray();
      return results;
    } catch (err) {
      console.error(`Failed to aggregate documents in ${collectionName}:`, err);
      return [];
    }
  }

  // Utility methods for cache management
  async preloadCollection(collectionName, query = {}) {
    try {
      console.info(`Preloading collection: ${collectionName}`);
      const results = await this.fetchFromDbAndCache(collectionName, query);
      const size = await this.getCacheSize(collectionName);
      console.info(`Preloaded ${size} documents from ${collectionName}`);
      return results;
    } catch (err) {
      console.error(`Failed to preload collection ${collectionName}:`, err);
      return null;
    }
  }

  async preloadDocument(collectionName, documentId) {
    try {
      // Check if already in cache
      const cached = await this.getCache(collectionName, documentId);
      if (cached) {
        return cached;
      }

      // Fetch specific document from DB
      await this.ensureConnection();
      const collection = this.db.collection(collectionName);
      const doc = await collection.findOne({ _id: documentId });

      if (doc) {
        await this.setCache(collectionName, documentId, doc);
        return doc;
      }

      return null;
    } catch (err) {
      console.error(
        `Failed to preload document ${documentId} from ${collectionName}:`,
        err
      );
      return null;
    }
  }

  async clearCache(collectionName = null) {
    await this.redis.clearCache(collectionName);
  }

  async getCacheStats(collectionName = null) {
    if (collectionName) {
      return await this.redis.getCacheStats(collectionName);
    } else {
      await this.ensureConnection();
      const collections = await this.db.listCollections().toArray();
      return await this.redis.getCacheStats(null, collections);
    }
  }

  // Method to check if a document is cached
  async isCached(collectionName, documentId) {
    return await this.redis.isCached(collectionName, documentId);
  }

  // Method to get cache hit ratio
  async getCacheHitRatio(collectionName = null) {
    if (collectionName) {
      return await this.redis.getCacheHitRatio(collectionName);
    } else {
      await this.ensureConnection();
      const collections = await this.db.listCollections().toArray();
      return await this.redis.getCacheHitRatio(null, collections);
    }
  }
}

module.exports = MongoUtils;
