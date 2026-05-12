const path = require("path");
const percentagemCommand = async () => {
  const randomPercentage = (Math.random() * 100).toFixed(2);

  return {
    reply: `${randomPercentage}%`,
  };
};

percentagemCommand.commandName = "%";
percentagemCommand.aliases = ["percentagem", "%"];
percentagemCommand.shortDescription = "Mostra uma percentagem aleatória";
percentagemCommand.cooldown = 5000;
percentagemCommand.cooldownType = "channel";
percentagemCommand.whisperable = true;
percentagemCommand.description = "Mostra uma percentagem aleatória";
percentagemCommand.examples = [
  {
    description: "Ver uma percentagem aleatória",
    input: "!%",
    output: "73.42%",
  },
];
percentagemCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  percentagemCommand,
};
