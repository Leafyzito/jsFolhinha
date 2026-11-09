const { MongoClient } = require("mongodb");
const { getInsertTemplate } = require("./insert-templates");
const { FullCollection, KeyedCollection } = require("./memory-cache");
const ChangeSync = require("./change-sync");

const mongoUri = process.env.MONGO_URI;
const clientMongo = new MongoClient(mongoUri);
const db = clientMongo.db("folhinha");

const KEYED_MAX_ENTRIES = 20_000;

// full: whole collection in memory. synced ones are also written by the website, the change stream keeps them fresh
// keyed: lru by lookup key, only for collections the bot alone writes
// anything not listed always goes to mongo
const CACHE_POLICIES = {
  config: { mode: "full", keys: ["channelId"], synced: true },
  customcommands: { mode: "full", keys: ["channelId", "name"], synced: true },
  auth: { mode: "full", keys: ["user_id"], synced: true },
  bans: { mode: "full", keys: ["userId"] },
  pet: { mode: "full", keys: ["channelId"] },
  users: { mode: "keyed", keys: ["userid"] },
  cookie: { mode: "keyed", keys: ["userId"] },
  dungeon: { mode: "keyed", keys: ["userId"] },
  afk: { mode: "keyed", keys: ["channel", "user"] },
};

// mongo shape callers expect: one doc, an array when several match, or null
function toResult(docs) {
  if (!docs || docs.length === 0) {
    return null;
  }
  return docs.length === 1 ? docs[0] : docs;
}

class MongoUtils {
  constructor() {
    this.client = clientMongo;
    this.db = db;
    this.connectPromise = null;

    this.caches = {};
    for (const [name, policy] of Object.entries(CACHE_POLICIES)) {
      this.caches[name] =
        policy.mode === "full"
          ? new FullCollection(name, policy.keys)
          : new KeyedCollection(name, policy.keys, KEYED_MAX_ENTRIES);
    }

    const syncedCollections = Object.fromEntries(
      Object.entries(CACHE_POLICIES)
        .filter(([, policy]) => policy.synced)
        .map(([name]) => [name, this.caches[name]]),
    );
    this.changeSync = new ChangeSync(db, syncedCollections, () =>
      this.loadFullCollections(Object.keys(syncedCollections)),
    );

    // await this before any db.get, full collections aren't loaded until then
    this.ready = this.initialize();
  }

