// Define variables to store the last execution time for each user and channel
const userCooldowns = {};
const channelCooldowns = {};

// Function to manage the cooldown
function manageCooldown(cooldownDuration, type, message) {
  // Get the current time
  const currentTime = Date.now();
  let identifier = message.senderUsername;
  const command = message.command.commandName;

  // if channel is whisper, set type to user, no matter what type is passed
  if (message.channelName === "whisper") {
    type = "user";
  }

  // Determine the cooldown object based on the type
  let cooldowns;
  if (type === "user") {
    cooldowns = userCooldowns;
  } else if (type === "channel") {
    cooldowns = channelCooldowns;
    identifier = message.channelName;
  } else {
    throw new Error("Invalid cooldown type");
  }

  // Get the command cooldown object for the specified identifier
  let commandCooldown = cooldowns[identifier];
  if (!commandCooldown) {
    commandCooldown = {};
    cooldowns[identifier] = commandCooldown;
  }

  // Get the last execution time for the specified command
  const lastExecutionTime = commandCooldown[command] || 0;

  // Calculate the time elapsed since the last execution
  const timeElapsed = currentTime - lastExecutionTime;

  // Check if the cooldown is over
  if (timeElapsed >= cooldownDuration) {
    commandCooldown[command] = currentTime;
    return true;
  }

  // Return false to indicate that the cooldown is not over
  console.debug(
    `CD: #${message.channelName}/${message.senderUsername} - ${
      message.command.commandName
    } (${Math.ceil((cooldownDuration - timeElapsed) / 1000)}s)`
  );
  return false;
}

async function checkUserPermissions(message, requiredPermissions) {
  // Check if user is admin
  if (message.isAdmin && requiredPermissions.includes("admin")) {
    return true;
  }

  // Check if user is streamer
  if (message.isStreamer && requiredPermissions.includes("streamer")) {
    return true;
  }

  // Check if user is moderator
  if (message.isMod && requiredPermissions.includes("mod")) {
    return true;
  }

  // Check if user is VIP
  if (message.isVip && requiredPermissions.includes("vip")) {
    return true;
  }

  // Check if user is subscriber
  if (message.isSub && requiredPermissions.includes("sub")) {
    return true;
  }

  return false;
}

async function validateCommandExecution(cooldownDuration, type, message) {
  const isCooldownOver = manageCooldown(cooldownDuration, type, message);
  if (!isCooldownOver) {
    return false;
  }

  // Check command permissions
  const command = message.command;
  // if command has permissions, check if user has permission
  if (command && command.permissions && command.permissions.length > 0) {
    const hasPermission = await checkUserPermissions(
      message,
      command.permissions
    );
    if (!hasPermission) {
      fb.log.logAndReply(
        message,
        `⚠️ Este comando é reservado para ${command.permissions.join(", ")}`
      );
      return false;
    }
  }

  if (command.flags && command.flags.includes("always")) {
    // for specific commands, if the command has the flag "always", it will always be executed, not matter if paused, stream on or whatever
    return true;
  }

  if (command.flags && command.flags.includes("modBot")) {
    const isBotMod = await fb.utils.isBotMod(
      message.channelID,
      message.channelConfig
    );
    if (isBotMod === null) {
      fb.log.logAndReply(
        message,
        `⚠️ Este comando requer que o streamer logue no site https://folhinhabot.com`
      );
      return false;
    }
    if (isBotMod === false) {
      fb.log.logAndReply(
        message,
        `⚠️ Eu preciso ter cargo de moderador para executar este comando`
      );
      return false;
    }
    return true;
  }

  if (command.flags && command.flags.includes("vipBot")) {
    const isBotVip = await fb.utils.isBotVip(
      message.channelID,
      message.channelConfig
    );
    if (isBotVip === null) {
      fb.log.logAndReply(
        message,
        `⚠️ Este comando requer que o streamer logue no site https://folhinhabot.com`
      );
      return false;
    }
    if (isBotVip === false) {
      fb.log.logAndReply(
        message,
        `⚠️ Eu preciso ter cargo de VIP para executar este comando`
      );
      return false;
    }
    return true;
  }

  // check perms to execute from
  // Use message.channelConfig (always available for commands) or fetch if somehow missing
  let currChannelConfigs = message.channelConfig;
  let currUserBans;

  if (!currChannelConfigs) {
    // Parallelize config and bans fetches when both are needed (fallback case)
    const [configResult, bansResult] = await Promise.all([
      fb.db.get("config", {
        channelId: message.channelID,
      }),
      fb.db.get("bans", {
        userId: message.senderUserID,
      }),
    ]);
    currChannelConfigs = configResult;
    currUserBans = bansResult;
  } else {
    // Only fetch bans if config was already available
    currUserBans = await fb.db.get("bans", {
      userId: message.senderUserID,
    });
  }

  if (currUserBans && !Array.isArray(currUserBans)) {
    currUserBans = [currUserBans];
  }

  // Check if user has any bans - iterate through all ban records
  if (currUserBans) {
    for (const banRecord of currUserBans) {
      if (
        banRecord.bannedCommands &&
        (banRecord.bannedCommands.includes("all") ||
          banRecord.bannedCommands.includes(message.command.commandName))
      ) {
        return false;
      }
    }
  }
  if (currChannelConfigs && currChannelConfigs.isPaused) {
    return false;
  }
  if (currChannelConfigs && currChannelConfigs.offlineOnly) {
    // Try EventSub first, fallback to Helix API if EventSub is unavailable or returns null
    let isLive = false;
    if (fb.twitch.eventSub) {
      const liveData = fb.twitch.eventSub.isChannelLive(message.channelName);
      if (liveData) {
        isLive = true;
      } else {
        // EventSub returned null (channel not tracked or not live), fallback to Helix API
        isLive = await fb.api.helix.isStreamOnline(message.channelName);
      }
    } else {
      // EventSub not available, use Helix API
      isLive = await fb.api.helix.isStreamOnline(message.channelName);
    }

    if (isLive) {
      return false;
    }
  }
  if (
    currChannelConfigs &&
    currChannelConfigs.disabledCommands.includes(message.command.commandName)
  ) {
    fb.log.logAndReply(message, `⚠️ Esse comando foi desativado neste chat`);
    return false;
  }
  if (
    currChannelConfigs &&
    currChannelConfigs.devBanCommands.includes(message.command.commandName)
  ) {
    fb.log.logAndReply(
      message,
      `⚠️ Esse comando foi desativado neste chat pelo dev`
    );
    return false;
  }

  return true;
}

module.exports = {
  validateCommandExecution,
  manageCooldown,
};
