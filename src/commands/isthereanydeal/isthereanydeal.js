const path = require("path");

// Map of currency codes to representative country codes for itad API
const CURRENCY_TO_COUNTRY = {
  BRL: "BR", // Brazil - Real
  USD: "US", // United States - Dollar
  EUR: "FR", // France - Euro (France as default for Euro)
  GBP: "GB", // United Kingdom - Pound
  ARS: "AR", // Argentina - Peso
  CAD: "CA", // Canada - Dollar
  RUB: "RU", // Russia - Ruble
  AUD: "AU", // Australia - Dollar
  PLN: "PL", // Poland - Złoty
  TRY: "TR", // Turkey - Lira
  // Add more mappings as needed
};

function getCountryByCurrency(currency) {
  if (!currency) return "BR";
  currency = currency.toUpperCase();
  return CURRENCY_TO_COUNTRY[currency] || "BR";
}

async function getItadPrices(gameId, countryCode = "BR") {
  const api_url = `https://api.isthereanydeal.com/games/overview/v2?key=${process.env.ISTHEREANYDEAL_API_KEY}&country=${countryCode}`;
  const res = await fb.got(api_url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    json: [gameId],
  });
  if (!res || res.length == 0) {
    return null;
  }

  const currency = res.prices[0].current.price.currency;
  const currentPrice = res.prices[0].current.price.amount;
  const lowestPrice = res.prices[0].lowest.price.amount;
  const shopName = res.prices[0].current.shop.name;
  return { currency, currentPrice, lowestPrice, shopName };
}

async function getItadInfo(game, countryCode = "BR") {
  const api_url = `https://api.isthereanydeal.com/games/search/v1?key=${
    process.env.ISTHEREANYDEAL_API_KEY
  }&title=${encodeURIComponent(game)}`;

  const res = await fb.got(api_url);
  if (!res || res.length == 0) {
    return null;
  }
  const gameId = res[0].id;
  const gameTitle = res[0].title;
  const gameSlug = res[0].slug;
  const itadLink = `https://isthereanydeal.com/game/${gameSlug}/info/`;

  const prices = await getItadPrices(gameId, countryCode);

  return { gameId, gameTitle, gameSlug, itadLink, prices };
}

const isThereAnyDealCommand = async (message) => {
  // Allow the user to specify a currency flag: "currency:XXX" or "moeda:XXX"
  const args = message.args.slice(1);
  const filteredArgs = [];
  let wantedCurrency = null;

  for (let i = 0; i < args.length; ++i) {
    const lower = args[i].toLowerCase();
    if (lower.startsWith("currency:") || lower.startsWith("moeda:")) {
      // e.g. currency:usd, moeda:eur
      wantedCurrency = args[i]
        .substring(args[i].indexOf(":") + 1)
        .trim()
        .toUpperCase();
    } else {
      filteredArgs.push(args[i]);
    }
  }

  const targetGame = filteredArgs.length > 0 ? filteredArgs.join(" ") : null;

  if (!targetGame) {
    return {
      reply: `Use o formato: ${message.prefix}deal <jogo> [moeda:<código da moeda>]`,
    };
  }

  const countryCode = getCountryByCurrency(wantedCurrency);

  const itad = await getItadInfo(targetGame, countryCode);
  if (!itad) {
    return { reply: "Nenhum jogo encontrado com esse nome" };
  }

  return {
    reply: `Menor preço atual de "${itad.gameTitle}": ${
      itad.prices.currentPrice + " " + itad.prices.currency
    } na loja ${itad.prices.shopName} ● Menor preço de sempre: ${
      itad.prices.lowestPrice + " " + itad.prices.currency
    } ● ${itad.itadLink}`,
  };
};

isThereAnyDealCommand.commandName = "isthereanydeal";
isThereAnyDealCommand.aliases = ["isthereanydeal", "itad", "deal"];
isThereAnyDealCommand.shortDescription =
  "Mostra o menor preço do momento de um jogo";
isThereAnyDealCommand.cooldown = 5000;
isThereAnyDealCommand.cooldownType = "channel";
isThereAnyDealCommand.whisperable = true;
isThereAnyDealCommand.description = `Mostra o menor preço do momento e o menor preço histórico de um jogo de acordo com o isthereanydeal.com. 
Se quiser que a moeda da resposta seja diferente de BRL, use 'moeda:' e o código da moeda`;
isThereAnyDealCommand.examples = [
  {
    description: "Ver o menor preço atual de um jogo",
    input: "!deal elden ring",
    output: "Menor preço atual de \"Elden Ring\": 199.50 BRL na loja Steam ● Menor preço de sempre: 149.62 BRL ● https://isthereanydeal.com/game/elden-ring/info/",
  },
  {
    description: "Ver o menor preço atual em outra moeda",
    input: "!deal elden ring moeda:usd",
    output: "Menor preço atual de \"Elden Ring\": 41.99 USD na loja Steam ● Menor preço de sempre: 29.99 USD ● https://isthereanydeal.com/game/elden-ring/info/",
  },
];
isThereAnyDealCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  isThereAnyDealCommand,
};
