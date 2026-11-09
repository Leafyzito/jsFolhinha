// Import event handlers
const handleStreamOnline = require("./events/stream-online");
const handleStreamOffline = require("./events/stream-offline");
const handleModeratorAdd = require("./events/moderator-add");
const handleModeratorRemove = require("./events/moderator-remove");
const handleVipAdd = require("./events/vip-add");
const handleVipRemove = require("./events/vip-remove");
const handleChannelFollow = require("./events/channel-follow");
const handleUserUpdate = require("./events/user-update");

const { hasBroadcasterAuth, hasScope } = require("./utils");

// counts each notification by its eventsub type before handling it
function counted(type, handler) {
  return (event) => {
    fb.metrics.eventsubNotifications.inc({ type });
    return handler(event);
  };
}

// A channel's live status is only trusted once both of these are verified
const STREAM_KEYS = ["online", "offline"];

/**
 * Get the subscriptions a channel should have
 * @param {Object} listener - The EventSubMiddleware instance
 * @param {Object} liveStatus - The LiveStatus instance
 * @param {string} broadcasterId - The broadcaster's user ID
 * @param {boolean} authRevoked - Whether Twitch told us the broadcaster revoked our access
 * @returns {Promise<Map<string, Function>>} Map of subscription key to the function that creates it
 */
async function getDesiredSubscriptions(
  listener,
  liveStatus,
  broadcasterId,
  authRevoked,
) {
  // Stream events require no authorization, every channel gets them
  const desired = new Map([
    [
      "online",
      () =>
        listener.onStreamOnline(
          broadcasterId,
          counted("stream.online", (event) =>
            handleStreamOnline(event, liveStatus),
          ),
        ),
    ],
    [
      "offline",
      () =>
        listener.onStreamOffline(
          broadcasterId,
          counted("stream.offline", (event) =>
            handleStreamOffline(event, liveStatus),
          ),
        ),
    ],
  ]);

  if (authRevoked || !(await hasBroadcasterAuth(broadcasterId))) {
    return desired;
  }

  desired.set("user", () =>
    listener.onUserUpdate(
      broadcasterId,
      counted("user.update", handleUserUpdate),
    ),
  );

  // Moderator events (requires moderation:read scope)
  if (await hasScope(broadcasterId, "moderation:read")) {
    desired.set("modAdd", () =>
      listener.onChannelModeratorAdd(
        broadcasterId,
        counted("channel.moderator.add", handleModeratorAdd),
      ),
    );
    desired.set("modRemove", () =>
      listener.onChannelModeratorRemove(
        broadcasterId,
        counted("channel.moderator.remove", handleModeratorRemove),
      ),
    );
  }

  // VIP events (requires channel:manage:vips scope)
  if (await hasScope(broadcasterId, "channel:manage:vips")) {
    desired.set("vipAdd", () =>
      listener.onChannelVipAdd(
        broadcasterId,
        counted("channel.vip.add", handleVipAdd),
      ),
    );
    desired.set("vipRemove", () =>
      listener.onChannelVipRemove(
        broadcasterId,
        counted("channel.vip.remove", handleVipRemove),
      ),
    );
  }

  // Follower events (requires moderator:read:followers scope)
  const moderatorId = await getFollowModerator(broadcasterId);
  if (moderatorId) {
    // Keyed by moderator so a scope change swaps the subscription for the right one
    desired.set(`follow:${moderatorId}`, () =>
      listener.onChannelFollow(
        broadcasterId,
        moderatorId,
        counted("channel.follow", handleChannelFollow),
      ),
    );
  }

  return desired;
}

/**
 * Get who can read a channel's followers, the broadcaster or the bot if it's a moderator there
 * @param {string} broadcasterId - The broadcaster's user ID
 * @returns {Promise<string|null>} User ID of the moderator, null if nobody can
 */
async function getFollowModerator(broadcasterId) {
  // Streamers are moderators of their own channel
  if (await hasScope(broadcasterId, "moderator:read:followers")) {
    return broadcasterId;
  }

  const channelConfig = await fb.db.get("config", {
    channelId: broadcasterId,
  });
  const botUserId = process.env.BOT_USERID;
  if (
    channelConfig?.botIsMod === true &&
    (await hasScope(botUserId, "moderator:read:followers"))
  ) {
    return botUserId;
  }

  return null;
}

module.exports = {
  STREAM_KEYS,
  getDesiredSubscriptions,
};
