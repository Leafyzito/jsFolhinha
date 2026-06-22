const { sendSubThank } = require("../sub-thanks");

const GIFT_BOMB_DEDUP_MS = 30_000;
const recentCommunityGifts = new Map();

function markCommunityGift(channel, gifterUserId) {
  if (!gifterUserId) {
    return;
  }

  const key = `${channel.toLowerCase()}:${gifterUserId}`;
  recentCommunityGifts.set(key, Date.now() + GIFT_BOMB_DEDUP_MS);
}

function isRecentCommunityGift(channel, gifterUserId) {
  if (!gifterUserId) {
    return false;
  }

  const key = `${channel.toLowerCase()}:${gifterUserId}`;
  const expiresAt = recentCommunityGifts.get(key);
  if (!expiresAt) {
    return false;
  }

  if (Date.now() > expiresAt) {
    recentCommunityGifts.delete(key);
    return false;
  }

  return true;
}

async function handleSubNoticeError(error, context) {
  console.error(error);
  if (fb.discord?.logError) {
    fb.discord.logError(`Error handling IRC sub notice (${context}): ${error.message}`);
  }
}

function registerSubNoticeHandlers(client) {
  client.onSub(async (channel, _user, subInfo, msg) => {
    try {
      await sendSubThank({
        channelLogin: channel,
        channelId: msg.channelId,
        kind: "newSub",
        userDisplayName: subInfo.displayName,
      });
    } catch (error) {
      await handleSubNoticeError(error, "onSub");
    }
  });

  client.onResub(async (channel, _user, subInfo, msg) => {
    try {
      await sendSubThank({
        channelLogin: channel,
        channelId: msg.channelId,
        kind: "resub",
        userDisplayName: subInfo.displayName,
        months: subInfo.months,
      });
    } catch (error) {
      await handleSubNoticeError(error, "onResub");
    }
  });

  client.onCommunitySub(async (channel, _user, subInfo, msg) => {
    try {
      const gifterDisplayName = subInfo.gifterDisplayName;
      if (!gifterDisplayName) {
        return;
      }

      markCommunityGift(channel, subInfo.gifterUserId);

      await sendSubThank({
        channelLogin: channel,
        channelId: msg.channelId,
        kind: "giftSub",
        gifterDisplayName,
        giftAmount: subInfo.count,
      });
    } catch (error) {
      await handleSubNoticeError(error, "onCommunitySub");
    }
  });

  client.onSubGift(async (channel, _user, subInfo, msg) => {
    try {
      const gifterDisplayName = subInfo.gifterDisplayName;
      if (!gifterDisplayName) {
        return;
      }

      if (isRecentCommunityGift(channel, subInfo.gifterUserId)) {
        return;
      }

      await sendSubThank({
        channelLogin: channel,
        channelId: msg.channelId,
        kind: "giftSub",
        gifterDisplayName,
        giftAmount: 1,
      });
    } catch (error) {
      await handleSubNoticeError(error, "onSubGift");
    }
  });
}

module.exports = { registerSubNoticeHandlers };
