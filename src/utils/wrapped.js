const { getBanStats, humanizedTime } = require("../commands/banstats/banstats");
const { yearRange, wrappedCollection } = require("./wrapped-compute");

// stats come from the wrapped<year> collection, filled by scripts/compute-wrapped.js
// only chat messages and bans are queried live since they're in clickhouse
const YEAR = 2026;
const { start: START_DATE, end: END_DATE } = yearRange(YEAR);

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const wrappedCache = new Map();

async function getWrappedDoc(id) {
  const doc = await fb.db.get(wrappedCollection(YEAR), { _id: id }, true);
  if (!doc) return null;
  delete doc._id;
  return doc;
}

async function getMessageStats(userId) {
  if (!fb.clickhouse || fb.clickhouse.isConnected != true) {
    return { count: 0, top: [] };
  }

  const params = {
    userId,
    startTimestamp: Math.floor(START_DATE.getTime() / 1000),
    endTimestamp: Math.floor(END_DATE.getTime() / 1000),
  };

  const [msgCount, top5Channels] = await Promise.all([
    fb.clickhouse.query(
      `
        SELECT COUNT(*) AS message_count
        FROM message_structured
        WHERE
          user_id = {userId:String}
          AND message_type = 1
          AND timestamp >= {startTimestamp:UInt32}
          AND timestamp < {endTimestamp:UInt32}
     `,
      params
    ),
    fb.clickhouse.query(
      `
        SELECT
          channel_login,
          COUNT(*) AS message_count
        FROM message_structured
        WHERE
          user_id = {userId:String}
          AND message_type = 1
          AND timestamp >= {startTimestamp:UInt32}
          AND timestamp < {endTimestamp:UInt32}
        GROUP BY channel_login
        ORDER BY message_count DESC
        LIMIT 5
     `,
      params
    ),
  ]);

  const msgCountData = msgCount.data || msgCount;
  return {
    count: Number(msgCountData[0]?.message_count || 0),
    top: top5Channels.data || top5Channels,
  };
}

async function getWrapped(username) {
  const now = Date.now();

  // Check cache
  const cached = wrappedCache.get(username?.toLowerCase?.());
  if (cached && cached.expiry > now && typeof cached.data === "object") {
    return cached.data;
  }

  const userInfo = await fb.api.helix.getUserByUsername(username);
  if (!userInfo) {
    return { statusCode: 404, errorMessage: "User not found" };
  }

  const userColor = await fb.api.helix.getColor(userInfo.id);
  userInfo.color = userColor.color || null;

  const [stats, global, messages, banStats] = await Promise.all([
    getWrappedDoc(userInfo.id),
    getWrappedDoc("global"),
    getMessageStats(userInfo.id),
    fb.clickhouse?.isConnected == true
      ? getBanStats(userInfo.id, {
          from: Math.floor(START_DATE.getTime() / 1000),
          to: Math.floor(END_DATE.getTime() / 1000),
        })
      : { bans: 0, timeouts: 0, timeoutsDuration: 0 },
  ]);

  const result = {
    statusCode: 200,
    year: YEAR,
    userId: userInfo.id,
    username: userInfo.login,
    displayName: userInfo.displayName,
    profilePicture: userInfo.profileImageUrl,
    color: userInfo.color,
    // null when the user didn't use any command this year
    stats,
    messages,
    bans: {
      ...banStats,
      humanizedTime: humanizedTime(banStats.timeoutsDuration),
    },
    global,
  };

  wrappedCache.set(username.toLowerCase(), {
    data: result,
    expiry: now + CACHE_DURATION_MS,
  });

  return result;
}

module.exports = { getWrapped, getWrappedDoc, YEAR };
