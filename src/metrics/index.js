// prometheus metrics, served on their own port so they never reach the public api server
// counters are updated where things happen, gauges are read from memory when prometheus scrapes
const http = require("http");
const client = require("prom-client");

const PREFIX = "folhinha_";
const register = new client.Registry();

function counter(name, help, labelNames = []) {
  return new client.Counter({
    name: PREFIX + name,
    help,
    labelNames,
    registers: [register],
  });
}

function histogram(name, help, labelNames, buckets) {
  return new client.Histogram({
    name: PREFIX + name,
    help,
    labelNames,
    buckets,
    registers: [register],
  });
}

// collect runs at scrape time, it must only read memory (never mongo or apis)
function gauge(name, help, labelNames, collect) {
  return new client.Gauge({
    name: PREFIX + name,
    help,
    labelNames,
    registers: [register],
    collect() {
      try {
        collect(this);
      } catch (err) {
        console.error(`metrics: failed to collect ${name}:`, err);
      }
    },
  });
}

// hosts the bot calls on its own, anything else (e.g. user-supplied urls) is "other"
const KNOWN_HOSTS = new Set([
  "7tv.io",
  "api.7tv.app",
  "cdn.7tv.app",
  "api.betterttv.net",
  "api.frankerfacez.com",
  "emotes.adamcy.pl",
  "api.twitch.tv",
  "id.twitch.tv",
  "gql.twitch.tv",
  "clips.twitch.tv",
  "api.ivr.fi",
  "roles.tv",
  "tv.supa.sh",
  "api.potat.app",
  "api.streamelements.com",
  "api.fuchsty.de",
  "logs.folhinhabot.com",
  "logs.zonian.dev",
  "logs.spanix.team",
  "www.googleapis.com",
  "translate.googleapis.com",
  "generativelanguage.googleapis.com",
  "api.openai.com",
  "api.github.com",
  "api.linear.app",
  "ws.audioscrobbler.com",
  "api.open-meteo.com",
  "nominatim.openstreetmap.org",
  "api.rawg.io",
  "api.isthereanydeal.com",
  "www.omdbapi.com",
  "api.wolframalpha.com",
  "www.thecolorapi.com",
  "howlongtobeat.com",
  "letterboxd.com",
  "pt.wikipedia.org",
  "ordemparanormal.fandom.com",
  "this-person-does-not-exist.com",
  "perchance.org",
  "sitecheck.sucuri.net",
  "f.feridinha.com",
  "feridinha.com",
  "shlink.mrchuw.com.br",
  "leafyrino.leafyzito.dev",
  "fun.joet.me",
  "cobalt",
  "twitchclipper",
]);

function hostLabel(url) {
  try {
    const host = new URL(String(url)).hostname.toLowerCase();
    return KNOWN_HOSTS.has(host) ? host : "other";
  } catch {
    return "other";
  }
}

