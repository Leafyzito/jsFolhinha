const path = require("path");
async function getAllNicks(userId) {
  const api_url = `https://logs.spanix.team/namehistory/${userId}`;
  const data = await fb.got(api_url);

  if (!data) {
    return null;
  }

  // Sort the data by first_timestamp in ascending order
  const sortedData = data.sort(
    (a, b) => new Date(a.first_timestamp) - new Date(b.first_timestamp)
  );

  const nicks = sortedData.map((nick) => nick.user_login);
  return nicks;
}

const nicksCommand = async (message) => {
  const nicksTarget =
    message.args[1]?.replace(/^@/, "").toLowerCase() || message.senderUsername;
  let targetId = null;
  if (nicksTarget.toLowerCase().startsWith("id:")) {
    targetId = nicksTarget.slice(3).trim();
    // Remove possible trailing or leading spaces
    if (!targetId) {
      return {
        reply: `Use o formato: ${message.prefix}nick id:12345`,
      };
    }
  }

  // skip lookup if specified id
  if (!targetId) {
    // to allow searching for old nicks
    const userDbInfo = await fb.db.get("users", { aliases: nicksTarget });
    const userDbArr = Array.isArray(userDbInfo) ? userDbInfo : [userDbInfo];
    if (userDbInfo && userDbArr.length === 1) {
      targetId = userDbArr[0].userid;
    } else if (userDbArr.length > 1) {
      fb.discord.importantLog(
        `* userDb match info returned multiple results for ${nicksTarget}, look into it` // TODO: handle this
      );
    } else {
      targetId = (await fb.api.helix.getUserByUsername(nicksTarget))?.id;
    }
  }

  if (!targetId) {
    return {
      reply: `Esse usuário não existe`,
    };
  }

  const aliases = await getAllNicks(targetId);
  if (!aliases) {
    return {
      reply: `Erro ao buscar histórico de nicks`,
    };
  }

  let response = `${
    nicksTarget === message.senderUsername
      ? `O seu histórico de nicks é:`
      : `O histórico de nicks de ${nicksTarget} é:`
  } ${aliases.join(" → ")}`;

  if (response.length > 490) {
    response = response.substring(0, 487) + "...";
  }

  return {
    reply: response,
  };
};

nicksCommand.commandName = "nick";
nicksCommand.aliases = ["nick", "nicks", "namehistory", "nickhistory"];
nicksCommand.shortDescription = "Mostra o histórico de nicks de algum usuário";
nicksCommand.cooldown = 5000;
nicksCommand.cooldownType = "channel";
nicksCommand.whisperable = true;
nicksCommand.description = "Exibe o histórico de nicks de um usuário ou de quem executou o comando caso nenhum usuário seja fornecido";
nicksCommand.examples = [
  {
    description: "Ver o histórico de nicks de outro usuário",
    input: "!nick @leafyzito",
    output: "O histórico de nicks de leafyzito é: leafyzitoOLD → leafy → leafyzito",
  },
  {
    description: "Ver o histórico de nicks por ID",
    input: "!nick id:12345",
    output: "O histórico de nicks de fulano é: fulanoX → fulano",
  },
];
nicksCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  nicksCommand,
};
