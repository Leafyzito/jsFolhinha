// in-process document caches, see src/db/index.js for which collection uses which

function isBsonValue(value) {
  return typeof value?._bsontype === "string" && typeof value.equals === "function";
}

// values we can compare in memory the same way mongo would
function isPlainValue(value) {
  return (
    value === null ||
    typeof value !== "object" ||
    value instanceof Date ||
    isBsonValue(value)
  );
}

function valuesEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return false;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (isBsonValue(a) && isBsonValue(b)) {
    return a.equals(b);
  }
  return false;
}

// mongo equality: null also matches a missing field, arrays match on any element
function fieldMatches(docValue, queryValue) {
  if (Array.isArray(docValue)) {
    return docValue.some((item) => fieldMatches(item, queryValue));
  }
  if (queryValue === null) {
    return docValue === null || docValue === undefined;
  }
  return valuesEqual(docValue, queryValue);
}

// only plain top-level equality, anything else ($ops, dotted paths, subdocs) goes to mongo
function isSupportedQuery(query) {
  if (!query || typeof query !== "object") {
    return false;
  }
  return Object.entries(query).every(
    ([field, value]) =>
      !field.startsWith("$") && !field.includes(".") && isPlainValue(value)
  );
}

function matchesQuery(doc, query) {
  return Object.entries(query).every(([field, value]) =>
    fieldMatches(doc[field], value)
  );
}

function idKey(id) {
  return isBsonValue(id) ? id.toString() : JSON.stringify(id);
}

// builds a lookup key from the key fields, null if any of them isn't a usable scalar
function lookupKeyOf(source, keyFields) {
  const values = [];
  for (const field of keyFields) {
    const value = source[field];
    if (value === null || value === undefined || typeof value === "object") {
      return null;
    }
    values.push(value);
  }
  return JSON.stringify(values);
}

class CacheCounters {
  constructor() {
    this.hits = 0;
    this.misses = 0;
  }
}

// whole collection kept in memory, a doc not found here doesn't exist
class FullCollection {
  constructor(name, keyFields) {
    this.name = name;
    this.keyFields = keyFields;
    this.docs = new Map(); // idKey -> doc
    this.index = new Map(); // lookup key -> Set of idKeys
    this.counters = new CacheCounters();
  }

  get size() {
    return this.docs.size;
  }

  load(docs) {
    this.docs.clear();
    this.index.clear();
    for (const doc of docs) {
      this.upsert(doc);
    }
  }

  // array of matching docs, or undefined when the query can't be answered here
  find(query) {
    if (!isSupportedQuery(query)) {
      return undefined;
    }

    const hasKey = this.keyFields.every((field) => field in query);
    const key = hasKey ? lookupKeyOf(query, this.keyFields) : null;

    let candidates;
    if (key !== null) {
      const ids = this.index.get(key);
      candidates = ids ? [...ids].map((id) => this.docs.get(id)) : [];
    } else {
      candidates = this.docs.values();
    }

    const matches = [];
    for (const doc of candidates) {
      if (matchesQuery(doc, query)) {
        matches.push(doc);
      }
    }
    return matches;
  }

  upsert(doc) {
    const id = idKey(doc._id);
    const previous = this.docs.get(id);
    if (previous) {
      this.unindex(id, previous);
    }

    this.docs.set(id, doc);
    const key = lookupKeyOf(doc, this.keyFields);
    if (key !== null) {
      let ids = this.index.get(key);
      if (!ids) {
        ids = new Set();
        this.index.set(key, ids);
      }
      ids.add(id);
    }
  }

  remove(docId) {
    const id = idKey(docId);
    const previous = this.docs.get(id);
    if (!previous) {
      return;
    }
    this.unindex(id, previous);
    this.docs.delete(id);
  }

  unindex(id, doc) {
    const key = lookupKeyOf(doc, this.keyFields);
    const ids = key !== null ? this.index.get(key) : null;
    if (ids) {
      ids.delete(id);
      if (ids.size === 0) {
        this.index.delete(key);
      }
    }
  }
}

// per-key lru for big collections only the bot writes, also remembers keys with no doc
class KeyedCollection {
  constructor(name, keyFields, maxEntries) {
    this.name = name;
    this.keyFields = keyFields;
    this.maxEntries = maxEntries;
    this.entries = new Map(); // lookup key -> docs array (empty = no doc)
    this.inflight = new Set(); // pending mongo fetches
    this.counters = new CacheCounters();
  }

  get size() {
    return this.entries.size;
  }

  // lookup key for a query, null if it doesn't hold all key fields
  lookupKey(query) {
    if (!isSupportedQuery(query)) {
      return null;
    }
    if (!this.keyFields.every((field) => field in query)) {
      return null;
    }
    return lookupKeyOf(query, this.keyFields);
  }

  // query with only the key fields, used to fetch the whole entry from mongo
  keyQuery(query) {
    return Object.fromEntries(
      this.keyFields.map((field) => [field, query[field]])
    );
  }

  // array of matching docs, or undefined on a miss
  find(query) {
    const key = this.lookupKey(query);
    if (key === null) {
      return undefined;
    }

    const docs = this.entries.get(key);
    if (!docs) {
      return undefined;
    }

    // refresh lru position
    this.entries.delete(key);
    this.entries.set(key, docs);
    return docs.filter((doc) => matchesQuery(doc, query));
  }

  // writes landing while a fetch is in flight make its result stale
  beginFetch(key) {
    const token = { key, stale: false };
    this.inflight.add(token);
    return token;
  }

  endFetch(token, docs) {
    this.inflight.delete(token);
    if (token.stale) {
      return;
    }
    this.entries.delete(token.key);
    this.entries.set(token.key, docs);
    if (this.entries.size > this.maxEntries) {
      // oldest entry is first in insertion order
      this.entries.delete(this.entries.keys().next().value);
    }
  }

  abortFetch(token) {
    this.inflight.delete(token);
  }

  markStale(key) {
    for (const token of this.inflight) {
      if (key === null || token.key === key) {
        token.stale = true;
      }
    }
  }

  // only touches keys already cached, an uncached key gets fetched on next read
  upsert(doc) {
    const key = lookupKeyOf(doc, this.keyFields);
    this.markStale(key);
    if (key === null) {
      return;
    }

    const docs = this.entries.get(key);
    if (!docs) {
      return;
    }
    const id = idKey(doc._id);
    const others = docs.filter((cached) => idKey(cached._id) !== id);
    this.entries.set(key, [...others, doc]);
  }

  remove(doc) {
    const key = lookupKeyOf(doc, this.keyFields);
    this.markStale(key);
    if (key === null) {
      return;
    }

    const docs = this.entries.get(key);
    if (!docs) {
      return;
    }
    const id = idKey(doc._id);
    this.entries.set(
      key,
      docs.filter((cached) => idKey(cached._id) !== id)
    );
  }

  clear() {
    this.markStale(null);
    this.entries.clear();
  }
}

module.exports = {
  FullCollection,
  KeyedCollection,
  isSupportedQuery,
  matchesQuery,
};
