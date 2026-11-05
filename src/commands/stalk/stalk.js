const path = require("path");
const stalkCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}stalk <usuário>`,
    };
  }

  const targetUser = message.args[1].toLowerCase().replace(/^@/, "");

  if (targetUser === message.senderUsername) {
    return {
      reply: `Você tá aqui mesmo Stare`,
    };
  }

  if (["folhinha", "folhinhabot"].includes(targetUser)) {
    return {
      reply: `Tá tentando me stalkear pra quê Stare`,
    };
  }

  const targetUserId = (await fb.api.helix.getUserByUsername(targetUser))?.id;
  if (!targetUserId) {
    return {
      reply: `Esse usuário não existe`,
    };
  }

  const userInfo = await fb.db.get("users", { userid: targetUserId });
  if (!userInfo) {
    return {
      reply: `Nunca vi esse usuário`,
    };
  }

  // stalk shows everything lastseen does, so a lastseen optout covers it too
  if (await fb.utils.isOptedOut(targetUserId, ["stalk", "lastseen"])) {
    return {
      reply: fb.utils.optoutReply,
    };
  }

  let lsChannel = userInfo.lsChannel;
  const lsChannelId = (await fb.api.helix.getUserByUsername(lsChannel))?.id;
  const lsChannelInfo = await fb.db.get("users", { userid: lsChannelId });
  if (
    lsChannelInfo &&
    lsChannelInfo.optoutOwnChannel &&
    lsChannel != message.channelName
  ) {
    lsChannel = "***";
  }

  const lsDate = userInfo.lsDate;
  const lsMessage = userInfo.lsMessage;
  const timeSinceLs = fb.utils.relativeTime(lsDate, true, true);

  return {
    reply: `${targetUser} foi visto pela última vez há ${timeSinceLs} em #${lsChannel} - ${lsMessage}`,
  };
};

stalkCommand.commandName = "stalk";
stalkCommand.aliases = ["stalk"];
stalkCommand.shortDescription =
  "Veja onde um usuário falou pela última vez e o que ele disse";
stalkCommand.cooldown = 5000;
stalkCommand.cooldownType = "channel";
stalkCommand.whisperable = false;
stalkCommand.optoutable = true;
stalkCommand.description = `Pesquise há quanto tempo um usuário foi visto pela última vez, em algum canal onde o Folhinha esteja presente, em qual canal e o conteúdo da mensagem

Se quiser desabilitar a função de outras pessoas usarem este comando em você, use !optout stalk`;
stalkCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  stalkCommand,
};
