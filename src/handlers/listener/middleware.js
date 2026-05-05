// check if channel is paused, offline only, or has a disabled command
const shouldSkipMessage = async (message, commandName = null) => {
  const channelName = message.channelName;

  // Use message.channelConfig if available and channel name matches, otherwise fetch
  let channelData = null;
  if (
    message.channelConfig &&
    message.channelConfig.channel &&
    message.channelConfig.channel.toLowerCase() === channelName.toLowerCase()
  ) {
    channelData = message.channelConfig;
  } else {
    channelData = await fb.db.get("config", {
      channel: channelName.toLowerCase(),
    });
  }

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
