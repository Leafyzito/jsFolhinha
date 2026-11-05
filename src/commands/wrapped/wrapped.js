const path = require("path");
const wrappedCommand = async (message) => {
  const wrappedTarget =
    message.args[1]?.replace(/^@/, "") || message.senderUsername;
  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    fb.emotes.pogEmotes,
    "PogChamp"
  );
  if (wrappedTarget.toLowerCase() != message.senderUsername) {
    const wrappedTargetId = (
      await fb.api.helix.getUserByUsername(wrappedTarget)
    )?.id;
    if (await fb.utils.isOptedOut(wrappedTargetId, "wrapped", message.senderUserID)) {
      return {
        reply: fb.utils.optoutReply,
      };
    }

    return {
      reply: `${emote} Veja o Wrapped do Folhinha de ${wrappedTarget} aqui: https://folhinhabot.com/wrapped/${wrappedTarget}`,
    };
  }

  return {
    reply: `${emote} Veja o seu Wrapped do Folhinha aqui: https://folhinhabot.com/wrapped/${wrappedTarget}`,
  };
};

wrappedCommand.commandName = "wrapped";
wrappedCommand.aliases = ["wrapped"];
wrappedCommand.shortDescription = "Veja o seu Wrapped do Folhinha";
wrappedCommand.cooldown = 5000;
wrappedCommand.cooldownType = "user";
wrappedCommand.whisperable = true;
wrappedCommand.optoutable = true;
wrappedCommand.description = `Veja algumas estatísticas sobre você e o bot durante 2025`;
wrappedCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  wrappedCommand,
};
