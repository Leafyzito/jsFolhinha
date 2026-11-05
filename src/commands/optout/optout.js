const path = require("path");
const { commandsList } = require("../commandsList");

const CHANNEL_TARGETS = ["channel", "canal"];

async function toggleOwnChannel(message, doOptout) {
  if (!message.isStreamer) {
    return {
      reply: `Apenas o streamer pode usar este comando`,
    };
  }

  const channelInfo = await fb.db.get("users", { userid: message.channelID });
  if (!channelInfo) {
    return {
      reply: `Usuário não encontrado na base de dados`,
    };
  }

  if (Boolean(channelInfo.optoutOwnChannel) === doOptout) {
    return {
      reply: `O canal já ${doOptout ? "" : "não "}está sendo censurado em comandos stalk`,
    };
  }

  await fb.db.update(
    "users",
    { userid: message.channelID },
    { $set: { optoutOwnChannel: doOptout } }
  );

  return {
    reply: `A partir de agora o canal ${doOptout ? "" : "não "}será censurado em comandos stalk`,
  };
}

// optin all also clears the single command optouts, so it really means every command
async function toggleAll(message, doOptout, optouts) {
  if (doOptout ? optouts.includes("all") : optouts.length === 0) {
    return {
      reply: doOptout
        ? `Você já optou por não ser alvo de nenhum comando`
        : `Você já pode ser alvo de todos os comandos`,
    };
  }

  await fb.db.update(
    "users",
    { userid: message.senderUserID },
    doOptout ? { $addToSet: { optouts: "all" } } : { $set: { optouts: [] } }
  );

  return {
    reply: doOptout
      ? `A partir de agora você não pode ser alvo de nenhum comando com optout`
      : `A partir de agora você pode ser alvo de todos os comandos`,
  };
}

const optoutCommand = async (message) => {
  const doOptout = message.aliasUsed !== "optin";
  const usage = `Use o formato ${message.prefix}${doOptout ? "optout" : "optin"} <comando>. Veja os comandos disponíveis em https://folhinhabot.com/comandos/optout`;

  const target = message.args[1]?.toLowerCase();
  if (!target) {
    return { reply: usage };
  }

  if (CHANNEL_TARGETS.includes(target)) {
    return toggleOwnChannel(message, doOptout);
  }

  const isAll = target === "all";
  const command = fb.commandsList[target];
  if (!isAll && !command?.optoutable) {
    return { reply: usage };
  }

  const userInfo = await fb.db.get("users", { userid: message.senderUserID });
  if (!userInfo) {
    return {
      reply: `Usuário não encontrado na base de dados`,
    };
  }

  const optouts = userInfo.optouts ?? [];

  if (isAll) {
    return toggleAll(message, doOptout, optouts);
  }

  const commandName = command.commandName;

  if (optouts.includes("all")) {
    return {
      reply: `Você optou por não ser alvo de nenhum comando. Use ${message.prefix}optin all para voltar a ser alvo de todos`,
    };
  }

  const isOptedOut = optouts.includes(commandName);
  if (isOptedOut === doOptout) {
    return {
      reply: doOptout
        ? `Você já optou por não ser alvo de comandos ${commandName}. Use ${message.prefix}optin ${commandName} para voltar a ser`
        : `Você já pode ser alvo de comandos ${commandName}`,
    };
  }

  await fb.db.update(
    "users",
    { userid: message.senderUserID },
    doOptout
      ? { $addToSet: { optouts: commandName } }
      : { $pull: { optouts: commandName } }
  );

  return {
    reply: `A partir de agora você ${doOptout ? "não " : ""}pode ser alvo de comandos ${commandName}`,
  };
};

optoutCommand.commandName = "optout";
optoutCommand.aliases = ["optout", "optin"];
optoutCommand.shortDescription =
  "Opte por não ser alvo de alguns comandos do bot";
optoutCommand.cooldown = 5000;
optoutCommand.cooldownType = "channel";
optoutCommand.whisperable = false;
// getter so the list follows the optoutable flags, commandsList is only filled after every command file loads
Object.defineProperty(optoutCommand, "description", {
  enumerable: true,
  get() {
    const optoutableNames = [
      ...new Set(
        Object.values(commandsList)
          .filter((command) => command.optoutable)
          .map((command) => command.commandName)
      ),
    ].sort();

    return `Escolha se outras pessoas podem usar alguns comandos do bot em você

!optout <comando> - Impede que outras pessoas usem o comando em você
!optin <comando> - Volta a permitir que outras pessoas usem o comando em você
!optout all - Impede que outras pessoas usem qualquer comando com optout em você
!optin all - Volta a permitir todos os comandos, incluindo os que tinha optado individualmente
!optout channel - Censura o nome do seu canal no uso de comandos stalk (apenas o streamer)
!optin channel - Deixa de censurar o nome do seu canal no uso de comandos stalk

Comandos com optout: ${optoutableNames.join(", ")}`;
  },
});
optoutCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  optoutCommand,
};
