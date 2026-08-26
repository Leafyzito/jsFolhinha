const path = require("path");

// Solution from Supinic - https://github.com/Supinic/supibot/blob/master/commands/howlongtobeat/index.ts

const HLTB_BASE_URL = "https://howlongtobeat.com";
const HLTB_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ENDPOINT_CACHE_TTL = 24 * 60 * 60 * 1000;
const TOKEN_CACHE_TTL = 60 * 60 * 1000;

let cachedEndpoints = null;
let cachedEndpointsAt = 0;
let cachedToken = null;
let cachedTokenAt = 0;

const hltbHeaders = () => ({
  Origin: HLTB_BASE_URL,
  Referer: `${HLTB_BASE_URL}/`,
  Accept: "application/json",
  "User-Agent": HLTB_USER_AGENT,
});

async function discoverEndpoints(force = false) {
  if (
    !force &&
    cachedEndpoints &&
    Date.now() - cachedEndpointsAt < ENDPOINT_CACHE_TTL
  ) {
    return cachedEndpoints;
  }

  const html = await fb.got(HLTB_BASE_URL, {
    responseType: "text",
    headers: hltbHeaders(),
  });

  if (!html) {
    return null;
  }

  const scriptRegex = /<script[^>]+src="([^"]*chunks[^"]*)"/gi;
  const scriptUrls = new Set();
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scriptUrls.add(match[1].replace(/^\//, ""));
  }

  const initRegex = /\/api\/[^"'\s]+\/init\?t=/;
  const searchRegex = /\/api\/[^"'\s]+\/site/;

  let initPath = null;
  let searchPath = null;

  for (const scriptPath of scriptUrls) {
    const scriptUrl = scriptPath.startsWith("http")
      ? scriptPath
      : `${HLTB_BASE_URL}/${scriptPath}`;

    const script = await fb.got(scriptUrl, {
      responseType: "text",
      headers: hltbHeaders(),
    });

    if (!script) {
      continue;
    }

    if (!initPath) {
      const initMatch = script.match(initRegex);
      if (initMatch) {
        initPath = initMatch[0].replace(/\?t=$/, "");
      }
    }

    if (!searchPath) {
      const searchMatch = script.match(searchRegex);
      if (searchMatch) {
        searchPath = searchMatch[0];
      }
    }

    if (initPath && searchPath) {
      break;
    }
  }

  if (!initPath || !searchPath) {
    return null;
  }

  cachedEndpoints = {
    initUrl: `${HLTB_BASE_URL}${initPath}`,
    searchUrl: `${HLTB_BASE_URL}${searchPath}`,
  };
  cachedEndpointsAt = Date.now();
  return cachedEndpoints;
}

function clearTokenCache() {
  cachedToken = null;
  cachedTokenAt = 0;
}

function clearEndpointCache() {
  cachedEndpoints = null;
  cachedEndpointsAt = 0;
}

async function fetchToken(initUrl, force = false) {
  if (!force && cachedToken && Date.now() - cachedTokenAt < TOKEN_CACHE_TTL) {
    return cachedToken;
  }

  const response = await fb.got(`${initUrl}?t=${Date.now()}`, {
    headers: hltbHeaders(),
  });

  if (!response) {
    return null;
  }

  const { token, hpKey, hpVal } = response;

  if (!token || !hpKey || hpVal == null) {
    return null;
  }

  cachedToken = { token, hpKey, hpVal };
  cachedTokenAt = Date.now();
  console.debug(
    `[HLTB] Updated token cache${force ? " (forced)" : ""} (hpKey: ${hpKey})`
  );
  return cachedToken;
}

async function hltbSearchRequest(query, endpoints, tokenData) {
  const { token, hpKey, hpVal } = tokenData;

  return fb.got(endpoints.searchUrl, {
    method: "POST",
    headers: {
      ...hltbHeaders(),
      "Content-Type": "application/json",
      "x-auth-token": token,
      "x-hp-key": hpKey,
      "x-hp-val": String(hpVal),
    },
    json: {
      searchType: "games",
      searchTerms: [...query],
      searchPage: 1,
      size: 1,
      searchOptions: {
        games: {
          userId: 0,
          platform: "",
          sortCategory: "popular",
          rangeCategory: "main",
          rangeTime: { min: null, max: null },
          gameplay: {
            perspective: "",
            flow: "",
            genre: "",
            difficulty: "",
          },
          rangeYear: { min: "", max: "" },
          modifier: "",
        },
        users: { sortCategory: "postcount" },
        lists: { sortCategory: "follows" },
        filter: "",
        sort: 0,
        randomizer: 0,
      },
      useCache: true,
      [hpKey]: hpVal,
    },
  });
}

async function hltbSearch(query) {
  let endpoints = await discoverEndpoints(false);
  if (!endpoints) {
    return "HTTP request failed";
  }

  let tokenData = await fetchToken(endpoints.initUrl, false);
  if (!tokenData) {
    return "HTTP request failed";
  }

  let result = await hltbSearchRequest(query, endpoints, tokenData);
  if (result) {
    return result;
  }

  clearTokenCache();
  tokenData = await fetchToken(endpoints.initUrl, true);
  if (tokenData) {
    result = await hltbSearchRequest(query, endpoints, tokenData);
    if (result) {
      return result;
    }
  }

  clearEndpointCache();
  clearTokenCache();
  endpoints = await discoverEndpoints(true);
  if (!endpoints) {
    return "HTTP request failed";
  }

  tokenData = await fetchToken(endpoints.initUrl, true);
  if (!tokenData) {
    return "HTTP request failed";
  }

  result = await hltbSearchRequest(query, endpoints, tokenData);
  if (!result) {
    return "HTTP request failed";
  }

  return result;
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
howLongToBeatCommand.description = `Descubra o tempo que leva para um jogo ser completado em média
• Exemplo: !howlongtobeat Hollow Knight - O bot vai responder com o tempo que leva para completar o jogo fornecido juntamente com um link para a página do jogo no site howlongtobeat.com`;
howLongToBeatCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  howLongToBeatCommand,
};
