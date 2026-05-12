const fs = require("fs");
const path = require("path");

const Copypastas = fs.readFileSync(
  path.join(__dirname, "copypastas.txt"),
  "utf8"
);

const copypastaCommand = async (message) => {
  const totalCopys = Copypastas.split("\n").length - 1;
  const specificCopypastaIndex = message.args[1]
    ? parseInt(message.args[1])
    : null;
  let copypastaRes = specificCopypastaIndex
    ? Copypastas.split("\n")[specificCopypastaIndex - 1]
    : fb.utils.randomChoice(Copypastas.split("\n"));

  if (specificCopypastaIndex) {
    if (specificCopypastaIndex < 1 || specificCopypastaIndex > totalCopys) {
      copypastaRes = `Escolha um número entre 1 e ${totalCopys} para escolher uma copypasta específica`;
    }
  }

  // remove \n and \r from copypastaRes
  copypastaRes = copypastaRes.replace(/(\r\n|\n|\r)/gm, " ");
  const copyIndex = specificCopypastaIndex
    ? specificCopypastaIndex
    : Copypastas.split("\n").indexOf(copypastaRes) + 1;
  copypastaRes = `#${copyIndex}/${totalCopys} - ${copypastaRes}`;

  return {
    reply: copypastaRes,
  };
};

copypastaCommand.commandName = "copypasta";
copypastaCommand.aliases = ["copypasta", "copy"];
copypastaCommand.shortDescription = "Mostra uma copypasta aleatória";
copypastaCommand.cooldown = 5000;
copypastaCommand.cooldownType = "channel";
copypastaCommand.whisperable = true;
copypastaCommand.description = "Veja uma copypasta aleatória ou específica quando determinado um número da lista de copypastas";
copypastaCommand.examples = [
  {
    description: "Receber uma copypasta aleatória",
    input: "!copypasta",
    output: "#42/250 - <texto da copypasta aleatória>",
  },
  {
    description: "Receber uma copypasta específica",
    input: "!copypasta 4",
    output: "#4/250 - <texto da copypasta número 4>",
  },
];
copypastaCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/commands/${copypastaCommand.commandName}/${copypastaCommand.commandName}.js`;

module.exports = {
  copypastaCommand,
};
