const { validateCommandExecution } = require("../../commands/commandValidator");
const { commandsList } = require("../../commands/commandsList");

async function checkCommandExecution(command, message) {
  if (
    !(await validateCommandExecution(
      commandsList[command].cooldown,
      commandsList[command].cooldownType,
      message
    ))
  ) {
    return false;
  }

  // check if command is whisperable
  if (message.isWhisper && !commandsList[command].whisperable) {
    return false;
  }

  return true;
}

async function checkCustomCommandExecution(customCommand, message) {
  // Custom commands are not whisperable (MVP)
  if (message.isWhisper) {
    return false;
  }

  // Reuse existing validator for:
  // - cooldown handling
  // - bans / paused / offlineOnly / etc
  const cooldownMs =
    typeof customCommand.cooldownMs === "number" ? customCommand.cooldownMs : 5000;
  return await validateCommandExecution(cooldownMs, "channel", message);
}

async function commandHandler(message) {
  if (message.senderUsername == process.env.BOT_USERNAME) {
    return;
  }

  if (!message.messageText.startsWith(message.prefix)) {
    return;
  }

  const command = message.args[0].slice(message.prefix.length).toLowerCase();

  let commandResult;

  // Built-ins first (skip DB fetch in hot path)
  if (command in commandsList) {
    Object.defineProperty(message, "command", {
      value: { ...commandsList[command], custom: false },
      writable: true,
      configurable: true,
      enumerable: true,
    });
    if (!(await checkCommandExecution(command, message))) {
      return;
    }

    fb.totalCommandsUsed++;
    try {
      commandResult = await commandsList[command](message);
    } catch (err) {
      fb.discord.logError(
        `Error in command in #${message.channelName}/${message.senderUsername} - ${command}: ${err}`
      );
      fb.log.logAndReply(
        message,
        `⚠️ Ocorreu um erro ao executar o comando, tente novamente`
      );
      return;
    }
  } else {
    // Custom command fallback
    const custom = await fb.db.get("customcommands", {
      channelId: message.channelID,
      name: command,
    });

    if (!custom) {
      return;
    }

    // Attach a minimal command object so validator + logs work
    Object.defineProperty(message, "command", {
      value: {
        commandName: command,
        aliases: [command],
        cooldown: typeof custom.cooldownMs === "number" ? custom.cooldownMs : 5000,
        cooldownType: "channel",
        whisperable: false,
        description: "Custom command",
        custom: true,
        // No permissions: custom commands are public by default
      },
      writable: true,
      configurable: true,
      enumerable: true,
    });

    if (!(await checkCustomCommandExecution(custom, message))) {
      return;
    }

    fb.totalCommandsUsed++;
    commandResult = {
      reply: typeof custom.response === "string" ? custom.response : "",
      replyType: "reply",
    };
  }

  if (!commandResult || !commandResult.reply) {
    return;
  }

  if (!commandResult.replyType) {
    // default reply type to reply if not specified
    commandResult.replyType = "reply";
  }

  // sanitize reply - replace \n and \r with " "
  commandResult.reply = commandResult.reply.replace(/[\n\r]/g, " ").trim();

  message.notes = commandResult.notes;
  message.responseTime = new Date().getTime() - message.internalTimestamp;

  switch (commandResult.replyType) {
    case "reply":
      fb.log.logAndReply(message, commandResult.reply);
      break;
    case "say":
      fb.log.logAndSay(message, commandResult.reply);
      break;
    case "me":
      fb.log.logAndMeAction(message, commandResult.reply);
      break;
    default:
      break;
  }

  // update 7tv presence
  fb.api.stv
    .updatePresence(process.env.BOT_7TV_UID, message.channelID)
    .catch((err) => {
      // Silently fail - this is non-critical
      console.error("7TV presence update failed:", err);
    });
}

module.exports = {
  commandHandler,
};
