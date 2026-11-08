require("dotenv").config();
const { EventSubMiddleware } = require("@twurple/eventsub-http");

// Import EventSub modules
const { STREAM_KEYS, getDesiredSubscriptions } = require("./subscriptions");
const {
  checkInitialStatus: checkInitialStatusHandler,
} = require("./initial-status-check");
const LiveStatus = require("./live-status");
const { getBroadcasterToken, hasScope } = require("./utils");
const { getChannelsToJoin } = require("../../../utils/init");
const metrics = require("../../../metrics");

const HOST_NAME = "eventsub.folhinhabot.com";
const PATH_PREFIX = "/eventsub";

// New subscriptions verify over time, give them a moment before reporting
const SUMMARY_DELAY = 2 * 60 * 1000;
// One outage can revoke every subscription at once, report those together
const REVOCATION_LOG_DELAY = 5_000;

class EventSubListener {
  constructor() {
    // Webhook subscriptions use an app token and belong to the client ID, so this only runs on prod
    this.listener = new EventSubMiddleware({
      apiClient: fb.api.twurple,
      hostName: HOST_NAME,
      pathPrefix: PATH_PREFIX,
      secret: process.env.EVENTSUB_SECRET,
      // Requests are authenticated by their signature, the host adds nothing to that
      strictHostCheck: false,
      helperRoutes: false,
    });

    // Track each channel's subscriptions: Map<channelId, Map<key, subscription>>
    this.channels = new Map();

    // Which channel and key each subscription belongs to
    this.owners = new WeakMap();

    // Channels that revoked our access, they only get stream events until a new token shows up
    this.revokedAuth = new Set();

    this.liveStatus = new LiveStatus();

    // Cache for moderated channels (Set of broadcaster IDs where bot is a mod)
    this.moderatedChannels = null;

    this.failedSubscriptions = [];
    this.summaryLogged = false;

    // Map<status, count> of revocations waiting to be reported
    this.pendingRevocations = new Map();
    this.revocationLogTimer = null;

    this.listener.onVerify((success, subscription) =>
      this.handleVerification(success, subscription)
    );
    this.listener.onSubscriptionCreateFailure((subscription, error) =>
      this.handleSubscriptionFailure(subscription, error.message)
    );
    this.listener.onRevoke((subscription, status) =>
      this.handleRevocation(subscription, status)
    );
  }

  // Has to go before the rate limiter, Twitch's requests shouldn't be throttled
  mount(app) {
    // Twurple's legacy route deletes a subscription without checking the signature, so nothing can reach it
    app.post(`${PATH_PREFIX}/:id`, (req, res) => res.sendStatus(404));
    this.listener.apply(app);
  }

  // The API server has to be listening by now, Twitch verifies new subscriptions against it
  async start() {
    try {
      // Fetch moderated channels cache once before checking initial status for all channels
      await this.fetchModeratedChannels();

      const channelsToJoin = await getChannelsToJoin();
      await Promise.all(
        channelsToJoin.map(async (channel) => {
          const broadcasterId = channel.id;
          try {
            // Check initial mod/VIP status (will use cached moderated channels if available)
            await this.checkInitialStatus(broadcasterId);
            // Subscribe to events
            await this.subscribeToChannel(broadcasterId);
          } catch (error) {
            console.error(
              `Error setting up EventSub for channel ${channel.login} (${broadcasterId}):`,
              error
            );
          }
        })
      );

      // Subscriptions only reach Twitch from here on, existing ones get resumed
      await this.listener.markAsReady();
      console.info("* EventSub listener started");

      await this.removeStaleSubscriptions();

      await this.liveStatus.refresh(channelsToJoin.map((channel) => channel.id));
    } catch (error) {
      // Commands keep working without events, live status falls back to Helix
      console.error("Error starting EventSub:", error);
      fb.discord.importantLog(`* EventSub failed to start: ${error.message}`);
    }

    setTimeout(() => this.logSummary(), SUMMARY_DELAY);
  }

