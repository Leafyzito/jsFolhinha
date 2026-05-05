const path = require("path");
const pauseCommand = async (message) => {
  const channelConfig = await fb.db.get("config", {
    channelId: message.channelID,
  });

  if (!channelConfig) {
    return {
      reply: `Configuração do canal não encontrada - por favor contacte o @${process.env.DEV_NICK}`,
    };
  }

  if (channelConfig.isPaused) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["joia", "jumilhao"],
      "👍"
    );
    return {
      reply: `Eu já estou pausado. Se quiser me despausar, use ${message.prefix}unpause ${emote}`,
    };
  }

  await fb.db.update(
    "config",
    { channelId: message.channelID },
    { $set: { isPaused: true } }
  );

  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["joia", "jumilhao"],
    "👍"
  );
  return {
    reply: `Pausado ${emote}`,
  };
};

pauseCommand.commandName = "pause";
pauseCommand.aliases = ["pause", "pausar"];
pauseCommand.shortDescription = "Pausa o bot no chat atual";
pauseCommand.cooldown = 0;
pauseCommand.cooldownType = "channel";
pauseCommand.whisperable = false;
pauseCommand.permissions = ["mod", "admin"];
pauseCommand.flags = ["always"];
pauseCommand.description =
  "Uso: !pause; Resposta esperada: pausado. O bot não irá voltar a responder até !unpause ser usado";
pauseCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = { pauseCommand };
