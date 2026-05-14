const { replaceMessagePlaceholders } = require("../utils");

module.exports = async function handleChannelSubscriptionGift(event) {
  try {
    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName || "Unknown";
    const broadcasterLogin =
      event.broadcasterUserLogin || broadcasterName.toLowerCase();
    const gifterDisplayName = event.gifterDisplayName || "Unknown";
    const amount = event.amount || 0;

    // Check if we should send a thanking message
    const channelConfig = await fb.db.get("config", {
      channelId: broadcasterId,
    });

    if (channelConfig && channelConfig.thankSubs && !channelConfig.isPaused) {
      // Use custom message if available, otherwise use default
      // Both individual and bulk gift subs use the same giftSub message field
      let message;
      if (
        channelConfig.customMessages &&
        channelConfig.customMessages.giftSub
      ) {
        message = await replaceMessagePlaceholders(
          channelConfig.customMessages.giftSub,
          { gifter: gifterDisplayName, amount },
          broadcasterLogin
        );
      } else {
        // Default message
        const emote = await fb.emotes.getEmoteFromList(
          broadcasterLogin,
          fb.emotes.loveEmotes,
          "💚"
        );
        if (amount > 1) {
          message = `Obrigado pelos ${amount} sub gifts, ${gifterDisplayName}! ${emote}`;
        } else {
          message = `Obrigado pelo ${amount} sub gift, ${gifterDisplayName}! ${emote}`;
        }
      }
      fb.log.send(broadcasterLogin, message);
    }
  } catch (error) {
    console.error(error);
    fb.discord.logError(
      `Error handling channel subscription gift event: ${error.message}`
    );
  }
};
