module.exports = async function handleStreamOnline(event, liveStatus) {
  try {
    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName;
    const broadcasterLogin = event.broadcasterName;

    const wasLive = liveStatus.get(broadcasterId);
    liveStatus.set(broadcasterId, true);

    // Twitch can deliver an event twice, and the startup check may have seen this already
    if (wasLive === true) {
      return;
    }

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
        `🔴 Live começando! Bot pausado para não interferir. Boa live! ${happyEmote}`,
      );
    }

    fb.discord.log(`* ${broadcasterName} went live`);
  } catch (error) {
    console.error(error);
    fb.discord.logError(`Error handling stream online event: ${error.message}`);
  }
};
