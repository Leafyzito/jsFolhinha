module.exports = async function handleVipAdd(event) {
  try {
    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName;
    const userId = event.userId;
    const botUserId = process.env.BOT_USERID;

    // Only update if the bot was added as VIP
    if (userId === botUserId) {
      await fb.db.update(
        "config",
        { channelId: broadcasterId },
        { $set: { botIsVip: true } }
      );

      fb.discord.importantLog(
        `* Bot was added as VIP in channel ${broadcasterName} (${broadcasterId})`
      );
    }
  } catch (error) {
    console.error(error);
    fb.discord.logError(`Error handling VIP add event: ${error.message}`);
  }
};

