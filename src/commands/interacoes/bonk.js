const path = require("path");
const bonkCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}bonk <pessoa pra bonkar>`,
    };
  }

  const bonkTarget = message.args[1].replace(/^@/, "");

  if (bonkTarget.toLowerCase() === message.senderUsername) {
    const emote = await fb.emotes.getEmoteFromList(message.channelName, [
      "leledacuca",
      "biruta",
    ]);
    return {
      reply: `Você estava se sentindo bobinho e resolveu se bonkar na cabeça ${emote}`,
    };
  }

  if (["folhinha", "folhinhabot"].includes(bonkTarget.toLowerCase())) {
    return {
      reply: `Não me bate ow Stare`,
    };
  }

  const bonkStrengh = fb.utils.randomInt(0, 100);

  if (bonkStrengh === 0) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["pfff", "pffff", "pfft", "porvalo", "mock", "pointandlaugh"],
      "🤭",
    );
    return {
      reply: `${message.displayName} tentou bonkar ${bonkTarget} mas acabou se auto-nocauteando (impacto de ${bonkStrengh}%) ${emote}`,
    };
  } else if (bonkStrengh === 100) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["peepopoof", "pppoof", "pepepoof"],
      "💨",
    );
    return {
      reply: `${message.displayName} deu um bonk com impacto de ${bonkStrengh}% em ${bonkTarget}, sendo apagado da existência ${emote}`,
    };
  } else if (bonkStrengh <= 25) {
    return {
      reply: `${message.displayName} deu um bonk com impacto de ${bonkStrengh}% em ${bonkTarget}, bem fraco 🤭`,
    };
  } else if (bonkStrengh >= 80) {
    return {
      reply: `${message.displayName} deu um bonk com impacto de ${bonkStrengh}% e nocauteou ${bonkTarget} 💫`,
    };
  }

  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["bonking", "yaebonk", "bonked", "bonkcat", "donkbonk"],
    "BOP",
  );
  return {
    reply: `${message.displayName} deu um bonk com impacto de ${bonkStrengh}% em ${bonkTarget} ${emote}`,
  };
};

bonkCommand.commandName = "bonk";
bonkCommand.aliases = ["bonk"];
bonkCommand.shortDescription = "Dá um bonk em alguém no chat";
bonkCommand.cooldown = 5000;
bonkCommand.cooldownType = "channel";
bonkCommand.whisperable = true;
bonkCommand.description = "Marque alguém do chat para dar um bonk com uam força aleatória entre 0% e 100%";
bonkCommand.examples = [
  {
    description: "Dê um bonk em alguém do chat",
    input: "!bonk @leafyzito",
    output: "EmbellishingGrandma deu um bonk com impacto de 73% em leafyzito bonking",
  },
];
bonkCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = { bonkCommand };
