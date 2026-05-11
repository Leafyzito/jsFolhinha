const { replaceMessagePlaceholders } = require("../utils");

module.exports = async function handleChannelFollow(event) {
  try {
    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName || "Unknown";
    const broadcasterLogin =
      event.broadcasterUserLogin || broadcasterName.toLowerCase();
    const userDisplayName = event.userDisplayName || "Unknown";

    // Check if we should send a thanking message
    const channelConfig = await fb.db.get("config", {
      channelId: broadcasterId,
    });

    if (
      channelConfig &&
      channelConfig.thankFollows &&
      !channelConfig.isPaused
    ) {
      // Use custom message if available, otherwise use default
      let message;
      if (
        channelConfig.customMessages &&
        channelConfig.customMessages.follow
      ) {
        message = await replaceMessagePlaceholders(
          channelConfig.customMessages.follow,
          { user: userDisplayName },
          broadcasterLogin
        );
      } else {
        // Default message
        const emote = await fb.emotes.getEmoteFromList(
          broadcasterLogin,
          fb.emotes.loveEmotes,
          "💚"
        );
        message = `Obrigado pelo follow, ${userDisplayName}! ${emote}`;
      }
      fb.log.send(broadcasterLogin, message);
    }
  } catch (error) {
    console.error(error);
    fb.discord.logError(
      `Error handling channel follow event: ${error.message}`
    );
  }
};

