const { hasScope } = require("../clients/twitch/event-sub/utils");
const { getPlusTier } = require("../utils/plus-badges");

const LEAFYZITO = "leafyzito";
const SUBSCRIPTION_SCOPE = "channel:read:subscriptions";
const TIER_REFRESH_INTERVAL = 24 * 60 * 60; // seconds
const TIER_REFRESH_BATCH = 20;
const SUBAGE_TIMEOUT = 5_000;

let isRunning = false;

function needsTierRefresh(user, now) {
  // new subs and resubs get refreshed right away
  if (!user.isPlus || !user.plusTierCheckedAt) {
    return true;
  }
  return now - user.plusTierCheckedAt >= TIER_REFRESH_INTERVAL;
}

async function refreshPlusTier(user, login) {
  const subAge = await fb.api.ivr.getSubAge(login, LEAFYZITO, {
    timeout: SUBAGE_TIMEOUT,
  });

  // api failed or login now points to someone else: keep last known tier, retry next run
  if (!subAge || (subAge.user?.id && subAge.user.id !== user.userid)) {
    return;
  }

  const update = { plusTierCheckedAt: fb.utils.unix() };

  // sub status hidden or not visible yet: keep last known tier
  if (subAge.hasSubbed && subAge.monthsActive >= 1) {
    update.plusMonths = subAge.monthsActive;
    update.plusBadge = getPlusTier(subAge.monthsActive).badge;
  }

  await fb.db.update("users", { userid: user.userid }, { $set: update });
}

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
    const subLogins = new Map(
      subscribers.map((sub) => [sub.userId, sub.login])
    );

    for (const sub of subscribers) {
      const existingUser = await fb.db.get("users", { userid: sub.userId });
      if (!existingUser) {
        await fb.db.insertTemplate("users", {
          userId: sub.userId,
          username: sub.login,
        });
      }
    }

    // check who needs a tier refresh before isPlus gets updated below
    let tiersToRefresh = [];
    if (subUserIds.length > 0) {
      let subUsers = await fb.db.get(
        "users",
        { userid: { $in: subUserIds } },
        true
      );
      if (subUsers && !Array.isArray(subUsers)) {
        subUsers = [subUsers];
      }
      const now = fb.utils.unix();
      tiersToRefresh = (subUsers || [])
        .filter((user) => needsTierRefresh(user, now))
        .sort((a, b) => Number(!!a.isPlus) - Number(!!b.isPlus))
        .slice(0, TIER_REFRESH_BATCH);
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

    // update sub-length tiers (plusMonths/plusBadge are kept when a sub lapses)
    for (const user of tiersToRefresh) {
      await refreshPlusTier(user, subLogins.get(user.userid));
    }
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
