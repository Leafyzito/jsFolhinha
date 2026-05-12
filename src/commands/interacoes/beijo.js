const path = require("path");
const beijoCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}beijo <pessoa pra beijar>`,
    };
  }

  const kissTarget = message.args[1].replace(/^@/, "");

  if (kissTarget.toLowerCase() === message.senderUsername) {
    return {
      reply: `Você estava se sentido carente e se beijou no espelho 😘`,
    };
  }

  if (["folhinha", "folhinhabot"].includes(kissTarget.toLowerCase())) {
    return {
      reply: `peepoHappy 🌹`,
    };
  }

  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["kiss", "kissahomie", "catkiss", "beijao"],
    "😘",
  );

  const kisses = [
    `${message.displayName} deu um beijo em ${kissTarget} ${emote}`,
    `${message.displayName} deu um beijo bem molhado em ${kissTarget} ${emote}`,
  ];

  return {
    reply: fb.utils.randomChoice(kisses),
  };
};

beijoCommand.commandName = "beijo";
beijoCommand.aliases = ["beijo", "beijar", "kiss"];
beijoCommand.shortDescription = "Dá um beijo em alguém no chat";
beijoCommand.cooldown = 5000;
beijoCommand.cooldownType = "channel";
beijoCommand.whisperable = true;
beijoCommand.description = "Marque alguém do chat para dar um beijo virtual";
beijoCommand.examples = [
  {
    description: "Dê um beijo virtual em alguém do chat",
    input: "!beijo @leafyzito",
    output: "EmbellishingGrandma deu um beijo em leafyzito kiss",
  },
];
beijoCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = { beijoCommand };
