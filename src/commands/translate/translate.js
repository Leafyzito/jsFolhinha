const path = require("path");
const { LANGUAGE_MAPPINGS } = require("./langs.js");

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function translateText(targetLanguage, textToTranslate) {
  const params = new URLSearchParams({
    client: "gtx",
    dt: "t",
    ie: "UTF-8",
    oe: "UTF-8",
    sl: "auto",
    tl: targetLanguage,
    q: textToTranslate,
  });

  const data = await fb.got(
    `https://translate.googleapis.com/translate_a/single?${params}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    }
  );

  if (!data) {
    return null;
  }
  const translatedText = data[0].map((segment) => segment[0]).join("");
  const fromLanguage = data[2];
  const toLanguage = data[3];
  const confidence = Math.round(data[6] * 100);
  return { translatedText, fromLanguage, toLanguage, confidence };
}

function isLanguageSupported(language) {
  // Handle direct language codes (e.g. "pt")
  if (Object.values(LANGUAGE_MAPPINGS).includes(language)) {
    return true;
  }
  // Handle language names (e.g. "portuguese")
  return LANGUAGE_MAPPINGS[language.toLowerCase()] !== undefined;
}

const translateCommand = async (message) => {
  if (message.args.length < 2) {
    return {
      reply: `Use o formato: ${message.prefix}translate <texto para traduzir>`,
    };
  }

  let targetLanguage = null;
  let targetLanguageCode = null;
  const args = [...message.args];

  for (const word of args.slice(1)) {
    if (word.startsWith("to:")) {
      const languageQuery = word.split(":")[1].toLowerCase();
      targetLanguage =
        Object.keys(LANGUAGE_MAPPINGS).find(
          (key) =>
            key.toLowerCase() === languageQuery ||
            LANGUAGE_MAPPINGS[key].toLowerCase() === languageQuery
        ) || languageQuery;
      targetLanguageCode = LANGUAGE_MAPPINGS[targetLanguage];
      args.splice(args.indexOf(word), 1);
    }
  }

  if (!targetLanguage) {
    targetLanguage = "pt";
    targetLanguageCode = "pt";
  }
  if (!isLanguageSupported(targetLanguage)) {
    return {
      reply: `O idioma "${targetLanguage}" não é válido. Tente colocar o código do idioma ou em inglês, por exemplo: "pt" ou "portuguese". Lista completa aqui: https://folhinhabot.com/linguagens`,
    };
  }

  const textToTranslate = args.slice(1).join(" ");
  const translatedText = await translateText(
    targetLanguageCode,
    textToTranslate
  );
  const translateFrom = translatedText.fromLanguage;

  // match language to language code from json file
  const fromLanguageFullname =
    Object.keys(LANGUAGE_MAPPINGS).find(
      (key) =>
        LANGUAGE_MAPPINGS[key].toLowerCase() === translateFrom.toLowerCase()
    ) || translateFrom;
  const targetLanguageFullname =
    Object.keys(LANGUAGE_MAPPINGS).find(
      (key) =>
        LANGUAGE_MAPPINGS[key].toLowerCase() === targetLanguage.toLowerCase()
    ) || targetLanguage;

  return {
    reply: `${capitalize(fromLanguageFullname)} → ${capitalize(
      targetLanguageFullname
    )} 
    ${
      translatedText.confidence != 100 ? ` (${translatedText.confidence}%)` : ""
    }: 
    ${translatedText.translatedText}`,
  };
};

translateCommand.commandName = "translate";
translateCommand.aliases = [
  "traducao",
  "traduçao",
  "tradução",
  "translate",
  "traduzir",
  "t",
];
translateCommand.shortDescription = "Traduza algum texto";
translateCommand.cooldown = 5000;
translateCommand.cooldownType = "channel";
translateCommand.whisperable = true;
translateCommand.langCodes = Object.entries(LANGUAGE_MAPPINGS).map(
  ([language, code]) => ({
    language,
    code,
  })
);
translateCommand.description = `Forneça um texto para o bot traduzir para português, ou, caso especificado, para outra língua

A percentagem na resposta do bot é a confiança da tradução, ou seja, a probabilidade de a tradução estar correta

A língua fornecida deve ser o seu código ou o nome do idioma em inglês
Pode ver uma lista de idiomas suportados aqui: https://folhinhabot.com/linguagens`;
translateCommand.examples = [
  {
    description: "Traduzir um texto para português (idioma padrão)",
    input: "!translate Hello World",
    output: "English → Portuguese: Olá Mundo",
  },
  {
    description: "Traduzir para outro idioma pelo código",
    input: "!translate to:es Hello World",
    output: "English → Spanish: Hola Mundo",
  },
  {
    description: "Traduzir para outro idioma pelo nome em inglês",
    input: "!translate to:spanish Hello World",
    output: "English → Spanish: Hola Mundo",
  },
];
translateCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  translateCommand,
  translateText,
};
