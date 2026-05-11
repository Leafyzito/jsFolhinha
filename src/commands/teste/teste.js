const path = require("path");
const testeCommand = async () => {
  return {
    replyType: "reply",
    reply: "testado",
    notes: "notes test",
  };
};

testeCommand.commandName = "teste";
testeCommand.aliases = ["teste", "test", "testing"];
testeCommand.shortDescription = "Comando para verificar se o bot está vivo";
testeCommand.cooldown = 5000;
testeCommand.cooldownType = "channel";
testeCommand.whisperable = true;
testeCommand.description = `Use para verificar se o Folhinha ainda está presente entre nós. Caso ele não responda, infelizmente ele se foi.`;
testeCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  testeCommand,
};
