const path = require("path");
const comandosCommand = async () => {
  return {
    reply: `Para uma lista de comandos acesse https://folhinhabot.com/comandos`,
  };
};

comandosCommand.commandName = "comandos";
comandosCommand.aliases = ["comandos", "commands", "comando", "command"];
comandosCommand.shortDescription = "Veja os comandos disponíveis no bot";
comandosCommand.cooldown = 5000;
comandosCommand.cooldownType = "channel";
comandosCommand.whisperable = true;
comandosCommand.description = "Apenas um comando para direcionar o usuário para a página de comandos do bot";
comandosCommand.examples = [
  {
    description: "Abrir a lista completa de comandos no site",
    input: "!comandos",
    output: "Para uma lista de comandos acesse https://folhinhabot.com/comandos",
  },
  {
    description: "Usar um alias em inglês para o mesmo link",
    input: "!commands",
    output: "Para uma lista de comandos acesse https://folhinhabot.com/comandos",
  }
];
comandosCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = { comandosCommand };
