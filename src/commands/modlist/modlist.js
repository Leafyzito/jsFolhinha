const path = require("path");
async function getModList(user) {
  const api_url = `https://roles.tv/api/summary/moderators/login/${user}`;
  const data = await fb.got(api_url);

  if (!data || (data.error && data.error != null)) {
    return null;
  }

  const totalMods = data.data.channels;
  const totalPartners = data.data.partners;
  const totalAffiliates = data.data.affiliates;
  const totalFollowers = data.data.channelsTotalFollowers;

  return {
    totalMods,
    totalPartners,
    totalAffiliates,
    totalFollowers: totalFollowers.toLocaleString("en-US"),
  };
}

const modListCommand = async (message) => {
  const targetUser =
    message.args[1]?.replace(/^@/, "") || message.senderUsername;
  const userModList = await getModList(targetUser);

  if (userModList === null) {
    return {
      reply: `Esse usuário não existe`,
    };
  }

  if (userModList.totalMods === 0) {
    return {
      reply: `O usuário ${targetUser} não é moderador em nenhum canal`,
    };
  }

  return {
    reply: `${targetUser} é moderador em ${userModList.totalMods} canais ● ${
      userModList.totalPartners
    } Parceiros ● ${userModList.totalAffiliates} Afiliados ● ${
      userModList.totalFollowers
    } Seguidores no total - https://roles.tv/u/${targetUser.toLowerCase()}`,
  };
};

modListCommand.commandName = "modlist";
modListCommand.aliases = ["modlist", "modslist", "ml"];
modListCommand.shortDescription =
  "Mostra a lista de canais que algum usuário modera";
modListCommand.cooldown = 5000;
modListCommand.cooldownType = "channel";
modListCommand.whisperable = false;
modListCommand.description = `Exibe uma lista de canais onde o usuário fornecido é moderador, quantos desses canais são parceiros, afiliados e a soma total de seguidores de todos os canais

Nota: De momento o site está a exibir informação não atualizada`;
modListCommand.examples = [
  {
    description: "Ver os canais em que você é moderador",
    input: "!modlist",
    output: "EmbellishingGrandma é moderador em 12 canais ● 2 Parceiros ● 5 Afiliados ● 145,320 Seguidores no total - https://roles.tv/u/embellishinggrandma",
  },
  {
    description: "Ver os canais em que outro usuário é moderador",
    input: "!modlist leafyzito",
    output: "leafyzito é moderador em 47 canais ● 8 Parceiros ● 21 Afiliados ● 2,341,108 Seguidores no total - https://roles.tv/u/leafyzito",
  },
];
modListCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  modListCommand,
};
