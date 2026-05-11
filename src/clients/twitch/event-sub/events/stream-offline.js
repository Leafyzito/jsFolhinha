module.exports = async function handleStreamOffline(event, liveChannels) {
  try {
    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName;
    const broadcasterLogin =
      event.broadcasterUserLogin || broadcasterName.toLowerCase();

    // Remove live status
    liveChannels.delete(broadcasterId);

    // Check if offlineOnly is enabled and bot is not paused
    const channelConfig = await fb.db.get("config", {
      channelId: broadcasterId,
    });

    if (channelConfig && channelConfig.offlineOnly && !channelConfig.isPaused) {
      const happyEmote = await fb.emotes.getEmoteFromList(
        broadcasterLogin,
        fb.emotes.happyEmotes,
        "😊",
      );
      fb.log.send(
        broadcasterLogin,
        `Live terminou! Bot reativado e funcionando normalmente ${happyEmote}`,
      );
    }

    fb.discord.log(`* ${broadcasterName} went offline`);
  } catch (error) {
    console.error(error);
    fb.discord.logError(
      `Error handling stream offline event: ${error.message}`,
    );
  }
};
