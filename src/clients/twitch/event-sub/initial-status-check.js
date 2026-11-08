const { hasBroadcasterAuth, hasScope } = require("./utils");

/**
 * Check the bot's mod/VIP status in a channel and store what changed in its config
 * Only for channels whose broadcaster logged in, isBotMod/isBotVip ignore the rest
 * @param {string} broadcasterId - The broadcaster's user ID
 * @param {Set<string>|null} moderatedChannels - Broadcaster IDs where the bot is a mod, null if unknown
 */
async function checkInitialStatus(broadcasterId, moderatedChannels) {
  try {
    // A token flagged invalid only fails its refresh again, the stored status stays until they log in
    if (!(await hasBroadcasterAuth(broadcasterId))) {
      return;
    }

    const status = {};

    // Unknown when the moderated channels fetch failed, the stored value stays
    if (moderatedChannels) {
      status.botIsMod = moderatedChannels.has(String(broadcasterId));
    }

    // Uses the broadcaster's token, which needs either of these scopes
    if (
      (await hasScope(broadcasterId, "channel:read:vips")) ||
      (await hasScope(broadcasterId, "channel:manage:vips"))
    ) {
      try {
        status.botIsVip = await fb.api.twurple.channels.checkVipForUser(
          broadcasterId,
          process.env.BOT_USERID
        );
      } catch (error) {
        console.error(`Error checking VIP status for ${broadcasterId}:`, error);
      }
    }

    const channelConfig = await fb.db.get("config", {
      channelId: broadcasterId,
    });
    const changed = Object.fromEntries(
      Object.entries(status).filter(
        ([field, value]) => channelConfig?.[field] !== value
      )
    );
    if (Object.keys(changed).length === 0) {
      return;
    }

    await fb.db.update(
      "config",
      { channelId: broadcasterId },
      { $set: changed }
    );
    console.info(
      `* Bot status changed for ${broadcasterId}: ${JSON.stringify(changed)}`
    );
  } catch (error) {
    console.error(`Error checking initial status for ${broadcasterId}:`, error);
    if (fb.discord && fb.discord.logError) {
      fb.discord.logError(
        `Initial status check failed for ${broadcasterId}: ${error.message}`
      );
    }
  }
}

module.exports = {
  checkInitialStatus,
};
