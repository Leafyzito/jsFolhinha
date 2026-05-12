const path = require("path");
async function getQuery(query) {
  const urlEncodedExpression = encodeURIComponent(query);
  const apiUrl = `http://api.wolframalpha.com/v1/result?appid=${process.env.WOLFRAM_API_KEY}&i=${urlEncodedExpression}&units=metric`;

  const data = await fb.got(apiUrl);
  if (!data) {
    return null;
  }

  return data;
}

const queryCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}query <expressão matemática>. Para mais informações, acesse https://folhinhabot.com/comandos/query`,
    };
  }

  const query = message.args.slice(1).join(" ");
  const queryRes = await getQuery(query);

  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["nerd", "nerdge", "catnerd", "dognerd", "giganerd"],
    "🤓"
  );

  return {
    reply: `${emote} ${queryRes}`,
  };
};

queryCommand.commandName = "query";
queryCommand.aliases = [
  "query",
  "q",
  "math",
  "maths",
  "matematica",
  "matemática",
];
queryCommand.shortDescription = "Faça cálculos matemáticos e conversões";
queryCommand.cooldown = 5000;
queryCommand.cooldownType = "channel";
queryCommand.whisperable = true;
queryCommand.description = `Use !query {expressão matemática} para fazer cálculos matemáticos

Pode também fazer algumas conversões, apenas em inglês, como:
• Conversão de unidades de medida: !query 10cm to inches - O bot irá responder com o resultado: 3.937007874015748

• Conversão de tempo: !query 10 hours in seconds - O bot irá responder com o resultado: 36000
• Hora em algum lugar do mundo: !query time in são paulo - O bot irá responder com o horário atual de São Paulo

• Conversão de moedas: !query 10 USD to BRL - O bot irá responder com o resultado: 55.00
• Conversão de temperatura: !query 100F to C - O bot irá responder com o resultado: 37.78
• Distância entre dois pontos: !query distance between portugal and brazil - O bot irá responder com o resultado: 7318 km (kilometers)

Para mais informações, consulte o site oficial do Wolfram Alpha`;
queryCommand.examples = [
  {
    description: "Fazer um cálculo simples",
    input: "!query 2+2*4",
    output: "🤓 10",
  },
  {
    description: "Converter unidades",
    input: "!query 10cm to inches",
    output: "🤓 3.937007874015748 inches",
  },
];
queryCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  mathCommand: queryCommand,
};
