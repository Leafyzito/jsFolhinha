const path = require("path");
async function getVipList(user) {
  const api_url = `https://roles.tv/api/summary/vips/login/${user}`;
  const data = await fb.got(api_url);

  if (!data || (data.error && data.error != null)) {
    return null;
  }

  const totalVips = data.data.channels;
  const totalPartners = data.data.partners;
  const totalAffiliates = data.data.affiliates;
  const totalFollowers = data.data.channelsTotalFollowers;

  return {
    totalVips,
    totalPartners,
    totalAffiliates,
    totalFollowers: totalFollowers.toLocaleString("en-US"),
  };
}

const vipListCommand = async (message) => {
  const targetUser =
    message.args[1]?.replace(/^@/, "") || message.senderUsername;
  const userVipList = await getVipList(targetUser);

  if (userVipList === null) {
    return {
      reply: `Esse usuário não existe`,
    };
  }

  if (userVipList.totalVips === 0) {
    return {
      reply: `O usuário ${targetUser} não é vip em nenhum canal`,
    };
  }

  return {
    reply: `${targetUser} é VIP em ${userVipList.totalVips} canais ● ${
      userVipList.totalPartners
    } Parceiros ● ${userVipList.totalAffiliates} Afiliados ● ${
      userVipList.totalFollowers
    } Seguidores no total - https://roles.tv/u/${targetUser.toLowerCase()}`,
  };
};

vipListCommand.commandName = "viplist";
vipListCommand.aliases = ["viplist", "vipslist", "vl"];
vipListCommand.shortDescription =
  "Mostra a lista de canais que algum usuário é vip";
vipListCommand.cooldown = 5000;
vipListCommand.cooldownType = "channel";
vipListCommand.whisperable = false;
vipListCommand.description = `Exibe uma lista de canais onde o usuário fornecido é vip, quantos desses canais são parceiros, afiliados e a soma total de seguidores de todos os canais

Nota: De momento o site está a exibir informação não atualizada`;
vipListCommand.examples = [
  {
    description: "Ver os canais em que você é VIP",
    input: "!viplist",
    output: "EmbellishingGrandma é VIP em 7 canais ● 1 Parceiros ● 2 Afiliados ● 87,420 Seguidores no total - https://roles.tv/u/embellishinggrandma",
  },
  {
    description: "Ver os canais em que outro usuário é VIP",
    input: "!viplist leafyzito",
    output: "leafyzito é VIP em 14 canais ● 3 Parceiros ● 6 Afiliados ● 521,108 Seguidores no total - https://roles.tv/u/leafyzito",
  },
];
vipListCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  vipListCommand,
};
