module.exports = async function handleModeratorAdd(event) {
  try {
    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName;
    const userId = event.userId;
    const botUserId = process.env.BOT_USERID;

    // Only update if the bot was added as moderator
    if (userId === botUserId) {
      await fb.db.update(
        "config",
        { channelId: broadcasterId },
        { $set: { botIsMod: true } }
      );

      fb.discord.importantLog(
        `* Bot was added as moderator in channel ${broadcasterName} (${broadcasterId})`
      );
    }
  } catch (error) {
    console.error(error);
    fb.discord.logError(`Error handling moderator add event: ${error.message}`);
  }
};
