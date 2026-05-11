module.exports = async function handleVipRemove(event) {
  try {
    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName;
    const userId = event.userId;
    const botUserId = process.env.BOT_USERID;

    // Only update if the bot was removed as VIP
    if (userId === botUserId) {
      await fb.db.update(
        "config",
        { channelId: broadcasterId },
        { $set: { botIsVip: false } }
      );

      fb.discord.importantLog(
        `* Bot was removed as VIP in channel ${broadcasterName} (${broadcasterId})`
      );
    }
  } catch (err) {
    console.error(err);
    fb.discord.logError(`Error handling VIP remove event: ${err.message}`);
  }
};