const commands = counter(
  "commands_total",
  "Commands that passed validation and ran",
  ["command", "custom"]
);
const commandDuration = histogram(
  "command_duration_seconds",
  "Time from receiving a command to having its reply, before the send cooldown",
  ["command"],
  [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 30, 60]
);
const commandErrors = counter(
  "command_errors_total",
  "Built-in commands that threw",
  ["command"]
);
const commandsBlocked = counter(
  "commands_blocked_total",
  "Commands stopped before running, by reason",
  ["reason"]
);
const replyWait = histogram(
  "reply_wait_seconds",
  "Time spent in the per-channel send cooldown before a message goes out",
  ["privileged"],
  [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 1.5, 2, 3]
);
const sendFailures = counter(
  "send_failures_total",
  "Chat send errors, by type",
  ["type"]
);
const httpRequests = counter(
  "http_requests_total",
  "Outgoing http requests made through fb.got",
  ["host", "outcome"]
);
const httpDuration = histogram(
  "http_request_duration_seconds",
  "Outgoing http request time",
  ["host", "outcome"],
  [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
);
const dbOps = counter(
  "db_ops_total",
  "Mongo round trips (cache hits don't count)",
  ["collection", "op", "outcome"]
);
const dbOpDuration = histogram(
  "db_op_duration_seconds",
  "Mongo round trip time",
  ["op"],
  [0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5]
);
const dbCacheHits = counter(
  "db_cache_hits_total",
  "Reads answered from the in-memory cache",
  ["collection"]
);
const dbCacheMisses = counter(
  "db_cache_misses_total",
  "Keyed cache reads that had to go to mongo",
  ["collection"]
);
const changeStreamRestarts = counter(
  "change_stream_restarts_total",
  "Change stream failures, by how it recovered",
  ["kind"]
);
const ircConnects = counter("irc_connects_total", "Anon chat client connects");
const ircDisconnects = counter(
  "irc_disconnects_total",
  "Anon chat client disconnects"
);
const chatMessages = counter(
  "chat_messages_total",
  "Chat messages seen, by channel",
  ["channel"]
);
const chatModeration = counter(
  "chat_moderation_total",
  "Timeouts and bans seen in chat, by channel",
  ["channel", "type"]
);
const botModerated = counter(
  "bot_moderated_total",
  "Timeouts and bans of the bot itself",
  ["type"]
);
const eventsubNotifications = counter(
  "eventsub_notifications_total",
  "EventSub notifications received, by type",
  ["type"]
);
const eventsubRevocations = counter(
  "eventsub_revocations_total",
  "EventSub subscriptions revoked by Twitch, by status",
  ["status"]
);
const eventsubSubscriptionFailures = counter(
  "eventsub_subscription_failures_total",
  "EventSub subscriptions that failed to create or verify"
);
const taskRuns = counter(
  "task_runs_total",
  "Recurring task runs, by outcome",
  ["task", "outcome"]
);
const taskLastSuccess = new client.Gauge({
  name: PREFIX + "task_last_success_timestamp_seconds",
  help: "When each recurring task last finished without throwing",
  labelNames: ["task"],
  registers: [register],
});

gauge("irc_channels_joined", "Channels the anon client is in", [], (g) => {
  const anon = global.fb?.twitch?.anonClient;
  if (anon) {
    g.set(anon.currentChannels.length);
  }
});

gauge(
  "irc_channels_configured",
  "Channels the bot should be in",
  [],
  (g) => {
    const anon = global.fb?.twitch?.anonClient;
    if (anon) {
      g.set(anon.channelsToJoin.length);
    }
  }
);

gauge(
  "channels_live",
  "Joined channels live right now, from EventSub stream events",
  [],
  (g) => {
    const liveStatus = global.fb?.twitch?.eventSub?.liveStatus;
    if (!liveStatus) {
      return;
    }
    let live = 0;
    for (const { live: isLive } of liveStatus.channels.values()) {
      if (isLive === true) {
        live++;
      }
    }
    g.set(live);
  }
);

gauge(
  "db_cache_entries",
  "Docs held in each in-memory collection cache",
  ["collection"],
  (g) => {
    const stats = global.fb?.db?.cacheStats();
    for (const [collection, { size }] of Object.entries(stats ?? {})) {
      g.set({ collection }, size);
    }
  }
);

// full collections are entirely in memory, so these never touch mongo
function countCached(collection, predicate) {
  const cache = global.fb?.db?.caches?.[collection];
  if (!cache?.docs) {
    return null;
  }
  let count = 0;
  for (const doc of cache.docs.values()) {
    if (predicate(doc)) {
      count++;
    }
  }
  return count;
}

function cachedGauge(name, help, collection, predicate) {
  gauge(name, help, [], (g) => {
    const count = countCached(collection, predicate);
    if (count !== null) {
      g.set(count);
    }
  });
}

const isActive = (config) => config.state === "active";
cachedGauge("pets_alive", "Pets alive", "pet", (pet) => pet.is_alive === true);
cachedGauge(
  "channels_paused",
  "Active channels with the bot paused",
  "config",
  (config) => isActive(config) && config.isPaused === true
);
cachedGauge(
  "channels_offline_only",
  "Active channels where commands only work offline",
  "config",
  (config) => isActive(config) && config.offlineOnly === true
);
cachedGauge(
  "channels_bot_mod",
  "Active channels where the bot is a moderator",
  "config",
  (config) => isActive(config) && config.botIsMod === true
);
cachedGauge(
  "custom_commands",
  "Custom commands across all channels",
  "customcommands",
  () => true
);
cachedGauge(
  "users_banned",
  "Users banned from at least one command",
  "bans",
  (ban) => (ban.bannedCommands?.length ?? 0) > 0
);

// so dashboards can list commands nobody uses
gauge(
  "command_registered",
  "1 for each loaded built-in command",
  ["command"],
  (g) => {
    const list = global.fb?.commandsList;
    if (!list) {
      return;
    }
    g.reset();
    for (const command of new Set(
      Object.values(list).map((c) => c.commandName)
    )) {
      if (command) {
        g.set({ command }, 1);
      }
    }
  }
);

// times a mongo round trip, rethrows so callers keep their own error handling
async function timeDbOp(collection, op, fn) {
  const end = dbOpDuration.startTimer({ op });
  try {
    const result = await fn();
    dbOps.inc({ collection, op, outcome: "ok" });
    return result;
  } catch (err) {
    dbOps.inc({ collection, op, outcome: "error" });
    throw err;
  } finally {
    end();
  }
}

// runs a recurring task and records how it went. rethrows, so a failing task behaves as before
async function runTask(task, fn) {
  try {
    await fn();
  } catch (err) {
    taskRuns.inc({ task, outcome: "error" });
    throw err;
  }
  taskRuns.inc({ task, outcome: "ok" });
  taskLastSuccess.set({ task }, Date.now() / 1000);
}

let server = null;

// only starts when METRICS_PORT is set, without it the counters just stay in memory
function startMetricsServer() {
  const port = Number(process.env.METRICS_PORT);
  if (!port || server) {
    return;
  }

  client.collectDefaultMetrics({ register, prefix: PREFIX });

  server = http.createServer(async (req, res) => {
    if (req.method !== "GET" || req.url !== "/metrics") {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = await register.metrics();
      res.writeHead(200, { "Content-Type": register.contentType }).end(body);
    } catch (err) {
      console.error("metrics: scrape failed:", err);
      res.writeHead(500).end();
    }
  });
  server.on("error", (err) => {
    console.error(`metrics: server error on port ${port}:`, err);
  });
  server.listen(port, () => {
    console.info(`* Metrics server listening on port ${port}`);
  });
}

module.exports = {
  register,
  startMetricsServer,
  hostLabel,
  timeDbOp,
  runTask,
  commands,
  commandDuration,
  commandErrors,
  commandsBlocked,
  replyWait,
  sendFailures,
  httpRequests,
  httpDuration,
  dbCacheHits,
  dbCacheMisses,
  changeStreamRestarts,
  ircConnects,
  ircDisconnects,
  chatMessages,
  chatModeration,
  botModerated,
  eventsubNotifications,
  eventsubRevocations,
  eventsubSubscriptionFailures,
};
