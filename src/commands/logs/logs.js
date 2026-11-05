const path = require("path");
// https://tv.supa.sh/logs?c=channelName&u=userName

const getLogsLink = async (channelName, userName) => {
  if (!userName) {
    const url = `https://tv.supa.sh/logs?c=${channelName}`;
    return url;
  }
  const url = `https://tv.supa.sh/logs?c=${channelName}&u=${userName}`;
  return url;
};

const logsCommand = async (message) => {
  const targetChannel =
    message.args.length === 2
      ? message.channelName
      : message.args[1]?.replace(/^@/, "") || message.channelName;

  const targetUser =
    message.args.length === 2
      ? message.args[1]?.replace(/^@/, "")
      : message.args[2]?.replace(/^@/, "") || null;

  if (targetUser) {
    const targetUserId = (await fb.api.helix.getUserByUsername(targetUser))?.id;
    if (await fb.utils.isOptedOut(targetUserId, "logs", message.senderUserID)) {
      return {
        reply: fb.utils.optoutReply,
      };
    }
  }

  const logsLink = await getLogsLink(targetChannel, targetUser);

  return {
    reply: `Logs: ${logsLink}`,
  };
};

logsCommand.commandName = "logs";
logsCommand.aliases = ["logs", "log", "logs"];
logsCommand.shortDescription = "Veja os logs do chat";
logsCommand.cooldown = 5000;
logsCommand.cooldownType = "channel";
logsCommand.whisperable = false;
logsCommand.optoutable = true;
logsCommand.description = `Obtenha um link para os logs de chat de um determinado par de canal e usuário. Usa a API best-logs do @ZonianMidian para pesquisar todas as instâncias conhecidas e o frontend do @Supelle para visualização dos logs

• Exemplo: !logs - Mostra os logs do canal atual
• Exemplo: !logs @usuario - Mostra os logs do usuário no canal atual
• Exemplo: !logs @canal @usuario - Mostra os logs do usuário no canal especificado`;
logsCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  logsCommand,
};
