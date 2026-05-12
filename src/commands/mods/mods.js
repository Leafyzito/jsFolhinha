const path = require("path");
async function getChannelMods(channel) {
  const api_url = `https://roles.tv/api/channel/login/${channel}`;
  const data = await fb.got(api_url);

  if (!data || (data.error && data.error != null)) {
    return null;
  }

  const totalMods = data.data.roles.moderators;

  return totalMods;
}

const modsCommand = async (message) => {
  const targetChannel = message.args[1]?.replace(/^@/, "") || message.channelName;
  const mods = await getChannelMods(targetChannel);

  if (mods === null) {
    return {
      reply: `Esse canal não existe`,
    };
  }

  if (mods === 0) {
    return {
      reply: `O canal #${targetChannel} não tem nenhum moderador`,
    };
  }

  return {
    reply: `Existem ${mods} moderadores em #${targetChannel} - https://roles.tv/c/${targetChannel.toLowerCase()}`,
  };
};

modsCommand.commandName = "mods";
modsCommand.aliases = ["mods", "moderadores", "moderators"];
modsCommand.shortDescription = "Mostra a lista de mods de algum canal";
modsCommand.cooldown = 5000;
modsCommand.cooldownType = "channel";
modsCommand.whisperable = false;
modsCommand.description = `Exibe uma lista de mods do canal fornecido ou, caso nenhum canal seja fornecido, da canal onde o comando foi executado

O comando funcionará mesmo em canais que o Folhinha não esteja presente`;
modsCommand.examples = [
  {
    description: "Ver a lista de mods do canal atual",
    input: "!mods",
    output: "Existem 17 moderadores em #canalatual - https://roles.tv/c/canalatual",
  },
  {
    description: "Ver a lista de mods de outro canal",
    input: "!mods xqc",
    output: "Existem 31 moderadores em #xqc - https://roles.tv/c/xqc",
  },
];
modsCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  modsCommand,
};
