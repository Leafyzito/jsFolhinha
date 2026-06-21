// Import event handlers
const handleStreamOnline = require("./events/stream-online");
const handleStreamOffline = require("./events/stream-offline");
const handleModeratorAdd = require("./events/moderator-add");
const handleModeratorRemove = require("./events/moderator-remove");
const handleVipAdd = require("./events/vip-add");
const handleVipRemove = require("./events/vip-remove");
const handleChannelFollow = require("./events/channel-follow");
const handleChannelSubscription = require("./events/channel-subscription");
const handleChannelSubscriptionGift = require("./events/channel-subscription-gift");
const handleUserUpdate = require("./events/user-update");

const { getBroadcasterToken, hasScope } = require("./utils");

/**
 * Subscribe to EventSub events for a broadcaster
 * @param {Object} listener - The EventSubWsListener instance
 * @param {Set} subscribedChannels - Set tracking subscribed channels
 * @param {Map} liveChannels - Map tracking live channels
 * @param {string} broadcasterId - The broadcaster's user ID
 */
async function subscribeToChannel(
  listener,
  subscribedChannels,
  liveChannels,
  broadcasterId
) {
  if (subscribedChannels.has(broadcasterId)) {
    return; // Already subscribed
  }

  try {
    // Check if auth row exists in database before attempting subscriptions
    const authRow = await fb.db.get("auth", {
      user_id: broadcasterId,
      is_valid: true,
    });
    if (!authRow) {
      console.warn(
        `* Skipping EventSub subscriptions for ${broadcasterId}: no valid auth row in database`
      );
      return; // Skip all subscriptions if no auth row exists
    }

    // Check if broadcaster token is available before subscribing to events
    const broadcasterToken = await getBroadcasterToken(broadcasterId);

    if (broadcasterToken) {
      // Subscribe to stream online event (requires broadcaster token)
      listener.onStreamOnline(broadcasterId, (event) => {
        handleStreamOnline(event, liveChannels);
      });

      // Subscribe to stream offline event (requires broadcaster token)
      listener.onStreamOffline(broadcasterId, (event) => {
        handleStreamOffline(event, liveChannels);
      });

      // Subscribe to user update event (requires broadcaster token)
      listener.onUserUpdate(broadcasterId, (event) => {
        handleUserUpdate(event);
      });

      // Subscribe to moderator events (requires moderation:read scope)
      const hasModScope = await hasScope(broadcasterId, "moderation:read");
      if (hasModScope) {
        try {
          listener.onChannelModeratorAdd(broadcasterId, (event) => {
            handleModeratorAdd(event);
          });

          listener.onChannelModeratorRemove(broadcasterId, (event) => {
            handleModeratorRemove(event);
          });
        } catch (error) {
          console.error(
            `Error subscribing to moderator events for ${broadcasterId}:`,
            error
          );
        }
      }

      // Subscribe to VIP events (requires channel:manage:vips scope)
      const hasVipManageScope = await hasScope(
        broadcasterId,
        "channel:manage:vips"
      );
      if (hasVipManageScope) {
        try {
          listener.onChannelVipAdd(broadcasterId, (event) => {
            handleVipAdd(event);
          });

          listener.onChannelVipRemove(broadcasterId, (event) => {
            handleVipRemove(event);
          });
        } catch (error) {
          console.error(
            `Error subscribing to VIP events for ${broadcasterId}:`,
            error
          );
        }
      }

      // Subscribe to follower events (requires moderator:read:followers scope)
      try {
        const hasFollowerScope = await hasScope(
          broadcasterId,
          "moderator:read:followers"
        );

        if (hasFollowerScope) {
          // If broadcaster authorized the app, use broadcaster's ID for both fields
          // (streamers are moderators of their own channel)
          listener.onChannelFollow(broadcasterId, broadcasterId, (event) => {
            handleChannelFollow(event);
          });
        } else {
          // Otherwise, check if bot is a moderator and use bot's user ID
          const channelConfig = await fb.db.get("config", {
            channelId: broadcasterId,
          });
          const botIsMod = channelConfig?.botIsMod === true;
          const botUserId = process.env.BOT_USERID;

          if (botIsMod && botUserId) {
            listener.onChannelFollow(broadcasterId, botUserId, (event) => {
              handleChannelFollow(event);
            });
          }
        }
      } catch (error) {
        console.error(
          `Error subscribing to follower events for ${broadcasterId}:`,
          error
        );
      }

      // Subscribe to subscription events (requires channel:read:subscriptions scope)
      try {
        const hasSubscriptionScope = await hasScope(
          broadcasterId,
          "channel:read:subscriptions"
        );

        if (hasSubscriptionScope) {
          // // Subscribe to new subscriptions
          // listener.onChannelSubscription(broadcasterId, (event) => {
          //   handleChannelSubscription(event);
          // });

          // Subscribe to subscription shares (when users share their subscriptions)
          listener.onChannelSubscriptionMessage(broadcasterId, (event) => {
            handleChannelSubscription(event);
          });

          // Subscribe to gifted subscriptions
          listener.onChannelSubscriptionGift(broadcasterId, (event) => {
            handleChannelSubscriptionGift(event);
          });
        }
      } catch (error) {
        console.error(
          `Error subscribing to subscription events for ${broadcasterId}:`,
          error
        );
      }
    } else {
      console.warn(
        `* Skipping EventSub subscriptions for ${broadcasterId}: broadcaster token not available`
      );
    }

    subscribedChannels.add(broadcasterId);
    console.info(`* Subscribed to EventSub events for channel ${broadcasterId}`);
  } catch (error) {
    console.error(
      `Error subscribing to EventSub events for ${broadcasterId}:`,
      error
    );
    if (fb.discord && fb.discord.logError) {
      fb.discord.logError(
        `EventSub subscription failed for ${broadcasterId}: ${error.message}`
      );
    }
  }
}

/**
 * Unsubscribe from EventSub events for a broadcaster
 * @param {Set} subscribedChannels - Set tracking subscribed channels
 * @param {string} broadcasterId - The broadcaster's user ID
 */
async function unsubscribeFromChannel(subscribedChannels, broadcasterId) {
  if (!subscribedChannels.has(broadcasterId)) {
    return; // Not subscribed
  }

  try {
    // Note: EventSubWsListener doesn't have explicit unsubscribe methods
    // The subscriptions are tied to the broadcasterId, so we just remove from tracking
    subscribedChannels.delete(broadcasterId);
    console.info(
      `* Unsubscribed from EventSub events for channel ${broadcasterId}`
    );
  } catch (error) {
    console.error(
      `Error unsubscribing from EventSub events for ${broadcasterId}:`,
      error
    );
  }
}

module.exports = {
  subscribeToChannel,
  unsubscribeFromChannel,
};
