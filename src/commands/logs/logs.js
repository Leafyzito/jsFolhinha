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
logsCommand.description = "Obtenha um link para os logs de chat de um determinado par de canal e usuário. Usa a API best-logs do @ZonianMidian para pesquisar todas as instâncias conhecidas e o frontend do @Supelle para visualização dos logs";
logsCommand.examples = [
  {
    description: "Ver os logs do canal atual",
    input: "!logs",
    output: "Logs: https://tv.supa.sh/logs?c=canalatual",
  },
  {
    description: "Ver os logs de um usuário no canal atual",
    input: "!logs @leafyzito",
    output: "Logs: https://tv.supa.sh/logs?c=canalatual&u=leafyzito",
  },
  {
    description: "Ver os logs de um usuário em outro canal",
    input: "!logs @xqc @leafyzito",
    output: "Logs: https://tv.supa.sh/logs?c=xqc&u=leafyzito",
  },
];
logsCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  logsCommand,
};
