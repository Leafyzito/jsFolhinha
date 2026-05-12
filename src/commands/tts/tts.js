const path = require("path");
async function getTts(voice, text) {
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(
    text
  )}`;

  try {
    const response = await fb.got(url);
    if (!response) {
      return null;
    }

    // Upload the audio to feridinha
    const feridinhaUrl = await fb.api.feridinha.uploadAudio(
      response,
      "tts.mp3"
    );
    return feridinhaUrl;
  } catch (error) {
    console.error("Error in TTS:", error);
    return null;
  }
}

const ttsCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}tts <texto>`,
    };
  }

  let args = message.args.slice(1);
  let voice = "Ricardo";
  args = args.filter((arg) => {
    const argLower = arg.toLowerCase();
    if (argLower.startsWith("voice:") || argLower.startsWith("voz:")) {
      voice = argLower.split(":")[1];
      return false;
    }
    return true;
  });

  const msgContent = args.join(" ");

  if (!voice || !msgContent) {
    return {
      reply: `Use o formato: ${message.prefix}tts voice:Brian <texto>`,
    };
  }

  const tts = await getTts(
    voice.charAt(0).toUpperCase() + voice.slice(1),
    msgContent
  );
  if (!tts) {
    return {
      reply: `Erro ao gerar TTS`,
      notes: `TTS generation failed for voice: ${voice}, text: ${msgContent}`,
    };
  }

  return {
    reply: `🤖 ${tts}`,
  };
};

ttsCommand.commandName = "text-to-speech";
ttsCommand.aliases = ["tts", "text-to-speech"];
ttsCommand.shortDescription = "Crie um TTS com algum texto";
ttsCommand.cooldown = 5000;
ttsCommand.cooldownType = "channel";
ttsCommand.whisperable = true;
ttsCommand.description = `Dê voz ao Folhinha e faça-o falar uma mensagem a sua escolha

Poderá alterar a voz da mensagem através do nome da voz.

Acesse a lista de vozes disponíveis aqui: https://github.com/chrisjp/tts/blob/master/assets/js/voices.json
Um dia irá ter uma página bonitinha com as possíveis vozes`;
ttsCommand.examples = [
  {
    description: "Criar um TTS com a voz padrão (Ricardo)",
    input: "!tts No jardim da vida, Floresce a esperança",
    output: "🤖 https://f.feridinha.com/lkTCL.mp3",
  },
  {
    description: "Criar um TTS com uma voz específica",
    input: "!tts voz:Brian No jardim da vida, Floresce a esperança",
    output: "🤖 https://f.feridinha.com/j4nLL.mp3",
  },
];
ttsCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  ttsCommand,
};
