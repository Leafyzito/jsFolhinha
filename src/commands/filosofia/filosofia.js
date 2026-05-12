const fs = require("fs");
const path = require("path");

const filosofiasFilePath = path.join(__dirname, "filosofias.txt");
const Filosofias = fs.readFileSync(filosofiasFilePath, "utf8");

const filosofiaCommand = async (message) => {
  const totalFilosofias = Filosofias.split("\n").length - 1;
  const specificFilosofiaIndex = message.args[1]
    ? parseInt(message.args[1])
    : null;

  let filosofiaRes = specificFilosofiaIndex
    ? Filosofias.split("\n")[specificFilosofiaIndex - 1]
    : fb.utils.randomChoice(Filosofias.split("\n"));

  if (specificFilosofiaIndex) {
    if (
      specificFilosofiaIndex < 1 ||
      specificFilosofiaIndex > totalFilosofias
    ) {
      filosofiaRes = `Escolha um número entre 1 e ${totalFilosofias} para escolher uma filosofia específica`;
    }
  }

  // remove \n and \r from filosofiaRes
  filosofiaRes = filosofiaRes.replace(/(\r\n|\n|\r)/gm, " ");
  const filosofiaIndex = specificFilosofiaIndex
    ? specificFilosofiaIndex
    : Filosofias.split("\n").indexOf(filosofiaRes) + 1;

  filosofiaRes = `#${filosofiaIndex}/${totalFilosofias} - ${filosofiaRes}`;

  return {
    reply: filosofiaRes,
  };
};

filosofiaCommand.commandName = "filosofia";
filosofiaCommand.aliases = ["filosofia", "filosofias"];
filosofiaCommand.shortDescription = "Mostra uma filosofia aleatória";
filosofiaCommand.cooldown = 5000;
filosofiaCommand.cooldownType = "channel";
filosofiaCommand.whisperable = true;
filosofiaCommand.description = "Veja uma filosofia aleatória ou específica quando determinado um número da lista de filosofias";
filosofiaCommand.examples = [
  {
    description: "Receber uma filosofia aleatória",
    input: "!filosofia",
    output: "#23/200 - <texto da filosofia aleatória>",
  },
  {
    description: "Receber uma filosofia específica",
    input: "!filosofia 4",
    output: "#4/200 - <texto da filosofia número 4>",
  },
];
filosofiaCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  filosofiaCommand,
};
