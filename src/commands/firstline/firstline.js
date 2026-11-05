const path = require("path");
async function getFirstLineDate(channelId, userId) {
  const data = await fb.got(
    `https://logs.zonian.dev/list?channelid=${channelId}&userid=${userId}`
  );

  if (!data) {
    return null;
  }

  const availableLogsLen = data.availableLogs.length;
  const firstAvailableLog = data.availableLogs[availableLogsLen - 1];

  const logUrl = `https://logs.zonian.dev/channelid/${channelId}/userid/${userId}/${firstAvailableLog.year}/${firstAvailableLog.month}`;

  return logUrl;
}

async function getFirstLineMessage(logUrl) {
  const data = await fb.got(logUrl);

  if (!data) {
    return null;
  }

  const firstLine = data.split("\n")[0];

  const regex = /\[(.*?)\] #(.*?) (.*?): (.*)/;
  const match = firstLine.match(regex);

  if (!match) {
    return null;
  }

  const [, timestamp, channelName, user, message] = match;
  return {
    date: timestamp,
    channel: channelName,
    user: user,
    message: message,
  };
}

async function getFirstLine(channelId, userId) {
  const firstLogUrl = await getFirstLineDate(channelId, userId);
  if (!firstLogUrl) {
    return null;
  }
  const firstLineMessage = await getFirstLineMessage(firstLogUrl);
  return firstLineMessage;
}

const firstLineCommand = async (message) => {
  const targetUser =
    message.args[1]?.replace(/^@/, "") || message.senderUsername;
  const targetId =
    targetUser.toLowerCase() !== message.senderUsername.toLowerCase()
      ? (await fb.api.helix.getUserByUsername(targetUser))?.id
      : message.senderUserID;

  if (await fb.utils.isOptedOut(targetId, "firstline", message.senderUserID)) {
    return {
      reply: fb.utils.optoutReply,
    };
  }

  const firstLine = await getFirstLine(message.channelID, targetId);
  if (!firstLine) {
    return {
      reply: `Nunca loguei uma mensagem desse usuário neste chat (contando desde 06/03/2025)`,
    };
  }

  return {
    reply: `${
      targetUser.toLowerCase() === message.senderUsername.toLowerCase()
        ? "A sua primeira mensagem"
        : `A primeira mensagem de ${firstLine.user}`
    } neste chat foi em ${firstLine.date}: ${firstLine.message}`,
  };
};

firstLineCommand.commandName = "firstline";
firstLineCommand.aliases = ["firstline", "fl"];
firstLineCommand.shortDescription = "Veja a primeira mensagem de um usuário";
firstLineCommand.cooldown = 5000;
firstLineCommand.cooldownType = "channel";
firstLineCommand.whisperable = false;
firstLineCommand.optoutable = true;
firstLineCommand.description = `Receba a primeira mensagem de um usuário fornecido ou, caso nenhum seja fornecido, da pessoa que executou o comando

• Exemplo: !firstline - O bot vai mostrar a primeira mensagem de quem executou o comando no chat onde o comando foi executado

• Exemplo: !firstline @leafyzito - O bot vai mostrar a primeira mensagem de @leafyzito no chat onde o comando foi executado`;
firstLineCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  firstLineCommand,
};
