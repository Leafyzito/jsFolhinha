const coinflipCommand = async (message) => {
  const standingCoin = fb.utils.randomInt(0, 1000); // 0.1% chance of standing coin

  if (standingCoin === 0) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      fb.emotes.pogEmotes,
      "PogChamp"
    );
    return {
      reply: `A moeda ficou em pé (0.1% de chance de acontecer) ${emote}`,
    };
  }

  const coin = fb.utils.randomInt(0, 1);
  if (coin === 0) {
    return {
      reply: "🪙 Cara (sim)",
    };
  }
  return {
    reply: "🪙 Coroa (não)",
  };
};

coinflipCommand.commandName = "coinflip";
coinflipCommand.aliases = ["coinflip", "cf"];
coinflipCommand.shortDescription = "Lance uma moeda ao ar";
coinflipCommand.cooldown = 5000;
coinflipCommand.cooldownType = "channel";
coinflipCommand.whisperable = true;
coinflipCommand.description = "Lance uma moeda ao ar e deixe que ela escolha o destino (cara ou coroa)";
coinflipCommand.examples = [
  {
    description: "Lançar a moeda com o comando principal",
    input: "!coinflip",
    output: "🪙 Cara (sim)",
  },
  {
    description: "Usar o alias curto do comando",
    input: "!cf",
    output: "🪙 Coroa (não)",
  }
];
coinflipCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/commands/${coinflipCommand.commandName}/${coinflipCommand.commandName}.js`;

module.exports = {
  coinflipCommand,
};
