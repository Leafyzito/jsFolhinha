const path = require("path");

async function getRandomFandomPage() {
  try {
    const searchParams = new URLSearchParams({
      action: "query",
      list: "random",
      rnnamespace: "0",
      format: "json",
    });

    const data = await fb.got(
      `https://ordemparanormal.fandom.com/api.php?${searchParams}`
    );

    if (!data || !data.query || !data.query.random || data.query.random.length === 0) {
      return null;
    }

    const pageTitle = data.query.random[0].title.replace(/ /g, "_");
    return `https://ordemparanormal.fandom.com/wiki/${pageTitle}`;
  } catch (error) {
    throw new Error(`Failed to get random Fandom page: ${error.message}`);
  }
}

async function searchFandomPage(query) {
  try {
    const searchParams = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: 1,
      format: "json",
    });

    const data = await fb.got(
      `https://ordemparanormal.fandom.com/api.php?${searchParams}`
    );

    if (
      !data ||
      !data.query ||
      !data.query.search ||
      data.query.search.length === 0
    ) {
      return null;
    }

    const page = data.query.search[0];
    const pageTitle = page.title.replace(/ /g, "_");
    return `https://ordemparanormal.fandom.com/wiki/${pageTitle}`;
  } catch (error) {
    throw new Error(`Failed to search Fandom: ${error.message}`);
  }
}

const ordemCommand = async (message) => {
  const query = message.args.slice(1).join(" ").trim();
  const wikiLink =
    query === "" || query === null
      ? await getRandomFandomPage()
      : await searchFandomPage(query);
  if (wikiLink === null) {
    return {
      reply: `Não encontrei nenhuma página sobre isso na wiki de Ordem Paranormal`,
    };
  }

  return {
    reply: `🔗 ${wikiLink}`,
  };
};

ordemCommand.commandName = "ordem";
ordemCommand.aliases = ["ordem", "op"];
ordemCommand.shortDescription =
  "Pesquise ou receba uma página aleatória da wiki de Ordem Paranormal";
ordemCommand.cooldown = 5000;
ordemCommand.cooldownType = "channel";
ordemCommand.whisperable = true;
ordemCommand.description = `Pesquise personagens e páginas do wiki de Ordem Paranormal (https://ordemparanormal.fandom.com/) e receba o link direto para a página. Sem argumentos, retorna uma página aleatória da wiki`;
ordemCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  ordemCommand,
};
