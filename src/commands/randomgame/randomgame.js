const path = require("path");

async function getRandomGame() {
  const random_num = fb.utils.randomInt(1, 44950);
  const api_url = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&page=${random_num}`;
  const response = await fb.got(api_url);
  if (!response) {
    return null;
  }
  const random = fb.utils.randomChoice(response.results);
  const game = {
    name: random.name,
    slug: random.slug,
    site: `https://rawg.io/games/${random.slug}`,
    released: new Date(random.released).toLocaleDateString("fr-FR") || "N/A",
    platforms: random.platforms
      .map((platform) => platform.platform.name)
      .join(", "),
    genres: random.genres.map((genre) => genre.name).join(", "),
  };
  return game;
}

const randomGameCommand = async () => {
  const game = await getRandomGame();
  if (!game) {
    return {
      reply: "Não foi possível encontrar um jogo aleatório",
    };
  }
  return {
    reply: `🎮 ${game.name} (${game.released}) ● Plataformas: ${game.platforms} ● Gêneros: ${game.genres} ● ${game.site}`,
  };
};

randomGameCommand.commandName = "randomgame";
randomGameCommand.aliases = ["randomgame", "rg"];
randomGameCommand.shortDescription = "Comando para encontrar um jogo aleatório";
randomGameCommand.cooldown = 5000;
randomGameCommand.cooldownType = "channel";
randomGameCommand.whisperable = true;
randomGameCommand.description = `Use para encontrar um jogo aleatório usando a API da RAWG`;
randomGameCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  randomGameCommand,
};
