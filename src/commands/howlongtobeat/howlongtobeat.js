const path = require("path");

// Solution from Supinic - https://github.com/Supinic/supibot/blob/master/commands/howlongtobeat/index.ts

const HLTB_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchToken() {
  const now = Date.now();
  const response = await fb.got(
    `https://howlongtobeat.com/api/bleed/init?t=${now}`,
    {
      headers: {
        Origin: "https://howlongtobeat.com",
        Referer: "https://howlongtobeat.com/",
        Accept: "application/json",
        "User-Agent": HLTB_USER_AGENT,
      },
    }
  );

  if (!response) {
    return null;
  }

  const token = response.token;
  const hpKey = response.hpKey;
  const hpVal = response.hpVal;
  // HLTB_TOKEN = token;

  if (!hpKey || hpVal == null) {
    return null;
  }

  return { token, hpKey, hpVal };
}

async function hltbSearch(query) {
  const { token, hpKey, hpVal } = await fetchToken();
  // console.log(token);
  if (!token) {
    throw new Error("Token not fetched");
  }

  const response = await fb.got(`https://howlongtobeat.com/api/bleed`, {
    method: "POST",
    headers: {
      Origin: "https://howlongtobeat.com",
      Referer: "https://howlongtobeat.com/",
      "Content-Type": "application/json",
      "x-auth-token": token,
      "x-hp-key": hpKey,
      "x-hp-val": String(hpVal),
      Accept: "application/json",
      "User-Agent": HLTB_USER_AGENT,
    },
    json: {
      searchType: "games",
      searchTerms: [...query],
      searchPage: 1,
      searchOptions: {
        filter: "",
        games: {
          gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
          modifier: "",
          platform: "",
          rangeCategory: "main",
          rangeTime: { min: null, max: null },
          rangeYear: { min: "", max: "" },
          sortCategory: "popular",
          userId: 0,
        },
        randomizer: 0,
        sort: 0,
      },
      size: 1,
      [hpKey]: hpVal,
    },
  });

  if (!response) {
    return "HTTP request failed";
  }

  // console.log(response);
  return response;
}

function convertToHours(time) {
  return Math.round((time / 3600) * 10 ** 1) / 10 ** 1;
}

const howLongToBeatCommand = async (message) => {
  const query = message.args.slice(1);

  if (query.length === 0) {
    return {
      reply: `Use o formato: ${message.prefix}howlongtobeat <jogo>`,
    };
  }

  try {
    const result = await hltbSearch(query);

    if (result === "HTTP request failed") {
      return {
        reply: `Erro ao buscar o jogo. Tente novamente mais tarde.`,
      };
    }

    if (!result.data || result.data.length === 0) {
      return {
        reply: `Nenhum jogo encontrado com esse nome`,
      };
    }

    const gameName = result.data[0].game_name;
    const releaseDate = result.data[0].release_world;
    const url = `https://howlongtobeat.com/game/${result.data[0].game_id}`;
    const hours = {
      main: convertToHours(result.data[0].comp_main),
      plus: convertToHours(result.data[0].comp_plus),
      full: convertToHours(result.data[0].comp_100),
      all: convertToHours(result.data[0].comp_all),
    };

    return {
      reply: `Tempo médio para completar ${gameName} (${releaseDate}): História principal: ${hours.main} hrs ● Conteúdo secundário: ${hours.plus} hrs ● Complecionista: ${hours.full} hrs ● Todos os estilos: ${hours.all} hrs. ${url}`,
    };
  } catch (error) {
    fb.discord.logError("Error in howlongtobeat:", error);
    return {
      reply: `Erro ao buscar o jogo. Tente novamente`,
    };
  }
};

howLongToBeatCommand.commandName = "howlongtobeat";
howLongToBeatCommand.aliases = ["howlongtobeat", "hltb"];
howLongToBeatCommand.shortDescription =
  "Mostra o tempo que leva para um jogo ser completado";
howLongToBeatCommand.cooldown = 5000;
howLongToBeatCommand.cooldownType = "channel";
howLongToBeatCommand.whisperable = true;
howLongToBeatCommand.description = "Descubra o tempo que leva para um jogo ser completado em média";
howLongToBeatCommand.examples = [
  {
    description: "Ver o tempo médio para completar um jogo",
    input: "!howlongtobeat Hollow Knight",
    output: "Tempo médio para completar Hollow Knight (2017-02-24): História principal: 27 hrs ● Conteúdo secundário: 41 hrs ● Complecionista: 65 hrs ● Todos os estilos: 38 hrs. https://howlongtobeat.com/game/10440",
  },
];
howLongToBeatCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  howLongToBeatCommand,
};
