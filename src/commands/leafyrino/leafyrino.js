const path = require("path");

async function getLastUpdateDate() {
  const response = await fb.got(
    "https://leafyrino.leafyzito.dev/api/last-updated"
  );
  return response.date;
}

// async function getLastUpdate() {
//   const response = await fb.got(
//     "https://leafyrino.leafyzito.dev/features.json"
//   );
//   return response.features[0];
// }

// function formatFeatureText(feature, lang = "pt") {
//   let text = feature?.text?.[lang] ?? feature?.text?.en ?? "";
//   if (feature?.link?.text && text.includes("{link}")) {
//     text = text.replace(/\{link\}/g, feature.link.text);
//   }
//   return text;
// }

const leafyrinoCommand = async () => {
  const lastUpdateDate = await getLastUpdateDate();
  const lastUpdateDateFormatted = new Date(lastUpdateDate).toLocaleDateString(
    "pt-BR"
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
