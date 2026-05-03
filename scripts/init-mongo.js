require("dotenv").config();

const { MongoClient } = require("mongodb");

const DB_NAME = "folhinha";

/** Collections that are plain CRUD (commandlog is handled separately). */
const STANDARD_COLLECTIONS = [
  "afk",
  "auth",
  "bans",
  "botconfigs",
  "config",
  "cookie",
  "customcommands",
  "dungeon",
  "jokenpo",
  "pendingjoin",
  "pet",
  "remind",
  "sugestoes",
  "users",
];

/** Indexes aligned with common fb.db.get(...) query shapes. */
const INDEX_SPECS = [
  { collection: "users", keys: { userid: 1 }, options: { unique: true } },
  { collection: "config", keys: { channelId: 1 }, options: { unique: true } },
  { collection: "auth", keys: { user_id: 1 }, options: { unique: true } },
  { collection: "bans", keys: { userId: 1 }, options: { unique: true } },
  { collection: "cookie", keys: { userId: 1 }, options: { unique: true } },
  { collection: "dungeon", keys: { userId: 1 }, options: { unique: true } },
  {
    collection: "afk",
    keys: { channel: 1, user: 1 },
    options: { unique: true },
  },
  { collection: "pet", keys: { channelId: 1 }, options: { unique: true } },
  {
    collection: "customcommands",
    keys: { channelId: 1, name: 1 },
    options: { unique: true },
  },
  {
    collection: "commandlog",
    keys: { userId: 1, sentDate: -1 },
    options: { name: "userId_1_sentDate_-1" },
  },
  {
    collection: "commandlog",
    keys: { sentDate: -1 },
    options: { name: "sentDate_-1" },
  },
];

async function collectionExists(db, name) {
  const found = await db
    .listCollections({ name }, { nameOnly: true })
    .toArray();
  return found.length > 0;
}

function isTimeSeriesCollection(info) {
  if (!info) return false;
  if (info.type === "timeseries") return true;
  return Boolean(info.options && info.options.timeseries);
}

async function ensureCommandLogTimeSeries(db) {
  if (await collectionExists(db, "commandlog")) {
    const [info] = await db.listCollections({ name: "commandlog" }).toArray();
    if (isTimeSeriesCollection(info)) {
      console.log(
        "commandlog: already exists as a time-series collection (skip create)."
      );
    } else {
      console.log(
        "commandlog: already exists as a non-time-series collection (skip create)."
      );
      console.log(
        "  To match production, drop it and re-run this script, or migrate manually."
      );
    }
    return;
  }

  try {
    await db.createCollection("commandlog", {
      timeseries: {
        timeField: "sentDate",
        granularity: "seconds",
      },
    });
    console.log(
      "commandlog: created as time-series collection (timeField: sentDate, granularity: seconds)."
    );
  } catch (err) {
    if (err.code === 48) {
      console.log("commandlog: already exists (race), skip.");
      return;
    }
    console.warn(`commandlog: time-series create failed: ${err.message}`);
    console.warn(
      "  Falling back to a standard collection (production uses time-series)."
    );
    try {
      await db.createCollection("commandlog");
      console.log("commandlog: created as a standard collection.");
    } catch (err2) {
      if (err2.code === 48) return;
      throw err2;
    }
  }
}

async function ensureStandardCollections(db) {
  for (const name of STANDARD_COLLECTIONS) {
    if (await collectionExists(db, name)) {
      console.log(`${name}: exists (skip)`);
      continue;
    }
    await db.createCollection(name);
    console.log(`${name}: created`);
  }
}

/**
 * Insert one `config` row for the bot's own channel so dev boots match production shape.
 * Mirrors src/utils/utils/index.js createNewChannelConfig defaults, plus fields commonly present in prod.
 */
function buildInitialBotConfig(channelId, channelLogin) {
  return {
    channel: channelLogin.trim().toLowerCase(),
    channelId: String(channelId).trim(),
    prefix: "!",
    offlineOnly: false,
    emoteStreak: false,
    isPaused: false,
    disabledCommands: [],
    devBanCommands: [],
    thankFollows: false,
    thankSubs: false,
    commandSetting: { maxPiramide: 20 },
    state: "active",
  };
}

async function seedBotChannelConfig(db) {
  const userId =
    process.env.BOT_USERID && String(process.env.BOT_USERID).trim();
  const username =
    process.env.BOT_USERNAME && String(process.env.BOT_USERNAME).trim();

  if (!userId || !username) {
    console.log(
      "config: skipped initial bot channel doc (set BOT_USERID and BOT_USERNAME to create one)."
    );
    return;
  }

  const coll = db.collection("config");
  const existing = await coll.findOne({ channelId: userId });
  if (existing) {
    console.log(
      `config: document for bot channel (channelId=${userId}) already exists — skip seed.`
    );
    return;
  }

  const doc = buildInitialBotConfig(userId, username);
  await coll.insertOne(doc);
  console.log(
    `config: inserted initial doc for bot channel: ${doc.channel} - id: ${doc.channelId}`
  );
}

async function ensureIndexes(db) {
  for (const spec of INDEX_SPECS) {
    const coll = db.collection(spec.collection);
    try {
      await coll.createIndex(spec.keys, spec.options);
      const idxName =
        spec.options?.name ||
        Object.entries(spec.keys)
          .map(([k, v]) => `${k}_${v}`)
          .join("_");
      console.log(`index: ${spec.collection}.${idxName}`);
    } catch (err) {
      if (
        err.code === 85 ||
        err.code === 86 ||
        (err.message && String(err.message).includes("already exists"))
      ) {
        continue;
      }
      throw err;
    }
  }
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri || !String(uri).trim()) {
    console.error("MONGO_URI is missing. Set it in .env (see .env.example).");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log(`Connected. Database: ${DB_NAME}\n`);

  await ensureCommandLogTimeSeries(db);
  await ensureStandardCollections(db);
  console.log("Creating indexes...");
  await ensureIndexes(db);

  await seedBotChannelConfig(db);

  await client.close();
  console.log("init-mongo finished.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
