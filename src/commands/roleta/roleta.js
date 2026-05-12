const path = require("path");
const Frases = [
  "Foi de arrasta pra cima",
  "Foi de base",
  "Foi de comes e bebes",
  "Foi dessa pra melhor",
  "Bateu as botas",
  "Virou lenda",
  "Foi de F",
  "Caiu no Alt+F4",
  "Chapuletou",
  "Foi jogar no Vasco",
  "Foi pro modo espectador",
  "Foi de americanas",
  "Foi de berço",
];

const roletaCommand = async (message) => {
  if (message.isStreamer) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      fb.emotes.sadEmotes,
      ":("
    );

    return {
      reply: `Você é o streamer, então não consegue jogar a roleta russa ${emote}`,
    };
  }

  if (message.isMod) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      fb.emotes.sadEmotes,
      ":("
    );

    return {
      reply: `Você é mod, então não consegue jogar a roleta russa ${emote}`,
    };
  }

  // Parse timeout duration from command arguments
  let timeoutDuration = message.args[1] || 10;

  // Validate timeout duration
  if (isNaN(timeoutDuration)) {
    timeoutDuration = 10;
  }
  if (parseInt(timeoutDuration) < 1) {
    timeoutDuration = 1;
  }
  if (parseInt(timeoutDuration) > 20160) {
    timeoutDuration = 20160;
  }
  timeoutDuration = parseInt(timeoutDuration) * 60; // Convert to minutes (ex: input 10 -> 10 minutos)

  const randomChance = fb.utils.randomInt(1, 6);
  if (randomChance !== 1) {
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["saved"],
      "monkaS"
    );
    return {
      reply: `Click! Não foi dessa vez ${emote}`,
    };
  }

  // Apply timeout using Helix API
  const timeout = await fb.api.helix.timeoutUser(
    message.channelID,
    message.senderUserID,
    timeoutDuration,
    "foi de roleta russa"
  );

  if (!timeout) {
    return {
      reply: `Eu não tenho mod, não vai não :(`,
    };
  }

  const randomPhrase = fb.utils.randomChoice(Frases);
  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["ripbozo", "o7"],
    ":tf:"
  );

  return {
    reply: `BANG! ${randomPhrase} ${emote}`,
    replyType: "say",
  };
};

roletaCommand.commandName = "roleta-russa";
roletaCommand.aliases = ["roleta-russa", "roleta", "rr"];
roletaCommand.shortDescription =
  "Teste a sua sorte com a roleta-russa do timeout";
roletaCommand.cooldown = 15_000;
roletaCommand.cooldownType = "channel";
roletaCommand.whisperable = false;
roletaCommand.description = `Teste a sua sorte (1 em 6) para uma chance de levar um timeout no chat
O tempo do timeout pode ser customizado, sendo o tempo padrão 10 minutos

Para este comando funcione corretamente, o Folhinha precisa do cargo de moderador`;
roletaCommand.examples = [
  {
    description: "Jogar a roleta russa com o timeout padrão (10 minutos)",
    input: "!roleta",
    output: "Click! Não foi dessa vez saved",
  },
  {
    description: "Jogar a roleta russa com um timeout customizado",
    input: "!roleta 2",
    output: "BANG! Foi de F ripbozo",
  },
];
roletaCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  roletaCommand,
};
