const path = require("path");
const liveCommand = async (message) => {
  const liveTarget = message.args[1]?.replace(/^@/, "") || message.channelName;
  const live = await fb.api.ivr.getLive(liveTarget);

  if (!live) {
    return {
      reply: `O canal ${liveTarget} não existe`,
    };
  }

  if (live === "never streamed") {
    return {
      reply: `O canal ${liveTarget} nunca fez live`,
    };
  }

  if (!live.isLive) {
    const timeSinceLastStream = fb.utils.relativeTime(
      live.lastStreamDate,
      true,
      true
    );
    return {
      reply: `A última live ${
        liveTarget.toLowerCase() === message.channelName
          ? "aqui"
          : "de " + liveTarget
      } foi há ${timeSinceLastStream} ● Título: ${live.lastStreamTitle}`,
    };
  }

  if (live.isLive) {
    const liveUrl =
      liveTarget !== message.channelName
        ? ` ● https://twitch.tv/${liveTarget}`
        : "";
    return {
      reply: `${liveTarget} está agora fazendo live de ${live.game} para ${live.viewers} viewers ● ${live.title}${liveUrl}`,
    };
  }
};

liveCommand.commandName = "live";
liveCommand.aliases = ["live", "streaminfo", "si"];
liveCommand.shortDescription = "Mostra se um canal está fazendo live";
liveCommand.cooldown = 5000;
liveCommand.cooldownType = "channel";
liveCommand.whisperable = true;
liveCommand.description = `Saiba há quanto tempo foi a última live do canal fornecido, ou no canal o qual o comando foi executado caso nenhum tenha sido fornecido

Se o canal estiver ao vivo, mostrará a categoria, a quantidade de viewers, o título e o link para a live`;
liveCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  liveCommand,
};
