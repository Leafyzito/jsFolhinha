// precomputes the wrapped of every user that used the bot in a given year
// too heavy to run per request, see scripts/compute-wrapped.js
const fs = require("fs");
const path = require("path");

// hours/days are shown in brazilian time, most users are from there
const TZ = "America/Sao_Paulo";

const ARCHETYPES = {
  apostador: {
    label: "Apostador",
    emoji: "🎰",
    commands: ["roleta-russa", "coinflip", "rolar", "jokenpo", "8ball", "%", "escolha"],
  },
  detetive: {
    label: "Detetive",
    emoji: "🕵️",
    commands: [
      "stalk", "lastseen", "logs", "followage", "subage", "firstline", "randomline",
      "randomquote", "countline", "checknick", "user", "chatters", "isafk", "modlist",
      "viplist", "mods", "vips", "founders", "roles", "presence", "avatar", "live", "preview",
    ],
  },
  dj: {
    label: "DJ",
    emoji: "🎵",
    commands: ["song", "topartists", "topsongs", "shazam", "youtubesearch"],
  },
  curioso: {
    label: "Curioso",
    emoji: "🤓",
    commands: [
      "gpt", "query", "wiki", "translate", "weather", "time", "curiosidade", "howlongtobeat",
      "isthereanydeal", "filme", "letterboxd", "emoteinfo", "isdown", "chatsummary",
    ],
  },
  gamer: {
    label: "Gamer",
    emoji: "🎮",
    commands: ["dungeon", "quiz", "termo", "charada", "randomlinequiz"],
  },
  carinhoso: {
    label: "Carinhoso",
    emoji: "🤗",
    commands: ["carinho", "brincar", "pet", "abraco", "beijo", "tuck"],
  },
  caotico: {
    label: "Caótico",
    emoji: "😈",
    commands: ["bonk", "slap", "explode", "cancelar", "hypertranslate", "uwu", "copypasta", "ascii", "fill"],
  },
  cookie: {
    label: "Viciado em Cookies",
    emoji: "🍪",
    commands: ["cookie", "cd"],
  },
};

const COMMAND_ARCHETYPE = {};
for (const [id, { commands }] of Object.entries(ARCHETYPES)) {
  for (const command of commands) COMMAND_ARCHETYPE[command] = id;
}

// too little usage to say anything about the user
const ARCHETYPE_MIN_TOTAL = 20;
const ARCHETYPE_MIN_CATEGORY = 5;

// commands where the first argument is the person being targeted
const FRIENDLY_COMMANDS = ["abraco", "beijo", "tuck"];
const HOSTILE_COMMANDS = ["bonk", "slap", "explode", "cancelar"];

// cookie targets come from the reply since they can be random
const STEAL_RESPONSE = /^Você (?:ia roubar|roubou|quase roubou) (?:um|1) cookie de (\S+)/;
const GIFT_RESPONSE = /^Você ofereceu um cookie para (\S+)/;

const COOKIE_FIELDS = {
  opened: "opened",
  eaten: "eaten",
  gifted: "gifted",
  beenGifted: "beenGifted",
  sloted: "sloted",
  stolen: "totalStolen",
  gotStolen: "totalGotStolen",
};
const DUNGEON_FIELDS = ["xp", "level", "wins", "losses"];

const TOP_N = 5;

// year boundaries in TZ too, otherwise new year's eve shows up as the 1st day
// brazil has no dst since 2019 so the offset is fixed
function yearRange(year) {
  return {
    start: new Date(`${year}-01-01T00:00:00-03:00`),
    end: new Date(`${year + 1}-01-01T00:00:00-03:00`),
  };
}

function cleanLogin(raw) {
  return (raw || "")
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
}

function getOrCreate(map, key, create) {
  let value = map.get(key);
  if (value === undefined) {
    value = create();
    map.set(key, value);
  }
  return value;
}

