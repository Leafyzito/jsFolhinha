const path = require("path");
const randomEmoteCommand = async (message) => {
  let amount = message.args[1] || 1;
  amount = parseInt(amount);
  if (isNaN(amount) || amount < 1) {
    amount = 1;
  }

  if (amount > 50) {
    return {
      reply: `O limite máximo é 50`,
    };
  }

  const channelEmotes = await fb.emotes.getChannelEmotes(message.channelName);
  const emotesList = [];

  for (let i = 0; i < amount; i++) {
    const randomEmote = Math.floor(Math.random() * channelEmotes.length);

    if (emotesList.includes(channelEmotes[randomEmote])) {
      continue;
    }

    emotesList.push(channelEmotes[randomEmote]);
  }

  const finalRes = emotesList.join(" ").substring(0, 490);
  return {
    reply: `🤖 ${finalRes}`,
  };
};

randomEmoteCommand.commandName = "randomemote";
randomEmoteCommand.aliases = ["randomemote", "rem", "emote", "emotes"];
randomEmoteCommand.shortDescription =
  "Mostra um emote aleatório do canal atual";
randomEmoteCommand.cooldown = 5000;
randomEmoteCommand.cooldownType = "channel";
randomEmoteCommand.whisperable = false;
randomEmoteCommand.description = `Faça o bot escolher entre 1 e 50 emotes aleatórios do seu chat
Estes emotes são apenas do FFZ, BTTV e 7TV`;

randomEmoteCommand.examples = [
  {
    description: "Receber um emote aleatório do chat",
    input: "!randomemote",
    output: "🤖 PepeLaugh",
  },
  {
    description: "Receber vários emotes aleatórios do chat",
    input: "!randomemote 5",
    output: "🤖 PepeLaugh monkaS forsenCD Pog peepoHappy",
  },
];
randomEmoteCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  randomEmoteCommand,
};
