// Initialization utilities for the application
const { ApiClient } = require("@twurple/api");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

async function initializeUtilities() {
  const Utils = require("./utils/index");
  const Emotes = require("./emotes/index");
  const MongoUtils = require("../db/index");
  const Logger = require("../log/index");

  const utils = new Utils();
  const emotes = new Emotes();
  const db = new MongoUtils();
  const log = new Logger();

  return { utils, emotes, db, log };
}
async function initializeAuthProvider() {
  const AuthProvider = require("../clients/twitch/auth-provider");
  const authProvider = new AuthProvider();
  await authProvider.init();
  return authProvider;
}

async function initializeAPIs() {
  const allApis = require("../apis/index");
  return {
    ...Object.fromEntries(
      Object.entries(allApis).map(([key, Api]) => [key, new Api()])
    ),
  };
}

async function initializeApiClient() {
  const apiClient = new ApiClient({ authProvider: fb.authProvider.provider });
  return apiClient;
}

async function initializeDiscord() {
  const DiscordClient = require("../clients/discord");
  const discord = new DiscordClient();
  await discord.init();
  return discord;
}

async function initializeTwitch() {
  const TwitchClient = require("../clients/twitch");
  const twitch = new TwitchClient();
  await twitch.init();
  return twitch;
}

async function initializeClickHouse() {
  const ClickHouseClient = require("../clients/clickhouse");
  const clickhouse = new ClickHouseClient();
  await clickhouse.init();
  return clickhouse;
}

async function initializeEventSubListener() {
  const EventSubListener = require("../clients/twitch/event-sub/listener");
  const eventSub = new EventSubListener();
  await eventSub.init();

  // Fetch moderated channels cache once before checking initial status for all channels
  await eventSub.fetchModeratedChannels();

  // Check initial status and subscribe to events for all connected channels
  const channelsToJoin = await getChannelsToJoin();
  await Promise.all(
    channelsToJoin.map(async (channel) => {
      const broadcasterId = channel.id;
      try {
        // Check initial mod/VIP status (will use cached moderated channels if available)
        await eventSub.checkInitialStatus(broadcasterId);
        // Subscribe to events
        await eventSub.subscribeToChannel(broadcasterId);
      } catch (error) {
        console.error(
          `Error setting up EventSub for channel ${channel.login} (${broadcasterId}):`,
          error
        );
      }
    })
  );

  // Populate liveChannels with current stream status on startup
  try {
    const userIds = channelsToJoin.map((channel) => channel.id);
    if (userIds.length > 0) {
      const liveStreams = await fb.api.helix.getStreamsByUserIds(userIds);
      for (const stream of liveStreams) {
        const channelAuth = await fb.db.get("auth", {
          user_id: stream.channelId,
        });
        if (channelAuth) {
          eventSub.liveChannels.set(stream.channelId, stream);
        }
      }
      console.log(
        `* Populated liveChannels with ${eventSub.liveChannels.size} currently live streams`
      );
    }
  } catch (error) {
    console.error(`Error populating liveChannels on startup: ${error.message}`);
    // Don't fail initialization - EventSub will catch up with real-time events
  }

  return eventSub;
}

async function restartProcess(reason) {
  try {
    if (fb && fb.discord) {
      fb.discord.importantLog &&
        fb.discord.importantLog(
          `* Reiniciando devido a: ${
            reason || "motivo desconhecido (check logs)"
          }`
        );
    }
    // give time for any log to be sent
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await execAsync("docker compose -p folhinha restart");
  } catch (error) {
    console.error("Error restarting container from init.js:", error);
  }
}

async function getChannelsToJoin() {
  // Ensure fb object is available
  if (!fb || !fb.api || !fb.api.helix || !fb.db) {
    throw new Error("fb object not properly initialized");
  }

  // If not in production, return dev test channels
  if (process.env.ENV !== "prod") {
    const devTestChannels = process.env.DEV_TEST_CHANNELS.split(",")
      .map((channel) => channel.trim())
      .filter((channel) => channel);

    if (devTestChannels.length === 0) {
      return [];
    }

    // Get channel info for each dev test channel
    const devTestChannelsInfo = [];
    for (const channel of devTestChannels) {
      const channelInfo = await fb.api.helix.getUserByUsername(channel);
      if (channelInfo) {
        devTestChannelsInfo.push(channelInfo);
      }
    }

    return devTestChannelsInfo;
  }

  try {
    const configs = await fb.db.get("config", { state: "active" });
    const channelIdsToJoin = Array.isArray(configs)
      ? configs.map((channel) => channel.channelId)
      : [];

    if (!channelIdsToJoin || channelIdsToJoin.length === 0) {
      await restartProcess("Failed to get channelIdsToJoin");
      // returning empty array just in case
      return [];
    }

    // Get channel names from user IDs using the helix API
    const channelsToJoin =
      await fb.api.helix.getManyUsersByUserIDs(channelIdsToJoin);

    return channelsToJoin || [];
  } catch (error) {
    console.error("Error getting channels to join:", error);
    return [];
  }
}

async function getTokenData() {
  try {
    // Ensure fb object is available
    if (!fb || !fb.db) {
      throw new Error("fb object not properly initialized");
    }

    // Get all auth tokens from the database
    const authTokensRaw = await fb.db.get("auth", {});
    const authTokens = Array.isArray(authTokensRaw) ? authTokensRaw : [];

    if (!authTokens || authTokens.length === 0) {
      await restartProcess("Failed to get authTokens");
      // In case restart fails, return empty array
      return [];
    }

    // Map database fields to the format expected by addUsers method
    return authTokens.map((token) => ({
      userId: token.user_id,
      username: token.username,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      scope: token.scope,
      expiresIn: token.expires_at
        ? Math.floor((new Date(token.expires_at) - new Date()) / 1000)
        : null,
      obtainmentTimestamp: token.created_at
        ? Math.floor(new Date(token.created_at).getTime() / 1000)
        : null,
    }));
  } catch (error) {
    console.error("Error fetching token data from database:", error);
    return [];
  }
}

module.exports = {
  initializeUtilities,
  initializeAPIs,
  initializeApiClient,
  initializeDiscord,
  initializeAuthProvider,
  initializeTwitch,
  initializeClickHouse,
  initializeEventSubListener,
  getChannelsToJoin,
  getTokenData,
};
