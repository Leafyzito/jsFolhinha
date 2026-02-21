const path = require("path");

async function getLastUpdateDate() {
  const response = await fb.got(
    "https://leafyrino.leafyzito.dev/api/last-updated",
  );
  return response.date;
}

const leafyrinoCommand = async () => {
  const lastUpdateDate = await getLastUpdateDate();
  const lastUpdateDateFormatted = new Date(lastUpdateDate).toLocaleDateString(
    "pt-BR",
  );
  return {
    reply: `🔗 https://leafyrino.leafyzito.dev ● Última atualização: ${lastUpdateDateFormatted}`,
  };
};

leafyrinoCommand.commandName = "leafyrino";
leafyrinoCommand.aliases = ["leafyrino"];
leafyrinoCommand.shortDescription = "Comando para o link do Leafyrino";
leafyrinoCommand.cooldown = 5000;
leafyrinoCommand.cooldownType = "channel";
leafyrinoCommand.whisperable = true;
leafyrinoCommand.description = `Apenas um comando para o link do Leafyrino (Chatterino versão do Leafyzito)`;
leafyrinoCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  leafyrinoCommand,
};
