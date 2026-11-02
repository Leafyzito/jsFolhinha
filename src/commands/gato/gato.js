const path = require("path");
async function getCat() {
  const images = await fb.api.google.searchImages(
    "cute funny cat pinterest",
    fb.utils.randomInt(1, 10)
  );
  if (!images) {
    return null;
  }

  const imageLink = images[fb.utils.randomInt(0, images.length - 1)];
  return fb.api.chuw.shortenUrl(imageLink);
}

const gatoCommand = async () => {
  const cat = await getCat();
  if (!cat) {
    return {
      reply: `Erro ao buscar imagem, tente novamente`,
    };
  }

  return {
    reply: `🐱 ${cat}`,
  };
};

gatoCommand.commandName = "gato";
gatoCommand.aliases = ["gato", "cat"];
gatoCommand.shortDescription = "Mostra uma imagem aleatória de gato";
gatoCommand.cooldown = 5000;
gatoCommand.cooldownType = "channel";
gatoCommand.whisperable = true;
gatoCommand.description = `Receba uma imagem aleatória de um gato
A pesquisa das fotos é feita usando o Google, então meio que pode vir qualquer coisa relacionada com gatos`;
gatoCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  gatoCommand,
};