  async ensureConnection() {
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().catch((err) => {
        // let the next call retry
        this.connectPromise = null;
        throw err;
      });
    }
    await this.connectPromise;
  }

  async initialize() {
    await this.ensureConnection();

    const unsynced = Object.entries(CACHE_POLICIES)
      .filter(([, policy]) => policy.mode === "full" && !policy.synced)
      .map(([name]) => name);
    await this.loadFullCollections(unsynced);

    // loads the synced collections, then follows their changes
    await this.changeSync.start();
    console.info("* In-memory db cache ready");
  }

  // resolves to the cluster time from before the load, so the change stream can replay anything we missed
  async loadFullCollections(names) {
    await this.ensureConnection();
    const hello = await this.db.admin().command({ hello: 1 });

    await Promise.all(
      names.map(async (name) => {
        const docs = await this.db.collection(name).find({}).toArray();
        this.caches[name].load(docs);
        console.info(`* Loaded ${docs.length} docs from ${name} into memory`);
      }),
    );

    return hello.operationTime ?? null;
  }

  async insert(collectionName, data) {
    await this.ensureConnection();
    const collection = this.db.collection(collectionName);
    const result = await fb.metrics.timeDbOp(collectionName, "insert", () =>
      collection.insertOne(data),
    );

    this.caches[collectionName]?.upsert({ ...data, _id: result.insertedId });

    // return the result so we can access insertedId
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

  async get(collectionName, query, forceDb = false) {
    const cache = this.caches[collectionName];

    if (cache && !forceDb) {
      const cached = cache.find(query);
      if (cached !== undefined) {
        cache.counters.hits++;
        fb.metrics.dbCacheHits.inc({ collection: collectionName });
        return toResult(cached);
      }

      if (cache instanceof KeyedCollection) {
        const key = cache.lookupKey(query);
        if (key !== null) {
          cache.counters.misses++;
          fb.metrics.dbCacheMisses.inc({ collection: collectionName });
          return toResult(await this.fetchKeyed(cache, key, query));
        }
      }
    }

    try {
      await this.ensureConnection();
      const collection = this.db.collection(collectionName);
      return toResult(
        await fb.metrics.timeDbOp(collectionName, "find", () =>
          collection.find(query).toArray(),
        ),
      );
    } catch (err) {
      console.error(
        `Failed to fetch from DB for collection ${collectionName}:`,
        err,
      );
      return null;
    }
  }

  // fetches every doc under the key so later queries with extra fields (e.g. is_afk) are answered from memory too
  async fetchKeyed(cache, key, query) {
    const token = cache.beginFetch(key);
    try {
      await this.ensureConnection();
      const docs = await fb.metrics.timeDbOp(cache.name, "fetchKeyed", () =>
        this.db.collection(cache.name).find(cache.keyQuery(query)).toArray(),
      );
      cache.endFetch(token, docs);
      return cache.find(query) ?? [];
    } catch (err) {
      cache.abortFetch(token);
      console.error(
        `Failed to fetch from DB for collection ${cache.name}:`,
        err,
      );
      return [];
    }
  }

  async update(collectionName, query, update) {
    await this.ensureConnection();
    const collection = this.db.collection(collectionName);

    // re-reading by query misses the doc if the update changed a queried field
    const updatedDoc = await fb.metrics.timeDbOp(collectionName, "update", () =>
      collection.findOneAndUpdate(query, update, {
        returnDocument: "after",
      }),
    );

    if (updatedDoc) {
      this.caches[collectionName]?.upsert(updatedDoc);
      return updatedDoc;
    }

    return null;
  }

  async updateMany(collectionName, query, update) {
    await this.ensureConnection();
    const collection = this.db.collection(collectionName);

    // three round trips, timed as one op
    const updatedDocs = await fb.metrics.timeDbOp(
      collectionName,
      "updateMany",
      async () => {
        // grab ids first, the update can change fields the query matches on
        const matchedIds = await collection.distinct("_id", query);

        await collection.updateMany(query, update);

        return collection
          .find({ $or: [{ _id: { $in: matchedIds } }, query] })
          .toArray();
      },
    );

    const cache = this.caches[collectionName];
    if (cache) {
      for (const doc of updatedDocs) {
        cache.upsert(doc);
      }
    }

    return updatedDocs;
  }

  async delete(collectionName, query) {
    await this.ensureConnection();
    const collection = this.db.collection(collectionName);
    const deletedDoc = await fb.metrics.timeDbOp(collectionName, "delete", () =>
      collection.findOneAndDelete(query),
    );
    if (!deletedDoc) {
      return;
    }

    const cache = this.caches[collectionName];
    if (cache instanceof FullCollection) {
      cache.remove(deletedDoc._id);
    } else if (cache) {
      cache.remove(deletedDoc);
    }
  }

  // always counts in mongo, the keyed caches only hold part of a collection
  async count(collectionName, query = {}) {
    try {
      await this.ensureConnection();
      const collection = this.db.collection(collectionName);
      return await fb.metrics.timeDbOp(collectionName, "count", () =>
        collection.countDocuments(query),
      );
    } catch (err) {
      console.error(`Failed to count documents in ${collectionName}:`, err);
      return 0;
    }
  }

  async aggregate(collectionName, pipeline) {
    await this.ensureConnection();
    const collection = this.db.collection(collectionName);
    try {
      const results = await fb.metrics.timeDbOp(
        collectionName,
        "aggregate",
        () => collection.aggregate(pipeline).toArray(),
      );
      return results;
    } catch (err) {
      console.error(`Failed to aggregate documents in ${collectionName}:`, err);
      return [];
    }
  }

  cacheStats() {
    return Object.fromEntries(
      Object.entries(this.caches).map(([name, cache]) => [
        name,
        {
          mode: CACHE_POLICIES[name].mode,
          size: cache.size,
          hits: cache.counters.hits,
          misses: cache.counters.misses,
        },
      ]),
    );
  }

  // reloads full collections and drops the keyed caches, e.g. after editing the db by hand
  async reloadCache() {
    for (const cache of Object.values(this.caches)) {
      if (cache instanceof KeyedCollection) {
        cache.clear();
      }
    }

    const unsynced = Object.entries(CACHE_POLICIES)
      .filter(([, policy]) => policy.mode === "full" && !policy.synced)
      .map(([name]) => name);

    await this.changeSync.stop();
    await this.loadFullCollections(unsynced);
    await this.changeSync.start();
  }
}

module.exports = MongoUtils;
