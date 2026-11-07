// Import event handlers
const handleStreamOnline = require("./events/stream-online");
const handleStreamOffline = require("./events/stream-offline");
const handleModeratorAdd = require("./events/moderator-add");
const handleModeratorRemove = require("./events/moderator-remove");
const handleVipAdd = require("./events/vip-add");
const handleVipRemove = require("./events/vip-remove");
const handleChannelFollow = require("./events/channel-follow");
const handleUserUpdate = require("./events/user-update");

const { getBroadcasterToken, hasScope } = require("./utils");

// A channel's live status is only trusted once both of these are verified
const STREAM_KEYS = ["online", "offline"];

/**
 * Check if we can subscribe to events that need the broadcaster's authorization
 * Rows from a fresh website login have no is_valid yet, so only an explicit false counts as invalid
 * @param {string} broadcasterId - The broadcaster's user ID
 * @returns {Promise<boolean>} True if the broadcaster has a usable authorization
 */
async function hasBroadcasterAuth(broadcasterId) {
  const authRow = await fb.db.get("auth", { user_id: broadcasterId });
  if (!authRow || authRow.is_valid === false) {
    return false;
  }
  return await getBroadcasterToken(broadcasterId);
}

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
  authRevoked
) {
  // Stream events require no authorization, every channel gets them
  const desired = new Map([
    [
      "online",
      () =>
        listener.onStreamOnline(broadcasterId, (event) =>
          handleStreamOnline(event, liveStatus)
        ),
    ],
    [
      "offline",
      () =>
        listener.onStreamOffline(broadcasterId, (event) =>
          handleStreamOffline(event, liveStatus)
        ),
    ],
  ]);

  if (authRevoked || !(await hasBroadcasterAuth(broadcasterId))) {
    return desired;
  }

  desired.set("user", () =>
    listener.onUserUpdate(broadcasterId, (event) => handleUserUpdate(event))
  );

  // Moderator events (requires moderation:read scope)
  if (await hasScope(broadcasterId, "moderation:read")) {
    desired.set("modAdd", () =>
      listener.onChannelModeratorAdd(broadcasterId, (event) =>
        handleModeratorAdd(event)
      )
    );
    desired.set("modRemove", () =>
      listener.onChannelModeratorRemove(broadcasterId, (event) =>
        handleModeratorRemove(event)
      )
    );
  }

  // VIP events (requires channel:manage:vips scope)
  if (await hasScope(broadcasterId, "channel:manage:vips")) {
    desired.set("vipAdd", () =>
      listener.onChannelVipAdd(broadcasterId, (event) => handleVipAdd(event))
    );
    desired.set("vipRemove", () =>
      listener.onChannelVipRemove(broadcasterId, (event) =>
        handleVipRemove(event)
      )
    );
  }

  // Follower events (requires moderator:read:followers scope)
  const moderatorId = await getFollowModerator(broadcasterId);
  if (moderatorId) {
    // Keyed by moderator so a scope change swaps the subscription for the right one
    desired.set(`follow:${moderatorId}`, () =>
      listener.onChannelFollow(broadcasterId, moderatorId, (event) =>
        handleChannelFollow(event)
      )
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
