const path = require("path");
const { LANGUAGE_MAPPINGS } = require("./langs.js");

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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
  const translatedText = await fb.api.google.translate(
    targetLanguageCode,
    textToTranslate
  );
  if (!translatedText) {
    return {
      reply: `Erro ao traduzir o texto. Tente novamente mais tarde.`,
    };
  }
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

• Exemplo: !translate Hello World - O bot irá traduzir "Hello World" para português
• Exemplo: !translate to:es Hello World - O bot irá traduzir "Hello World" para espanhol
• Exemplo: !translate to:spanish Hello World - O bot irá traduzir "Hello World" para espanhol

A percentagem na resposta do bot é a confiança da tradução, ou seja, a probabilidade de a tradução estar correta

A língua fornecida deve ser o seu código ou o nome do idioma em inglês
Pode ver uma lista de idiomas suportados aqui: https://folhinhabot.com/linguagens`;
translateCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  translateCommand,
};