function bump(map, key, by = 1) {
  map.set(key, (map.get(key) || 0) + by);
}

function topEntries(map, n, keyName) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ [keyName]: key, count }));
}

function pickSnapshotFields(cookie, dungeon) {
  return {
    cookie: cookie
      ? Object.fromEntries(
          Object.values(COOKIE_FIELDS).map((f) => [f, cookie[f] || 0])
        )
      : null,
    dungeon: dungeon
      ? Object.fromEntries(DUNGEON_FIELDS.map((f) => [f, dungeon[f] || 0]))
      : null,
  };
}

// reads cookie.json and dungeon.json from a backup-db.js dump
function snapshotFromBackup(dir) {
  const read = (name) =>
    JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));
  const cookies = new Map(read("cookie").map((d) => [d.userId, d]));
  const dungeons = new Map(read("dungeon").map((d) => [d.userId, d]));

  const snapshot = new Map();
  for (const userId of new Set([...cookies.keys(), ...dungeons.keys()])) {
    if (!userId) continue;
    snapshot.set(
      userId,
      pickSnapshotFields(cookies.get(userId), dungeons.get(userId))
    );
  }
  return snapshot;
}

// one collection per year, like wrapped<year>
function wrappedCollection(year) {
  return `wrapped${year}`;
}

function snapshotCollection(year) {
  return `wrappedsnapshot${year}`;
}

async function snapshotFromDb(mongo, year) {
  const docs = await mongo.collection(snapshotCollection(year)).find().toArray();
  return new Map(docs.map((d) => [d._id, d]));
}

function longestStreak(days) {
  let best = { days: 0, start: null, end: null };
  let start = null;
  let prev = null;
  let length = 0;
  for (const day of days) {
    const time = Date.parse(`${day}T00:00:00Z`);
    if (prev !== null && time - prev === 86_400_000) {
      length++;
    } else {
      start = day;
      length = 1;
    }
    if (length > best.days) best = { days: length, start, end: day };
    prev = time;
  }
  return best;
}

function diffCounters(current, before, fields) {
  const result = {};
  for (const [name, field] of Object.entries(fields)) {
    // counters can go back to 0 when a doc gets deleted and recreated
    result[name] = Math.max(0, (current?.[field] || 0) - (before?.[field] || 0));
  }
  return result;
}

// !dungeon calls also count show/rank/cooldown, so played comes from the counters
function dungeonStats(current, before) {
  const diff = diffCounters(current, before, {
    wins: "wins",
    losses: "losses",
    xpGained: "xp",
    levelsGained: "level",
  });
  return { played: diff.wins + diff.losses, ...diff, level: current.level || 0 };
}

