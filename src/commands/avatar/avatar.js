const path = require("path");
async function getAvatar(avatarTarget) {
  const avatarUrl = (await fb.api.helix.getUserByUsername(avatarTarget))
    ?.profileImageUrl;
  if (!avatarUrl) {
    return null;
  }

  const feridinhaUrl = await fb.api.feridinha.uploadFromUrl(avatarUrl);

  return feridinhaUrl ? feridinhaUrl : avatarUrl;
}

const avatarCommand = async (message) => {
  const avatarTarget =
    message.args[1]?.replace(/^@/, "") || message.senderUsername;

  const avatar = await getAvatar(avatarTarget);

  if (!avatar) {
    return {
      reply: `O usuário ${avatarTarget} não existe`,
    };
  }

  return {
    reply: `${
      avatarTarget == message.senderUsername
        ? `O seu avatar é: ${avatar}`
        : `O avatar de ${avatarTarget} é: ${avatar}`
    }`,
  };
};

avatarCommand.commandName = "avatar";
avatarCommand.aliases = ["avatar", "pfp"];
avatarCommand.shortDescription = "Mostra o avatar de algum usuário";
avatarCommand.cooldown = 5000;
avatarCommand.cooldownType = "channel";
avatarCommand.whisperable = true;
avatarCommand.description = "Marque alguém para ver a foto de perfil.";
avatarCommand.examples = [
  {
    description: "Ver o avatar de algum usuário",
    input: "!avatar @leafyzito",
    output: "O avatar de leafyzito é: https://f.feridinha.com/abcde.png",
  },
];
avatarCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  avatarCommand,
};
