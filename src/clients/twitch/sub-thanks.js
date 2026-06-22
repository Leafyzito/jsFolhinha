const { replaceMessagePlaceholders } = require("./event-sub/utils");

async function buildNewSubMessage(
  channelConfig,
  userDisplayName,
  broadcasterLogin
) {
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

async function buildResubMessage(
  channelConfig,
  userDisplayName,
  months,
  broadcasterLogin
) {
  if (channelConfig.customMessages?.resub) {
    return replaceMessagePlaceholders(
      channelConfig.customMessages.resub,
      { user: userDisplayName, months },
      broadcasterLogin
    );
  }

  return `Obrigado pelos ${months} mês(es) de sub, ${userDisplayName}! 💚`;
}

async function buildGiftSubMessage(
  channelConfig,
  gifterDisplayName,
  amount,
  broadcasterLogin
) {
  if (channelConfig.customMessages?.giftSub) {
    return replaceMessagePlaceholders(
      channelConfig.customMessages.giftSub,
      { gifter: gifterDisplayName, amount },
      broadcasterLogin
    );
  }

  const emote = await fb.emotes.getEmoteFromList(
    broadcasterLogin,
    fb.emotes.loveEmotes,
    "💚"
  );
  if (amount > 1) {
    return `Obrigado pelos ${amount} sub gifts, ${gifterDisplayName}! ${emote}`;
  }
  return `Obrigado pelo ${amount} sub gift, ${gifterDisplayName}! ${emote}`;
}

async function sendSubThank({
  channelLogin,
  channelId,
  kind,
  userDisplayName,
  months,
  gifterDisplayName,
  giftAmount,
}) {
  if (!channelId) {
    return;
  }

  const channelConfig = await fb.db.get("config", {
    channelId,
  });

  if (!channelConfig?.thankSubs || channelConfig.isPaused) {
    return;
  }

  const broadcasterLogin = channelLogin.toLowerCase();
  let message;

  if (kind === "newSub") {
    message = await buildNewSubMessage(
      channelConfig,
      userDisplayName || "Unknown",
      broadcasterLogin
    );
  } else if (kind === "resub") {
    message = await buildResubMessage(
      channelConfig,
      userDisplayName || "Unknown",
      months || 1,
      broadcasterLogin
    );
  } else if (kind === "giftSub") {
    message = await buildGiftSubMessage(
      channelConfig,
      gifterDisplayName || "Unknown",
      giftAmount || 1,
      broadcasterLogin
    );
  }

  if (message) {
    fb.log.send(broadcasterLogin, message);
  }
}

module.exports = {
  sendSubThank,
};
