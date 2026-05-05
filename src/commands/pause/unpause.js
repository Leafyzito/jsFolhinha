const path = require("path");
const unpauseCommand = async (message) => {
  const channelConfig =
    message.channelConfig ||
    (await fb.db.get("config", {
      channelId: message.channelID,
    }));

  if (!channelConfig) {
    return {
      reply: `Configuração do canal não encontrada - por favor contacte o @${process.env.DEV_NICK}`,
    };
  }

  if (!channelConfig.isPaused) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["joia", "jumilhao"],
      "👍"
    );
    return {
      reply: `Eu já estou despausado. Se quiser me pausar, use ${message.prefix}pause ${emote}`,
    };
  }

  await fb.db.update(
    "config",
    { channelId: message.channelID },
    { $set: { isPaused: false } }
  );

  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["joia", "jumilhao"],
    "👍"
  );
  return {
    reply: `Despausado ${emote}`,
  };
};

unpauseCommand.commandName = "unpause";
unpauseCommand.aliases = ["unpause", "despausar"];
unpauseCommand.shortDescription = "Despausa o bot no chat atual";
unpauseCommand.cooldown = 0;
unpauseCommand.cooldownType = "channel";
unpauseCommand.whisperable = false;
unpauseCommand.permissions = ["mod", "admin"];
unpauseCommand.flags = ["always"];
unpauseCommand.description =
  "Uso: !unpause; Resposta esperada: despausado. O bot irá voltar a responder";
unpauseCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = { unpauseCommand };
