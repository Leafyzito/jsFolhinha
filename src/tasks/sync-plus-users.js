const { hasScope } = require("../clients/twitch/event-sub/utils");

const LEAFYZITO = "leafyzito";
const SUBSCRIPTION_SCOPE = "channel:read:subscriptions";

let isRunning = false;

async function syncPlusUsers() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const broadcaster = await fb.api.helix.getUserByUsername(LEAFYZITO);
    if (!broadcaster?.id) {
      console.warn(
        `* sync-plus-users: broadcaster "${LEAFYZITO}" not found`
      );
      return;
    }

    const broadcasterId = broadcaster.id;

    const hasSubscriptionScope = await hasScope(
      broadcasterId,
      SUBSCRIPTION_SCOPE
    );
    if (!hasSubscriptionScope) {
      console.warn(
        `* sync-plus-users: missing ${SUBSCRIPTION_SCOPE} scope for ${LEAFYZITO}`
      );
      return;
    }

    const subscribers =
      await fb.api.helix.getBroadcasterSubscriptions(broadcasterId);
    if (subscribers === null) {
      return;
    }

    const subUserIds = subscribers.map((sub) => sub.userId);

    for (const sub of subscribers) {
      const existingUser = await fb.db.get("users", { userid: sub.userId });
      if (!existingUser) {
        await fb.db.insertTemplate("users", {
          userId: sub.userId,
          username: sub.login,
        });
      }
    }

    // set new plus users
    if (subUserIds.length > 0) {
      await fb.db.updateMany(
        "users",
        { userid: { $in: subUserIds } },
        { $set: { isPlus: true, isSupporter: true } }
      );
    }

    // remove plus users that are not plus anymore
    await fb.db.updateMany(
      "users",
      {
        isPlus: true,
        plusFounder: { $ne: true },
        userid: { $nin: subUserIds },
      },
      { $set: { isPlus: false } }
    );
  } catch (error) {
    console.error(`* sync-plus-users failed: ${error.message}`);
    if (fb.discord && fb.discord.logError) {
      fb.discord.logError(`sync-plus-users failed: ${error.message}`);
    }
  } finally {
    isRunning = false;
  }
}

module.exports = syncPlusUsers;
