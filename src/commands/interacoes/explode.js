const path = require("path");
const explodeCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}explode <pessoa pra explodir>`,
    };
  }

  const explodeTarget = message.args[1].replace(/^@/, "");

  if (explodeTarget.toLowerCase() === message.senderUsername) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["leledacuca", "biruta", "eeeh", "peepopiolho"],
      "💥🤨",
    );
    return {
      reply: `Você explodiu a si mesmo ${emote}`,
    };
  }

  if (["folhinha", "folhinhabot"].includes(explodeTarget.toLowerCase())) {
    return {
      reply: `MrDestructoid Boa tentativa, mas eu sou indestrutível`,
    };
  }

  const explosions = [
    `${message.displayName} explodiu ${explodeTarget} 💥`,
    `${message.displayName} explodiu ${explodeTarget} em pedacinhos 💥`,
    `${message.displayName} jogou um bomba em ${explodeTarget} 💣💥`,
    `${message.displayName} jogou uma dinamite em ${explodeTarget} 🧨💥`,
  ];

  return {
    reply: fb.utils.randomChoice(explosions),
  };
};

explodeCommand.commandName = "explode";
explodeCommand.aliases = ["explode", "explodir", "bomb"];
explodeCommand.shortDescription = "Explode alguém no chat";
explodeCommand.cooldown = 5000;
explodeCommand.cooldownType = "channel";
explodeCommand.whisperable = true;
explodeCommand.description = "Exploda virtualmente alguém do chat";
explodeCommand.examples = [
  {
    description: "Explodir alguém do chat",
    input: "!explode @leafyzito",
    output: "EmbellishingGrandma explodiu leafyzito 💥",
  },
];
explodeCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = { explodeCommand };
