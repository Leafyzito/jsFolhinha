const {
  replaceMessagePlaceholders,
  getSubscriptionThankKey,
  wasSubscriptionRecentlyThanked,
  markSubscriptionThanked,
  cancelPendingSubscribeThank,
  scheduleSubscribeThank,
} = require("../utils");

async function buildThankMessage(event, channelConfig, broadcasterLogin) {
  const userDisplayName = event.userDisplayName || "Unknown";
  const durationMonths = event.durationMonths;
  const cumulativeMonths = event.cumulativeMonths;
  const isResubscription =
    cumulativeMonths !== undefined || durationMonths !== undefined;

  if (isResubscription) {
    const months = cumulativeMonths || durationMonths || 1;
    if (channelConfig.customMessages?.resub) {
      return replaceMessagePlaceholders(
        channelConfig.customMessages.resub,
        { user: userDisplayName, months },
        broadcasterLogin
      );
    }
    return `Obrigado pelos ${months} mês(es) de sub, ${userDisplayName}! 💚`;
  }

  if (channelConfig.customMessages?.newSub) {
    return replaceMessagePlaceholders(
      channelConfig.customMessages.newSub,
      { user: userDisplayName },
      broadcasterLogin
    );
  }

  const emote = await fb.emotes.getEmoteFromList(
    broadcasterLogin,
    fb.emotes.loveEmotes,
    "💚"
  );
  return `Obrigado pelo sub, ${userDisplayName}! ${emote}`;
}

module.exports = async function handleChannelSubscription(
  event,
  { source = "subscribe" } = {}
) {
  try {
    if (event.isGift) {
      return;
    }

    const broadcasterId = event.broadcasterId;
    const broadcasterName = event.broadcasterDisplayName || "Unknown";
    const broadcasterLogin =
      event.broadcasterUserLogin || broadcasterName.toLowerCase();
    const userId = event.userId;

    if (!userId) {
      return;
    }

    const thankKey = getSubscriptionThankKey(broadcasterId, userId);

    const channelConfig = await fb.db.get("config", {
      channelId: broadcasterId,
    });

    if (!channelConfig?.thankSubs || channelConfig.isPaused) {
      return;
    }

    const sendThank = async () => {
      const message = await buildThankMessage(
        event,
        channelConfig,
        broadcasterLogin
      );
      fb.log.send(broadcasterLogin, message);
    };

    if (source === "message") {
      cancelPendingSubscribeThank(thankKey);
      if (wasSubscriptionRecentlyThanked(thankKey)) {
        return;
      }
      markSubscriptionThanked(thankKey);
      await sendThank();
      return;
    }

    scheduleSubscribeThank(thankKey, () => {
      sendThank().catch((error) => {
        console.error(error);
        fb.discord.logError(
          `Error sending delayed subscription thank: ${error.message}`
        );
      });
    });
  } catch (error) {
    console.error(error);
    fb.discord.logError(
      `Error handling channel subscription event: ${error.message}`
    );
  }
};
