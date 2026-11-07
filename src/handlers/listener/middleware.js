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
    const isLive = await fb.utils.isChannelLive(
      channelData.channelId,
      channelName
    );
    if (isLive) {
      return true;
    }
  }

  return false;
};

module.exports = { shouldSkipMessage };