  // Makes a channel's subscriptions match what it should have, safe to call at any time
  async subscribeToChannel(channelId) {
    const desired = await getDesiredSubscriptions(
      this.listener,
      this.liveStatus,
      channelId,
      this.revokedAuth.has(channelId)
    );

    const current = this.channels.get(channelId) ?? new Map();
    this.channels.set(channelId, current);

    for (const [key, subscription] of current) {
      if (!desired.has(key)) {
        subscription.stop();
        current.delete(key);
      }
    }

    for (const [key, subscribe] of desired) {
      if (!current.has(key)) {
        const subscription = subscribe();
        this.owners.set(subscription, { channelId, key });
        current.set(key, subscription);
      }
    }
  }

  async unsubscribeFromChannel(channelId) {
    const subscriptions = this.channels.get(channelId);
    if (!subscriptions) {
      return; // Not subscribed
    }

    for (const subscription of subscriptions.values()) {
      subscription.stop();
    }
    this.channels.delete(channelId);
    this.revokedAuth.delete(channelId);
    this.liveStatus.delete(channelId);
    console.info(`* Unsubscribed from EventSub events for channel ${channelId}`);
  }

  // Called when a user's token or scopes change, users whose channel we didn't join have nothing to update
  async refreshChannelAuth(channelId) {
    if (!this.channels.has(channelId)) {
      return;
    }

    this.revokedAuth.delete(channelId);
    await this.subscribeToChannel(channelId);
  }

  // Returns true or false if the channel is tracked, null if it should be asked to Helix instead
  getLiveStatus(channelId) {
    const subscriptions = this.channels.get(channelId);
    const isTracked = STREAM_KEYS.every(
      (key) => subscriptions?.get(key)?.verified
    );
    return isTracked ? this.liveStatus.get(channelId) : null;
  }

  handleVerification(success, subscription) {
    if (!success) {
      this.handleSubscriptionFailure(subscription, "verification failed");
      return;
    }

    // Events only tell us about changes, so ask where the channel stands right now
    const owner = this.owners.get(subscription);
    if (owner && STREAM_KEYS.includes(owner.key)) {
      this.liveStatus.queueRefresh(owner.channelId);
    }
  }

  // Dropped so a later sync (new token, rejoin, restart) can create it again
  handleSubscriptionFailure(subscription, reason) {
    metrics.eventsubSubscriptionFailures.inc();
    this.forgetSubscription(subscription);
    subscription.stop();

    console.error(`* EventSub subscription ${subscription.id} failed: ${reason}`);
    if (this.summaryLogged) {
      fb.discord.logError(
        `EventSub subscription ${subscription.id} failed: ${reason}`
      );
    } else {
      this.failedSubscriptions.push(`${subscription.id}: ${reason}`);
    }
  }

  handleRevocation(subscription, status) {
    metrics.eventsubRevocations.inc({ status });
    const channelId = this.forgetSubscription(subscription);
    console.warn(
      `* EventSub subscription ${subscription.id} revoked: ${status}`
    );
    this.reportRevocation(status);

    // Channel was parted, or there's nothing left to subscribe to
    if (
      !this.channels.has(channelId) ||
      status === "user_removed" ||
      status === "version_removed"
    ) {
      return;
    }

    if (status === "authorization_revoked") {
      this.revokedAuth.add(channelId);
    }

    this.subscribeToChannel(channelId).catch((error) => {
      console.error(`Error resubscribing channel ${channelId}:`, error);
    });
  }

  reportRevocation(status) {
    this.pendingRevocations.set(
      status,
      (this.pendingRevocations.get(status) ?? 0) + 1
    );
    if (this.revocationLogTimer) {
      return;
    }

    this.revocationLogTimer = setTimeout(() => {
      const revocations = [...this.pendingRevocations]
        .map(([status, count]) => `${count} ${status}`)
        .join(", ");
      this.pendingRevocations.clear();
      this.revocationLogTimer = null;
      fb.discord.importantLog(`* EventSub revocations: ${revocations}`);
    }, REVOCATION_LOG_DELAY);
  }

  // Removes a subscription from its channel, returns the channel it belonged to
  forgetSubscription(subscription) {
    const owner = this.owners.get(subscription);
    if (!owner) {
      return null;
    }

    const subscriptions = this.channels.get(owner.channelId);
    if (subscriptions?.get(owner.key) === subscription) {
      subscriptions.delete(owner.key);
    }
    return owner.channelId;
  }

