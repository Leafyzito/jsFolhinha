const fs = require("fs");
const path = require("path");

const Curiosidades = fs.readFileSync(
  path.join(__dirname, "curiosidades.txt"),
  "utf8"
);

const curiosidadeCommand = async (message) => {
  const totalCuriosidades = Curiosidades.split("\n").length - 1;
  const specificCuriosidadeIndex = message.args[1]
    ? parseInt(message.args[1])
    : null;

  let curiosidadeRes = specificCuriosidadeIndex
    ? Curiosidades.split("\n")[specificCuriosidadeIndex - 1]
    : fb.utils.randomChoice(Curiosidades.split("\n"));

  if (specificCuriosidadeIndex) {
    if (
      specificCuriosidadeIndex < 1 ||
      specificCuriosidadeIndex > totalCuriosidades
    ) {
      curiosidadeRes = `Escolha um número entre 1 e ${totalCuriosidades} para escolher uma curiosidade específica`;
    }
  }

  // remove \n and \r from curiosidadeRes
  curiosidadeRes = curiosidadeRes.replace(/(\r\n|\n|\r)/gm, " ");
  const curiosidadeIndex = specificCuriosidadeIndex
    ? specificCuriosidadeIndex
    : Curiosidades.split("\n").indexOf(curiosidadeRes) + 1;

  curiosidadeRes = `#${curiosidadeIndex}/${totalCuriosidades} - ${curiosidadeRes}`;

  return {
    reply: curiosidadeRes,
  };
};

curiosidadeCommand.commandName = "curiosidade";
curiosidadeCommand.aliases = ["curiosidade", "curiosidades"];
curiosidadeCommand.shortDescription = "Mostra uma curiosidade aleatória";
curiosidadeCommand.cooldown = 5000;
curiosidadeCommand.cooldownType = "channel";
curiosidadeCommand.whisperable = true;
curiosidadeCommand.description = "Veja uma curiosidade aleatória ou específica quando determinado um número da lista de curiosidades";
curiosidadeCommand.examples = [
  {
    description: "Receber uma curiosidade aleatória",
    input: "!curiosidade",
    output: "#17/300 - <texto da curiosidade aleatória>",
  },
  {
    description: "Receber uma curiosidade específica",
    input: "!curiosidade 4",
    output: "#4/300 - <texto da curiosidade número 4>",
  },
];
curiosidadeCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  curiosidadeCommand,
};
