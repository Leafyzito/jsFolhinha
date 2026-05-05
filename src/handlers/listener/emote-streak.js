const { shouldSkipMessage } = require("./middleware");

const emoteStreaks = {};
const lastAnnouncementTime = {};

function formatStreakDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return "";
  const ms = Math.abs(endedAt - startedAt);

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const secondsTotal = ms / 1000;
  const seconds = Math.floor(secondsTotal) % 60;
  const units = [];
  if (days > 0) units.push(`${days}d`);
  if (hours > 0) units.push(`${hours}h`);
  if (minutes > 0) units.push(`${minutes}m`);
  if (units.length === 0) {
    units.push(`${secondsTotal.toFixed(3).replace(/\.?0+$/, "")}s`);
  } else if (seconds > 0) {
    units.push(`${seconds}s`);
  }
  return units.join(" ");
}

async function getEmoteInMsg(channelName, args) {
  const allEmotes = (await fb.emotes.getChannelEmotes(channelName)) || [];
  return args.find((word) => allEmotes.includes(word)) || null;
}

function announceStreak(channelName, streakData) {
  if (
    streakData.lastWasEmoteMsg &&
    streakData.count >= 3 &&
    streakData.emote &&
    streakData.startedAt &&
    streakData.endedAt
  ) {
    const now = Date.now();
    const lastAnnounce = lastAnnouncementTime[channelName] || 0;
    const cooldownMs = 5000;

    if (now - lastAnnounce < cooldownMs) {
      return;
    }

    const durationStr = formatStreakDuration(
      streakData.startedAt,
      streakData.endedAt
    );
    fb.log.send(
      channelName,
      `${streakData.count}x ${streakData.emote} streak! (Durou: ${durationStr})`
    );
    lastAnnouncementTime[channelName] = now;
  }
}

const emoteStreakListener = async (message) => {
  if (await shouldSkipMessage(message)) return;

  const channelData =
    message.channelConfig ||
    (await fb.db.get("config", {
      channelId: message.channelID,
    }));

  if (!channelData || !channelData.emoteStreak) return;

  if (!emoteStreaks[message.channelName]) {
    emoteStreaks[message.channelName] = {
      count: 0,
      lastWasEmoteMsg: false,
      emote: null,
      startedAt: null,
      endedAt: null,
    };
  }

  const streakData = emoteStreaks[message.channelName];
  const emoteUsed = await getEmoteInMsg(
    message.channelName,
    message.originalArgs
  );
  const msgTimestamp = message.serverTimestamp || Date.now();

  if (emoteUsed) {
    const continuingStreak =
      streakData.lastWasEmoteMsg && streakData.emote === emoteUsed;

    if (continuingStreak) {
      streakData.count += 1;
    } else {
      if (
        streakData.lastWasEmoteMsg &&
        streakData.emote !== emoteUsed &&
        streakData.count >= 3
      ) {
        streakData.endedAt = msgTimestamp;
        announceStreak(message.channelName, streakData);
      }
      streakData.count = 1;
      streakData.emote = emoteUsed;
      streakData.startedAt = msgTimestamp;
      streakData.endedAt = null;
    }
    streakData.lastWasEmoteMsg = true;
  } else {
    if (streakData.count >= 3 && streakData.lastWasEmoteMsg) {
      streakData.endedAt = msgTimestamp;
      announceStreak(message.channelName, streakData);
    }
    streakData.count = 0;
    streakData.lastWasEmoteMsg = false;
    streakData.emote = null;
    streakData.startedAt = null;
    streakData.endedAt = null;
  }
};

module.exports = {
  emoteStreakListener,
};
