const path = require("path");
async function getChannelVips(channel) {
  const api_url = `https://roles.tv/api/channel/login/${channel}`;
  const data = await fb.got(api_url);

  if (!data || (data.error && data.error != null)) {
    return null;
  }

  const totalVips = data.data.roles.vips;

  return totalVips;
}

const vipsCommand = async (message) => {
  const targetChannel =
    message.args[1]?.replace(/^@/, "") || message.channelName;
  const vips = await getChannelVips(targetChannel);

  if (vips === null) {
    return {
      reply: `Esse canal não existe`,
    };
  }

  if (vips === 0) {
    return {
      reply: `O canal #${targetChannel} não tem nenhum vip`,
    };
  }

  return {
    reply: `Existem ${vips} VIPs em #${targetChannel} ● https://roles.tv/c/${targetChannel.toLowerCase()}`,
  };
};

vipsCommand.commandName = "vips";
vipsCommand.aliases = ["vips"];
vipsCommand.shortDescription = "Mostra a lista de vips de algum canal";
vipsCommand.cooldown = 5000;
vipsCommand.cooldownType = "channel";
vipsCommand.whisperable = false;
vipsCommand.description = `Exibe uma lista de vips do canal fornecido ou, caso nenhum canal seja fornecido, da canal onde o comando foi executado

O comando funcionará mesmo em canais que o Folhinha não esteja presente
• Exemplo: !vips - Exibe a lista de vips do canal atual
• Exemplo: !vips {canal} - Exibe a lista de vips do canal escolhido`;
vipsCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  vipsCommand,
};
