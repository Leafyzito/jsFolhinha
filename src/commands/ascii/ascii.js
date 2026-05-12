const path = require("path");
async function getAscii(channel, input) {
  if (input.includes(".avif")) {
    input = input.replace(".avif", ".webp");
  }

  // if inoput is a link and doens't end with .avif or .webp, add .webp
  if (
    input.includes("http") &&
    !input.endsWith(".avif") &&
    !input.endsWith(".webp")
  ) {
    if (input.includes("//7tv.app/emotes/")) {
      input = input.replace("7tv.app/emotes/", "cdn.7tv.app/emote/");
    }

    if (!input.endsWith("/")) {
      input = input + "/";
    }

    input = input + "4x.webp";
  }

  // if no "#" in input, add "&c=defaultChannel"
  if (!input.includes("#")) {
    input = `${input}&c=${channel}`;
  } else {
    input = encodeURIComponent(input);
  }

  const api_url = `https://fun.joet.me/ascii?q=${input}`;
  const response = await fb.got(api_url, { timeout: 10000 });

  if (!response) {
    return null;
  }

  const data = response;

  if (data.ok === false) {
    return null;
  }

  return data.msg;
}

const asciiCommand = async (message) => {
  // take as input the whole message but the command word
  const input = message.args.slice(1).join(" ");
  if (input.length === 0) {
    return {
      reply: `Use o formato: ${message.prefix}ascii <emote>`,
    };
  }

  const ascii = await getAscii(message.channelName, input);
  if (!ascii) {
    return {
      reply: `Não encontrei esse emote neste canal`,
    };
  }

  return {
    reply: ascii,
  };
};

asciiCommand.commandName = "ascii";
asciiCommand.aliases = ["ascii"];
asciiCommand.shortDescription = "Veja o ascii de algum emote";
asciiCommand.cooldown = 5000;
asciiCommand.cooldownType = "channel";
asciiCommand.whisperable = false;
asciiCommand.description = `Exibe a arte ascii de algum emote fornecido
Se fornecido um canal específico, o bot irá buscar o emote no canal
Para emotes animados, o frame é escolhido aleatoriamente

Pode também usar vários emotes como input

Pode também passar o link direto do emote:

Mais alguns input opcionais diretos do dev da API:
invert:true(default)|false
removeTransparency:false(default)|true
threshold:0-254(default: 127)
mode:simple(default)|ec|hc|nd`;
asciiCommand.examples = [
  {
    description: "Mandar o ascii de um emote do canal atual",
    input: "!ascii OMEGALUL",
    output: "<arte ascii do emote OMEGALUL>",
  },
  {
    description: "Mandar o ascii de um emote de outro canal",
    input: "!ascii xqcL #xqc",
    output: "<arte ascii do emote xqcL do canal xqc>",
  },
  {
    description: "Mandar o ascii de dois emotes lado a lado",
    input: "!ascii OMEGALUL monkaS",
    output: "<arte ascii dos emotes OMEGALUL e monkaS juntos>",
  },
  {
    description: "Mandar o ascii do link direto de um emote",
    input: "!ascii https://cdn.7tv.app/emote/6042089e77137b000de9e669/4x.avif",
    output: "<arte ascii do emote desse link>",
  },
];
asciiCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  asciiCommand,
};
