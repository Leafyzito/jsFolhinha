const path = require("path");
const fillCommand = async (message) => {
  if (message.args.length < 2) {
    return {
      reply: `Use o formato: ${message.prefix}fill <mensagem>`,
    };
  }

  const maxLength = 499;
  let textToRepeat = message.args.slice(1).join(" ").trim();

  textToRepeat = fb.utils.sanitizeOtherPrefixes(textToRepeat);
  textToRepeat = textToRepeat.slice(0, maxLength);

  let finalText = "";
  while (finalText.length < maxLength) {
    finalText += textToRepeat + " ";
  }

  finalText = finalText.slice(0, maxLength);

  return {
    reply: finalText,
  };
};

fillCommand.commandName = "fill";
fillCommand.aliases = ["fill"];
fillCommand.shortDescription =
  "Faça o bot enviar uma mensagem cheia do que você quiser";
fillCommand.cooldown = 5000;
fillCommand.cooldownType = "channel";
fillCommand.whisperable = true;
fillCommand.description = "O bot vai repetir o que você fornecer até que o limite de caracteres seja atingido (500)";
fillCommand.examples = [
  {
    description: "Encher uma mensagem com um texto",
    input: "!fill OMEGALUL",
    output: "OMEGALUL OMEGALUL OMEGALUL OMEGALUL OMEGALUL OMEGALUL OMEGALUL ... (até 500 caracteres)",
  },
];
fillCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  fillCommand,
};
