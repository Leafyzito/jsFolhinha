const path = require("path");
async function getDog() {
  const images = await fb.api.google.searchImages(
    "cute funny dog pinterest",
    fb.utils.randomInt(1, 10)
  );
  if (!images) {
    return null;
  }

  const imageLink = images[fb.utils.randomInt(0, images.length - 1)];
  return fb.api.chuw.shortenUrl(imageLink);
}

const cachorroCommand = async () => {
  const dog = await getDog();
  if (!dog) {
    return {
      reply: `Erro ao buscar imagem, tente novamente`,
    };
  }

  return {
    reply: `🐶 ${dog}`,
  };
};

cachorroCommand.commandName = "cachorro";
cachorroCommand.aliases = ["cachorro", "dog", "doggo", "cao"];
cachorroCommand.shortDescription = "Mostra uma imagem aleatória de cachorro";
cachorroCommand.cooldown = 5000;
cachorroCommand.cooldownType = "channel";
cachorroCommand.whisperable = true;
cachorroCommand.description = `Receba uma imagem aleatória de um cachorro
A pesquisa das fotos é feita usando o Google, então meio que pode vir qualquer coisa relacionada com cachorros`;
cachorroCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  cachorroCommand,
};
