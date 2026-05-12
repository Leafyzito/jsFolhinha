const path = require("path");
async function getChannelFounders(channel) {
  const api_url = `https://roles.tv/api/channel/login/${channel}`;
  const data = await fb.got(api_url);

  if (!data || (data.error && data.error != null)) {
    return null;
  }

  const totalFounders = data.data.roles.founders;

  return totalFounders;
}

const foundersCommand = async (message) => {
  const targetChannel =
    message.args[1]?.replace(/^@/, "") || message.channelName;
  const founders = await getChannelFounders(targetChannel);

  if (founders === null) {
    return {
      reply: `Esse canal não existe`,
    };
  }

  if (founders === 0) {
    return {
      reply: `O canal ${targetChannel} não tem nenhum fundador`,
    };
  }

  return {
    reply: `Existem ${founders} fundadores em ${targetChannel} - https://roles.tv/c/${targetChannel.toLowerCase()}`,
  };
};

foundersCommand.commandName = "founders";
foundersCommand.aliases = ["founders", "fundadores"];
foundersCommand.shortDescription = "Mostra a lista de founders de algum canal";
foundersCommand.cooldown = 5000;
foundersCommand.cooldownType = "channel";
foundersCommand.whisperable = false;
foundersCommand.description = `Exibe uma lista de founders do canal fornecido ou, caso nenhum canal seja fornecido, da canal onde o comando foi executado

O comando funcionará mesmo em canais que o Folhinha não esteja presente`;
foundersCommand.examples = [
  {
    description: "Ver o número de founders do canal atual",
    input: "!founders",
    output: "Existem 47 fundadores em canalatual - https://roles.tv/c/canalatual",
  },
  {
    description: "Ver o número de founders de outro canal",
    input: "!founders xqc",
    output: "Existem 12345 fundadores em xqc - https://roles.tv/c/xqc",
  },
];
foundersCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  foundersCommand,
};
