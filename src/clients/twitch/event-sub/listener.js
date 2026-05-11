require("dotenv").config();
const { EventSubWsListener } = require("@twurple/eventsub-ws");
const { ApiClient } = require("@twurple/api");

// Import EventSub modules
const {
  subscribeToChannel: subscribeToChannelHandler,
  unsubscribeFromChannel: unsubscribeFromChannelHandler,
} = require("./subscriptions");
const {
  checkInitialStatus: checkInitialStatusHandler,
} = require("./initial-status-check");
const {
  isChannelLive: isChannelLiveUtil,
  getAllLiveChannels: getAllLiveChannelsUtil,
  hasScope,
} = require("./utils");

class EventSubListener {
  constructor() {
    // Initialize EventSubWsListener with the apiClient
    // The apiClient will use tokens from fb.authProvider.provider
    this.listener = new EventSubWsListener({
      apiClient: fb.api.twurple,
    });

    // Track subscribed channels
    this.subscribedChannels = new Set();

    // Track live channels: Map<channelId, { channelName, isLive, startedAt }>
    this.liveChannels = new Map();

    // Cache for moderated channels (Set of broadcaster IDs where bot is a mod)
    this.moderatedChannels = null;
  }

  async init() {
    try {
      // Start the EventSub listener
      await this.listener.start();
      console.info("* EventSub listener started");

      // Register event handlers
      this.registerEventHandlers();
    } catch (error) {
      console.error("Error initializing EventSub listener:", error);
      if (fb.discord && fb.discord.logError) {
        fb.discord.logError(
          `EventSub listener initialization failed: ${error.message}`
        );
      }
      throw error;
    }
  }

  registerEventHandlers() {
    // Note: Event handlers are registered per broadcaster when subscribing
    // These are the handler methods that will be called
  }

  async subscribeToChannel(broadcasterId) {
    await subscribeToChannelHandler(
      this.listener,
      this.subscribedChannels,
      this.liveChannels,
      broadcasterId
    );
  }

  async unsubscribeFromChannel(broadcasterId) {
    await unsubscribeFromChannelHandler(this.subscribedChannels, broadcasterId);
  }

  /**
   * Fetch and cache all channels where the bot has moderator privileges
   * @returns {Promise<Set<string>|null>} Set of broadcaster IDs or null if scope is missing/error occurs
   */
  async fetchModeratedChannels() {
    const botUserId = process.env.BOT_USERID;
    if (!botUserId) {
      console.warn("* Bot user ID not found, skipping moderated channels fetch");
      return null;
    }

    try {
      const botHasModeratedChannelsScope = await hasScope(
        botUserId,
        "user:read:moderated_channels"
      );

      if (!botHasModeratedChannelsScope) {
        console.warn(
          "* Bot does not have user:read:moderated_channels scope, skipping moderated channels fetch"
        );
        this.moderatedChannels = null;
        return null;
      }

      // Create bot-specific ApiClient to use bot's token
      const botApiClient = new ApiClient({
        authProvider: fb.authProvider.provider,
        userId: botUserId,
      });

      // Get all channels where the bot has moderator privileges
      const moderatedChannelsSet = new Set();
      let cursor = null;

      do {
        const result = await botApiClient.moderation.getModeratedChannels(
          botUserId,
          {
            after: cursor,
          }
        );

        if (result && result.data) {
          for (const channel of result.data) {
            // Extract broadcaster_id from channel object (API returns broadcaster_id)
            // Check both snake_case (official API) and camelCase (library normalization)
            const channelBroadcasterId =
              channel.id || channel.broadcaster_id || channel.broadcasterId;

            if (channelBroadcasterId) {
              moderatedChannelsSet.add(String(channelBroadcasterId));
            }
          }
        }

        cursor = result?.cursor || null;
      } while (cursor);

      // Cache the result
      this.moderatedChannels = moderatedChannelsSet;
      console.info(
        `* Fetched and cached ${moderatedChannelsSet.size} moderated channels`
      );

      return moderatedChannelsSet;
    } catch (error) {
      console.error("Error fetching moderated channels:", error);
      this.moderatedChannels = null;
      return null;
    }
  }

  async checkInitialStatus(broadcasterId) {
    await checkInitialStatusHandler(broadcasterId, this.moderatedChannels);
  }

  // Utility method to check if a channel is live
  // Returns live data object if live, null otherwise
  // Can search by channelId or channelName (case-insensitive)
  isChannelLive(channelIdOrName) {
    return isChannelLiveUtil(this.liveChannels, channelIdOrName);
  }

  // Get all live channels
  getAllLiveChannels() {
    return getAllLiveChannelsUtil(this.liveChannels);
  }
}

module.exports = EventSubListener;
