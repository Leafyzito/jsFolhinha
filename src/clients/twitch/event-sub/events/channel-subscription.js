const { replaceMessagePlaceholders } = require("../utils");

module.exports = async function handleChannelSubscription(event) {
  try {
    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName || "Unknown";
    const broadcasterLogin =
      event.broadcasterUserLogin || broadcasterName.toLowerCase();
    const userDisplayName = event.userDisplayName || "Unknown";
    const isGift = event.isGift || false;
    const gifterDisplayName = event.gifterDisplayName || null;

    // Check if this is a resubscription by looking for cumulativeMonths or durationMonths
    const durationMonths = event.durationMonths;
    const cumulativeMonths = event.cumulativeMonths;
    const isResubscription =
      cumulativeMonths !== undefined || durationMonths !== undefined;

    // Check if we should send a thanking message
    const channelConfig = await fb.db.get("config", {
      channelId: broadcasterId,
    });

    if (channelConfig && channelConfig.thankSubs && !channelConfig.isPaused) {
      let message;

      if (isGift && gifterDisplayName) {
        // For gifted subs, thank the gifter (individual gift, amount is 1)
        if (
          channelConfig.customMessages &&
          channelConfig.customMessages.giftSub
        ) {
          message = await replaceMessagePlaceholders(
            channelConfig.customMessages.giftSub,
            { gifter: gifterDisplayName, amount: 1 },
            broadcasterLogin
          );
        } else {
          // Default message
          message = `Obrigado pelo gift sub, ${gifterDisplayName}! 💚`;
        }
      } else if (isResubscription) {
        // For resubs, thank the user
        const months = cumulativeMonths || durationMonths || 1;
        if (
          channelConfig.customMessages &&
          channelConfig.customMessages.resub
        ) {
          message = await replaceMessagePlaceholders(
            channelConfig.customMessages.resub,
            { user: userDisplayName, months },
            broadcasterLogin
          );
        } else {
          // Default message
          message = `Obrigado pelos ${months} mês(es) de sub, ${userDisplayName}! 💚`;
        }
      } else {
        // For new subs, thank the user
        if (
          channelConfig.customMessages &&
          channelConfig.customMessages.newSub
        ) {
          message = await replaceMessagePlaceholders(
            channelConfig.customMessages.newSub,
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
          message = `Obrigado pelo sub, ${userDisplayName}! ${emote}`;
        }
      }

      fb.log.send(broadcasterLogin, message);
    }
  } catch (error) {
    console.error(error);
    fb.discord.logError(
      `Error handling channel subscription event: ${error.message}`
    );
  }
};

