const path = require("path");
const plusCommand = async () => {
  return {
    reply:
      "⭐ Veja mais informações sobre o Folhinha Plus aqui: https://folhinhabot.com/plus",
  };
};

plusCommand.commandName = "plus";
plusCommand.aliases = ["plus"];
plusCommand.shortDescription = "Link para a página do Folhinha Plus";
plusCommand.cooldown = 5000;
plusCommand.cooldownType = "channel";
plusCommand.whisperable = true;
plusCommand.description = `Mostra um link para a página do Folhinha Plus`;
plusCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  plusCommand,
};
