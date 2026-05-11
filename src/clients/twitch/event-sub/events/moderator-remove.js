module.exports = async function handleModeratorRemove(event) {
  try {
    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName;
    const userId = event.userId;
    const botUserId = process.env.BOT_USERID;

    // Only update if the bot was removed as moderator
    if (userId === botUserId) {
      await fb.db.update(
        "config",
        { channelId: broadcasterId },
        { $set: { botIsMod: false } }
      );

      fb.discord.importantLog(
        `* Bot was removed as moderator in channel ${broadcasterName} (${broadcasterId})`
      );
    }
  } catch (error) {
    console.error(error);
    fb.discord.logError(
      `Error handling moderator remove event: ${error.message}`
    );
  }
};

