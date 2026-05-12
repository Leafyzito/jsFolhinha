const path = require("path");
const meCommand = async (message) => {
  if (message.args.length < 2) {
    return {
      reply: `Use o formato: ${message.prefix}me <mensagem>`,
    };
  }

  let msgContent = message.args.slice(1).join(" ").trim();

  msgContent = fb.utils.sanitizeOtherPrefixes(msgContent);

  if (msgContent === "") {
    return {
      reply: `Use o formato: ${message.prefix}me <mensagem>`,
    };
  }

  return {
    reply: msgContent,
    replyType: "me",
  };
};

meCommand.commandName = "me";
meCommand.aliases = ["me"];
meCommand.shortDescription = "Faz o bot mandar uma mensagem";
meCommand.cooldown = 5000;
meCommand.cooldownType = "channel";
meCommand.whisperable = false;
meCommand.description = "Forneça uma mensagem para o bot enviar";
meCommand.examples = [
  {
    description: "Fazer o bot enviar uma mensagem",
    input: "!me Olá mundo",
    output: "Olá mundo",
  },
];
meCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  meCommand,
};
