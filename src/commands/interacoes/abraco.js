const path = require("path");
const abracoCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}abraço <pessoa pra abraçar>`,
    };
  }

  const hugTarget = message.args[1].replace(/^@/, "");

  if (hugTarget.toLowerCase() === message.senderUsername) {
    return {
      reply: `Você estava se sentido carente e resolveu se abraçar a si mesmo 🤗`,
    };
  }

  if (["folhinha", "folhinhabot"].includes(hugTarget.toLowerCase())) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["cathug", "dankhug", "hugs"],
      "peepoHappy 🌹",
    );
    return {
      reply: emote,
    };
  }

  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["cathug", "dankhug", "hugs"],
    "🤗",
  );

  const hugs = [
    `${message.displayName} abraçou ${hugTarget} bem forte ${emote}`,
    `${message.displayName} deu um abraço bem apertado em ${hugTarget} ${emote}`,
    `${message.displayName} abraçou e quase explodiu ${hugTarget} ${emote}`,
    `${message.displayName} abraçou ${hugTarget} bem forte ${emote}`,
    `${message.displayName} abraçou e esmagou ${hugTarget} ${emote}`,
    `${message.displayName} abraçou ${hugTarget} tão forte que foi parar ao espaço ${emote}`,
  ];

  return {
    reply: fb.utils.randomChoice(hugs),
  };
};

abracoCommand.commandName = "abraco";
abracoCommand.aliases = ["abraco", "abraço", "abracar", "abraçar", "hug"];
abracoCommand.shortDescription = "Dá um abraço em alguém no chat";
abracoCommand.cooldown = 5000;
abracoCommand.cooldownType = "channel";
abracoCommand.whisperable = true;
abracoCommand.description = "Marque alguém do chat para dar um abraço virtual";
abracoCommand.examples = [
  {
    description: "Dê um abraço virtual em alguém do chat",
    input: "!abraco @leafyzito",
    output: "EmbellishingGrandma abraçou leafyzito bem forte cathug",
  },
];
abracoCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = { abracoCommand };