async function computeWrapped(mongo, year, { snapshot } = {}) {
  const { start, end } = yearRange(year);
  const prev = yearRange(year - 1);
  const commandlog = mongo.collection("commandlog");
  const inYear = { $match: { sentDate: { $gte: start, $lt: end } } };
  const aggregate = (pipeline) =>
    commandlog.aggregate([inYear, ...pipeline], { allowDiskUse: true }).toArray();

  snapshot = snapshot || (await snapshotFromDb(mongo, year - 1));
  // without it cookie/dungeon would silently show lifetime numbers as this year's
  if (!snapshot.size) {
    throw new Error(
      `${snapshotCollection(year - 1)} is empty, run scripts/import-wrapped-snapshot.js first`
    );
  }

  const [
    commandRows,
    userRows,
    dayRows,
    hourRows,
    channelRows,
    targetRows,
    claimRows,
    prevRows,
    reminds,
  ] = await Promise.all([
    aggregate([
      {
        $group: {
          _id: { u: "$userId", c: "$command" },
          n: { $sum: 1 },
          custom: { $max: "$custom" },
        },
      },
    ]),
    aggregate([
      {
        $group: {
          _id: "$userId",
          login: { $top: { sortBy: { sentDate: -1 }, output: "$user" } },
          first: {
            $top: {
              sortBy: { sentDate: 1 },
              output: { command: "$command", channel: "$channel", sentDate: "$sentDate" },
            },
          },
        },
      },
    ]),
    aggregate([
      {
        $group: {
          _id: {
            u: "$userId",
            d: { $dateToString: { format: "%Y-%m-%d", date: "$sentDate", timezone: TZ } },
          },
          n: { $sum: 1 },
        },
      },
    ]),
    aggregate([
      {
        $group: {
          _id: {
            u: "$userId",
            // 1 = sunday
            dow: { $dayOfWeek: { date: "$sentDate", timezone: TZ } },
            h: { $hour: { date: "$sentDate", timezone: TZ } },
          },
          n: { $sum: 1 },
        },
      },
    ]),
    aggregate([
      { $match: { channel: { $type: "string" } } },
      { $group: { _id: { u: "$userId", ch: "$channel" }, n: { $sum: 1 } } },
    ]),
    aggregate([
      {
        $match: {
          $or: [
            { command: { $in: [...FRIENDLY_COMMANDS, ...HOSTILE_COMMANDS, "afk"] } },
            {
              command: "cookie",
              response: { $regex: /^Você (?:ia roubar|roubou|quase roubou|ofereceu)/ },
            },
          ],
        },
      },
      { $project: { _id: 0, userId: 1, user: 1, command: 1, content: 1, response: 1 } },
    ]),
    // only the cd that actually claimed, not the "already claimed today" ones
    aggregate([
      { $match: { command: "cd", response: { $regex: /^Você resgatou/ } } },
      { $group: { _id: "$userId", n: { $sum: 1 } } },
    ]),
    commandlog
      .aggregate(
        [
          { $match: { sentDate: { $gte: prev.start, $lt: prev.end } } },
          { $group: { _id: "$userId", n: { $sum: 1 } } },
        ],
        { allowDiskUse: true }
      )
      .toArray(),
    mongo
      .collection("remind")
      .find(
        {
          remindTime: {
            $gte: Math.floor(start.getTime() / 1000),
            $lt: Math.floor(end.getTime() / 1000),
          },
        },
        { projection: { _id: 0, senderId: 1, receiverId: 1 } }
      )
      .toArray(),
  ]);

  const users = new Map();
  const newUser = (userId) => ({
    userId,
    login: null,
    first: null,
    commands: new Map(),
    customCount: 0,
    days: new Map(),
    heatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    channels: new Map(),
    friendlyGiven: new Map(),
    friendlyReceived: new Map(),
    hostileGiven: new Map(),
    hostileReceived: new Map(),
    stealsGiven: new Map(),
    stealsReceived: new Map(),
    giftsGiven: new Map(),
    giftsReceived: new Map(),
    afkTypes: new Map(),
    remindsSent: new Map(),
    remindsReceived: new Map(),
  });
  const user = (userId) => getOrCreate(users, userId, () => newUser(userId));

  // global usage, for percentile, rarest command and archetype weights
  const globalCommands = new Map();
  const globalCommandUsers = new Map();
  for (const { _id, n, custom } of commandRows) {
    const u = user(_id.u);
    if (custom) {
      u.customCount += n;
      continue;
    }
    u.commands.set(_id.c, n);
    bump(globalCommands, _id.c, n);
    bump(globalCommandUsers, _id.c);
  }

  for (const { _id, login, first } of userRows) {
    const u = user(_id);
    u.login = login;
    u.first = first;
  }

  const globalDays = new Map();
  for (const { _id, n } of dayRows) {
    user(_id.u).days.set(_id.d, n);
    bump(globalDays, _id.d, n);
  }

  for (const { _id, n } of hourRows) {
    user(_id.u).heatmap[_id.dow - 1][_id.h] = n;
  }

  for (const { _id, n } of channelRows) {
    user(_id.u).channels.set(_id.ch, n);
  }

  // logins of everyone with a wrapped, so targets can be credited back to them
  const loginToId = new Map();
  for (const u of users.values()) if (u.login) loginToId.set(u.login, u.userId);
  const knownUsers = await mongo
    .collection("users")
    .find(
      { userid: { $in: [...users.keys()] } },
      { projection: { _id: 0, userid: 1, currAlias: 1, aliases: 1, firstSeen: 1 } }
    )
    .toArray();
  const firstSeen = new Map();
  for (const doc of knownUsers) {
    for (const alias of doc.aliases || []) {
      if (!loginToId.has(alias)) loginToId.set(alias, doc.userid);
    }
    if (doc.currAlias) loginToId.set(doc.currAlias, doc.userid);
    if (doc.firstSeen) firstSeen.set(doc.userid, doc.firstSeen);
  }

  const botLogins = new Set(
    ["folhinha", "folhinhabot", cleanLogin(process.env.BOT_USERNAME)].filter(Boolean)
  );
  const credit = (givenKey, receivedKey, sender, target) => {
    if (!target || target === sender.login || botLogins.has(target)) return;
    bump(sender[givenKey], target);
    const targetId = loginToId.get(target);
    if (targetId && users.has(targetId)) {
      bump(users.get(targetId)[receivedKey], sender.login);
    }
  };

  for (const row of targetRows) {
    const sender = user(row.userId);
    sender.login = sender.login || row.user;
    const args = (row.content || "").trim().split(/\s+/);

    if (row.command === "afk") {
      // the alias used is the afk type (dormir, gym, ...)
      const type = (args[0] || "").replace(/^[^\p{L}]+/u, "").toLowerCase();
      if (type) bump(sender.afkTypes, type);
    } else if (FRIENDLY_COMMANDS.includes(row.command)) {
      credit("friendlyGiven", "friendlyReceived", sender, cleanLogin(args[1]));
    } else if (HOSTILE_COMMANDS.includes(row.command)) {
      credit("hostileGiven", "hostileReceived", sender, cleanLogin(args[1]));
    } else if (row.command === "cookie") {
      const steal = STEAL_RESPONSE.exec(row.response || "");
      const gift = GIFT_RESPONSE.exec(row.response || "");
      if (steal) credit("stealsGiven", "stealsReceived", sender, cleanLogin(steal[1]));
      if (gift) credit("giftsGiven", "giftsReceived", sender, cleanLogin(gift[1]));
    }
  }

  // reminds only have ids, resolve them to logins at the end
  const idToLogin = new Map([...loginToId].map(([login, id]) => [id, login]));
  for (const u of users.values()) if (u.login) idToLogin.set(u.userId, u.login);
  const remindIds = new Set();
  for (const { senderId, receiverId } of reminds) {
    if (!senderId || !receiverId || senderId === receiverId) continue;
    if (users.has(senderId)) bump(users.get(senderId).remindsSent, receiverId);
    if (users.has(receiverId)) bump(users.get(receiverId).remindsReceived, senderId);
    remindIds.add(senderId);
    remindIds.add(receiverId);
  }
  const missingIds = [...remindIds].filter((id) => !idToLogin.has(id));
  if (missingIds.length) {
    const docs = await mongo
      .collection("users")
      .find({ userid: { $in: missingIds } }, { projection: { _id: 0, userid: 1, currAlias: 1 } })
      .toArray();
    for (const doc of docs) idToLogin.set(doc.userid, doc.currAlias);
  }
  const remindsToLogins = (map) => {
    const byLogin = new Map();
    for (const [id, n] of map) bump(byLogin, idToLogin.get(id) || id, n);
    return byLogin;
  };

  const userIds = [...users.keys()];
  const [cookies, dungeons] = await Promise.all(
    ["cookie", "dungeon"].map((name) =>
      mongo
        .collection(name)
        .find({ userId: { $in: userIds } })
        .toArray()
        .then((docs) => new Map(docs.map((d) => [d.userId, d])))
    )
  );

  const prevTotals = new Map(prevRows.map(({ _id, n }) => [_id, n]));
  const dailyClaims = new Map(claimRows.map(({ _id, n }) => [_id, n]));
  const globalTotal = [...globalCommands.values()].reduce((a, b) => a + b, 0);
  const globalArchetype = new Map();
  for (const [command, n] of globalCommands) {
    if (COMMAND_ARCHETYPE[command]) bump(globalArchetype, COMMAND_ARCHETYPE[command], n);
  }

  // first pass builds the per user numbers that get ranked
  const results = new Map();
  for (const u of users.values()) {
    const commandTotal = [...u.commands.values()].reduce((a, b) => a + b, 0);
    const total = commandTotal + u.customCount;
    const days = [...u.days.keys()].sort();

    let archetype = null;
    if (commandTotal >= ARCHETYPE_MIN_TOTAL) {
      const perArchetype = new Map();
      for (const [command, n] of u.commands) {
        if (COMMAND_ARCHETYPE[command]) bump(perArchetype, COMMAND_ARCHETYPE[command], n);
      }
      // weighted by global share, otherwise everyone is a gamer because of dungeon
      for (const [id, n] of perArchetype) {
        if (n < ARCHETYPE_MIN_CATEGORY) continue;
        const score = n / commandTotal / (globalArchetype.get(id) / globalTotal);
        if (!archetype || score > archetype.score) {
          archetype = { id, label: ARCHETYPES[id].label, emoji: ARCHETYPES[id].emoji, score };
        }
      }
      if (archetype) archetype.score = Math.round(archetype.score * 100) / 100;
    }

    let rarest = null;
    for (const [command, n] of u.commands) {
      const usedBy = globalCommandUsers.get(command);
      if (
        !rarest ||
        usedBy < rarest.users ||
        (usedBy === rarest.users && globalCommands.get(command) < rarest.globalCount)
      ) {
        rarest = { command, count: n, users: usedBy, globalCount: globalCommands.get(command) };
      }
    }

    const months = new Array(12).fill(0);
    let busiestDay = null;
    for (const [day, n] of u.days) {
      months[Number(day.slice(5, 7)) - 1] += n;
      if (!busiestDay || n > busiestDay.count) busiestDay = { date: day, count: n };
    }

    const hourTotals = new Array(24).fill(0);
    for (const row of u.heatmap) row.forEach((n, h) => (hourTotals[h] += n));
    const nightCommands = hourTotals.slice(0, 6).reduce((a, b) => a + b, 0);

    const snap = snapshot.get(u.userId) || {};
    const cookie = cookies.get(u.userId);
    const dungeon = dungeons.get(u.userId);

    results.set(u.userId, {
      _id: u.userId,
      userId: u.userId,
      username: u.login,
      firstSeen: firstSeen.get(u.userId) || null,
      commands: {
        total,
        custom: u.customCount,
        distinct: u.commands.size,
        previousYear: prevTotals.get(u.userId) || 0,
        top: topEntries(u.commands, TOP_N, "command"),
        all: topEntries(u.commands, Infinity, "command"),
        rarest,
        first: u.first,
      },
      activity: {
        activeDays: days.length,
        longestStreak: longestStreak(days),
        busiestDay,
        busiestMonth: months.indexOf(Math.max(...months)) + 1,
        months,
        heatmap: u.heatmap,
        busiestHour: hourTotals.indexOf(Math.max(...hourTotals)),
        nightShare: total ? Math.round((nightCommands / total) * 100) / 100 : 0,
      },
      channels: {
        count: u.channels.size,
        top: topEntries(u.channels, TOP_N, "channel"),
      },
      archetype,
      social: {
        friendly: {
          given: topEntries(u.friendlyGiven, 3, "user"),
          received: topEntries(u.friendlyReceived, 3, "user"),
        },
        hostile: {
          given: topEntries(u.hostileGiven, 3, "user"),
          received: topEntries(u.hostileReceived, 3, "user"),
        },
        reminds: {
          sent: [...u.remindsSent.values()].reduce((a, b) => a + b, 0),
          received: [...u.remindsReceived.values()].reduce((a, b) => a + b, 0),
          topSentTo: topEntries(remindsToLogins(u.remindsSent), 3, "user"),
          topReceivedFrom: topEntries(remindsToLogins(u.remindsReceived), 3, "user"),
        },
      },
      afk: {
        count: (u.commands.get("afk") || 0),
        types: topEntries(u.afkTypes, 3, "type"),
      },
      pet: {
        carinho: u.commands.get("carinho") || 0,
        brincar: u.commands.get("brincar") || 0,
      },
      cookie: cookie
        ? {
            ...diffCounters(cookie, snap.cookie, COOKIE_FIELDS),
            // can be negative, ambushes take cookies away
            total: cookie.total || 0,
            dailyClaims: dailyClaims.get(u.userId) || 0,
            topGiftedTo: topEntries(u.giftsGiven, 3, "user"),
            topGiftedBy: topEntries(u.giftsReceived, 3, "user"),
            // attempts, failed ones included
            topStealTargets: topEntries(u.stealsGiven, 3, "user"),
            topStealAttemptsBy: topEntries(u.stealsReceived, 3, "user"),
          }
        : null,
      dungeon: dungeon ? dungeonStats(dungeon, snap.dungeon) : null,
    });
  }

  // second pass, ranks against everyone
  const ranked = [...results.values()];
  const rankBy = (getValue, setRank) => {
    const values = ranked.map(getValue).filter((v) => v > 0).sort((a, b) => b - a);
    for (const r of ranked) {
      const value = getValue(r);
      if (!(value > 0)) continue;
      // ties share the best rank
      let lo = 0;
      let hi = values.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (values[mid] > value) lo = mid + 1;
        else hi = mid;
      }
      setRank(r, lo + 1, values.length);
    }
  };
  rankBy(
    (r) => r.commands.total,
    (r, rank, of) => {
      r.commands.rank = rank;
      r.commands.rankOf = of;
      r.commands.topPercent = Math.max(1, Math.ceil((rank / of) * 100));
    }
  );
  rankBy(
    (r) => r.dungeon?.xpGained || 0,
    (r, rank, of) => Object.assign(r.dungeon, { xpRank: rank, xpRankOf: of })
  );
  rankBy(
    (r) => r.activity.longestStreak.days,
    (r, rank, of) => Object.assign(r.activity.longestStreak, { rank, rankOf: of })
  );

  const busiestGlobalDay = topEntries(globalDays, 1, "date")[0] || null;
  const global = {
    _id: "global",
    totalCommands: globalTotal + ranked.reduce((a, r) => a + r.commands.custom, 0),
    users: ranked.length,
    previousYear: prevRows.reduce((a, { n }) => a + n, 0),
    // users gets a doc for anyone seen chatting, not only bot users
    newChatters: await mongo.collection("users").countDocuments({
      firstSeen: {
        $gte: Math.floor(start.getTime() / 1000),
        $lt: Math.floor(end.getTime() / 1000),
      },
    }),
    topCommands: topEntries(globalCommands, 10, "command"),
    busiestDay: busiestGlobalDay,
    reminds: reminds.length,
    computedAt: new Date(),
  };

  return { users: ranked, global };
}

async function saveWrapped(mongo, year, { users, global }) {
  const ops = [...users, global].map((doc) => ({
    replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
  }));
  return mongo.collection(wrappedCollection(year)).bulkWrite(ops, { ordered: false });
}

module.exports = {
  ARCHETYPES,
  yearRange,
  wrappedCollection,
  snapshotCollection,
  computeWrapped,
  saveWrapped,
  snapshotFromBackup,
  pickSnapshotFields,
};
