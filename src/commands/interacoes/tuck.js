const path = require("path");
const tuckCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}tuck <pessoa pra tuckar>`,
    };
  }

  const tuckTarget = message.args[1].replace(/^@/, "");

  if (tuckTarget.toLowerCase() === message.senderUsername) {
    return {
      reply: `Você não tinha ninguém para te pôr pra dormir, então você se auto-colocou pra dormir 💤`,
    };
  }

  if (["folhinha", "folhinhabot"].includes(tuckTarget.toLowerCase())) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["wokege"],
      "😮‍💨",
    );
    return {
      reply: `Valeu por me colocar pra dormir, mas preciso me manter acordado ${emote}`,
    };
  }

  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["tuckk", "tuckahomie", "tuck", "banoit"],
    "💤",
  );

  const tucks = [
    `${message.displayName} colocou ${tuckTarget} pra dormir ${emote}`,
    `${message.displayName} colocou ${tuckTarget} pra dormir com um cobertor bem quentinho ${emote}`,
    `${message.displayName} colocou ${tuckTarget} pra dormir e deu um beijinho na testa ${emote}`,
    `${message.displayName} colocou ${tuckTarget} pra dormir e cantou uma canção de ninar ${emote}`,
    `${message.displayName} colocou ${tuckTarget} pra dormir e contou uma história de ninar ${emote}`,
  ];

  return {
    reply: fb.utils.randomChoice(tucks),
  };
};

tuckCommand.commandName = "tuck";
tuckCommand.aliases = ["tuck"];
tuckCommand.shortDescription = "Coloca alguém para dormir no chat";
tuckCommand.cooldown = 5000;
tuckCommand.cooldownType = "channel";
tuckCommand.whisperable = true;
tuckCommand.description = "Deseje bons sonhos a alguém do chat";
tuckCommand.examples = [
  {
    description: "Colocar alguém pra dormir no chat",
    input: "!tuck @leafyzito",
    output: "EmbellishingGrandma colocou leafyzito pra dormir tuckk",
  },
];
tuckCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = { tuckCommand };