  // Deletes what's left on Twitch from channels parted while the bot was down
  async removeStaleSubscriptions() {
    // An empty list means we failed to get the channels, not that every subscription is stale
    if (this.channels.size === 0) {
      return;
    }

    const wanted = new Set();
    for (const subscriptions of this.channels.values()) {
      for (const subscription of subscriptions.values()) {
        wanted.add(subscription.id);
      }
    }

    const callbackPrefix = `https://${HOST_NAME}${PATH_PREFIX}/event/`;
    const existing = await fb.api.twurple.eventSub
      .getSubscriptionsPaginated()
      .getAll();

    let removed = 0;
    for (const subscription of existing) {
      // Twurple has no public getter for the callback
      const callback = subscription._transport.callback;
      if (
        subscription.transportMethod === "webhook" &&
        callback?.startsWith(callbackPrefix) &&
        !wanted.has(callback.slice(callbackPrefix.length))
      ) {
        await fb.api.twurple.eventSub.deleteSubscription(subscription.id);
        removed++;
      }
    }

    if (removed > 0) {
      console.info(`* Removed ${removed} stale EventSub subscriptions`);
    }
  }

  async logSummary() {
    this.summaryLogged = true;

    let total = 0;
    let verified = 0;
    for (const subscriptions of this.channels.values()) {
      for (const subscription of subscriptions.values()) {
        total++;
        if (subscription.verified) {
          verified++;
        }
      }
    }

    const failed = this.failedSubscriptions.splice(0);
    let summary = `* EventSub: ${verified}/${total} subscriptions verified, ${failed.length} failed`;
    if (failed.length > 0) {
      summary += ` (${failed.slice(0, 3).join(", ")})`;
    }

    // Only goes to the important channel when something didn't go through
    if (failed.length > 0 || verified < total) {
      fb.discord.importantLog(summary.substring(0, 1500));
    } else {
      fb.discord.log(summary.substring(0, 1500));
    }

    try {
      fb.discord.log(await this.getBotStatusSummary());
    } catch (error) {
      console.error("Error counting bot mod/VIP status:", error);
    }
  }

  // Counts the channels isBotMod/isBotVip answer for: joined, with the broadcaster logged in
  async getBotStatusSummary() {
    let authorized = 0;
    let mod = 0;
    let vip = 0;
    for (const channelId of this.channels.keys()) {
      if (!(await getBroadcasterToken(channelId))) {
        continue;
      }
      authorized++;

      const channelConfig = await fb.db.get("config", { channelId });
      if (channelConfig?.botIsMod === true) {
        mod++;
      }
      if (channelConfig?.botIsVip === true) {
        vip++;
      }
    }

    return `* Bot status: mod in ${mod}, VIP in ${vip} of ${authorized} authorized channels`;
  }

  /**
   * Fetch and cache all channels where the bot has moderator privileges
   * @returns {Promise<Set<string>|null>} Set of broadcaster IDs or null if scope is missing/error occurs
   */
  async fetchModeratedChannels() {
    const botUserId = process.env.BOT_USERID;
    try {
      if (
        !botUserId ||
        !(await hasScope(botUserId, "user:read:moderated_channels"))
      ) {
        console.warn(
          "* Bot can't read its moderated channels (missing BOT_USERID or user:read:moderated_channels), skipping mod status checks"
        );
        this.moderatedChannels = null;
        return null;
      }

      // Runs with the bot's own token
      const channels = await fb.api.twurple.moderation
        .getModeratedChannelsPaginated(botUserId)
        .getAll();
      this.moderatedChannels = new Set(channels.map((channel) => channel.id));
      console.info(
        `* Fetched and cached ${this.moderatedChannels.size} moderated channels`
      );

      return this.moderatedChannels;
    } catch (error) {
      console.error("Error fetching moderated channels:", error);
      this.moderatedChannels = null;
      return null;
    }
  }

  async checkInitialStatus(broadcasterId) {
    await checkInitialStatusHandler(broadcasterId, this.moderatedChannels);
  }
}

module.exports = EventSubListener;
