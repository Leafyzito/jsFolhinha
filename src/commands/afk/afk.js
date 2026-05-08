const path = require("path");
const { afkInfoObjects } = require("./afk_info_model.js");

let afkAliasList = [];
afkInfoObjects.forEach((afk) => {
  afkAliasList = afkAliasList.concat(afk.alias);
});

const afkCommand = async (message) => {
  const commandInvoker = message.messageText
    .split(" ")[0]
    .split(`${message.prefix}`)[1]
    .trim()
    .toLowerCase();
  const afkInfoObject = afkInfoObjects.find((afk) =>
    afk.alias.includes(commandInvoker)
  );

  const afkStats = await fb.db.get("afk", {
    channel: message.channelName,
    user: message.senderUsername,
  });

  if (!afkStats) {
    await fb.db.insertTemplate("afk", { message });
  }

  let afkMessage = message.args.slice(1).join(" ");
  if (afkMessage.length > 400) {
    afkMessage = afkMessage.slice(0, 400) + "...";
  }

  const afkType = afkInfoObject.alias[0];
  const afkAction = afkInfoObject.afk;
  const afkEmoji = afkInfoObject.emoji;

  await fb.db.update(
    "afk",
    { channel: message.channelName, user: message.senderUsername },
    {
      $set: {
        is_afk: true,
        afk_message: afkMessage,
        afk_since: fb.utils.unix(),
        afk_type: afkType,
        rafk_counter: 0,
      },
    }
  );

  return {
    replyType: "reply",
    reply: `${message.displayName} ${afkAction} ${afkEmoji} ${
      afkMessage ? `: ${afkMessage}` : ""
    }`,
  };
};

afkCommand.commandName = "afk";
afkCommand.aliases = [...afkAliasList];
afkCommand.shortDescription =
  "Fique com status afk para contar quanto tempo esteve fora no canal atual";
afkCommand.cooldown = 5000;
afkCommand.cooldownType = "user";
afkCommand.whisperable = false;
afkCommand.description = `Registra seu status como AFK no canal onde o comando foi realizado. Após você enviar qualquer mensagem no canal ficou AFK, o Folhinha responderá indicando quanto tempo você esteve ausente juntamente com a sua mensagem, caso tenha deixado uma

Esse comando não afetará seu estado de AFK em outros canais

Além de AFK, você poderá escolher entre uma variedade de ações, como !ler ou !desenhar, que terão o mesmo efeito do AFK, mas com uma mensagem diferente.

Nos aliases do comando poderá ver todas as opções de ações disponíveis`;
afkCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  afkCommand,
};
