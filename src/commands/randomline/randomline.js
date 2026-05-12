const path = require("path");
async function getRandomLine(userid, channelid) {
  const response = await fb.api.rustlog.getRandomLine(channelid, userid);

  if (!response) {
    return null;
  }

  // Parse the log line into components
  const regex = /\[(.*?)\] #(.*?) (.*?): (.*)/;
  const match = response.match(regex);

  if (!match) {
    return null;
  }

  const [, timestamp, channelName, user, message] = match;

  // Convert timestamp to Unix time (assuming timestamp is in format "YYYY-MM-DD HH:mm:ss")
  const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);

  return {
    channel: channelName,
    user: user,
    message: message,
    timeSince: fb.utils.relativeTime(unixTimestamp, true, true),
  };
}

const randomLineCommand = async (message) => {
  const targetUser = message.args[1]?.replace(/^@/, "") || null;
  const targetId =
    targetUser !== null
      ? (await fb.api.helix.getUserByUsername(targetUser))?.id
      : null;

  const randomLine = await getRandomLine(targetId, message.channelID);
  if (!randomLine) {
    return {
      reply: `Nunca loguei uma mensagem desse usuário neste chat (contando desde 06/03/2025).`,
    };
  }

  if (randomLine.message.length > 450) {
    randomLine.message = randomLine.message.slice(0, 450) + "...";
  }

  return {
    reply: `(há ${randomLine.timeSince}) ${randomLine.user}: ${randomLine.message}`,
  };
};

randomLineCommand.commandName = "randomline";
randomLineCommand.aliases = ["randomline", "rl"];
randomLineCommand.shortDescription =
  "Veja uma mensagem aleatória de algum usuário";
randomLineCommand.cooldown = 5000;
randomLineCommand.cooldownType = "channel";
randomLineCommand.whisperable = false;
randomLineCommand.description = `Receba uma mensagem aleatória de um usuário fornecido ou, caso nenhum seja fornecido, da pessoa que executou o comando

Contando desde 06/03/2025`;
randomLineCommand.examples = [
  {
    description: "Receber uma mensagem aleatória do chat atual",
    input: "!randomline",
    output: "(há 4 dias) EmbellishingGrandma: bom dia chat",
  },
  {
    description: "Receber uma mensagem aleatória de outro usuário",
    input: "!randomline @leafyzito",
    output: "(há 12 horas) leafyzito: oi galera",
  },
];
randomLineCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  randomLineCommand,
};
