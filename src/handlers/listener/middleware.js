// check if channel is paused, offline only, or has a disabled command
const shouldSkipMessage = async (message, commandName = null) => {
  const channelName = message.channelName;

  const channelData =
    message.channelConfig ||
    (await fb.db.get("config", {
      channelId: message.channelID,
    }));

  if (!channelData) {
    return false;
  }

  if (channelData.isPaused) {
    return true;
  }

  if (commandName && channelData.disabledCommands.includes(commandName)) {
    return true;
  }

  if (channelData.offlineOnly) {
    // Try EventSub first, fallback to Helix API if EventSub is unavailable or returns null
    let isLive = false;
    if (fb.twitch.eventSub) {
      const liveData = fb.twitch.eventSub.isChannelLive(channelName);
      if (liveData) {
        isLive = true;
      } else {
        // EventSub returned null (channel not tracked or not live), fallback to Helix API
        isLive = await fb.api.helix.isStreamOnline(channelName);
      }
    } else {
      // EventSub not available, use Helix API
      isLive = await fb.api.helix.isStreamOnline(channelName);
    }

    if (isLive) {
      return true;
    }
  }

  return false;
};

module.exports = { shouldSkipMessage };
