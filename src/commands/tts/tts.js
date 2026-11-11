const path = require("path");
async function getTts(voice, text) {
  const audio = await fb.api.edgetts.synthesize(text, voice);
  if (!audio) {
    return null;
  }

  // Upload the audio to feridinha
  return fb.api.feridinha.uploadAudio(audio, "tts.mp3");
}

const ttsCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}tts <texto>`,
    };
  }

  let args = message.args.slice(1);
  let voiceArg = null;
  args = args.filter((arg) => {
    const argLower = arg.toLowerCase();
    if (argLower.startsWith("voice:") || argLower.startsWith("voz:")) {
      voiceArg = arg.split(":")[1];
      return false;
    }
    return true;
  });

  const msgContent = args.join(" ");

  if (voiceArg === "" || !msgContent) {
    return {
      reply: `Use o formato: ${message.prefix}tts voz:Francisca <texto>`,
    };
  }

  const voice = await fb.api.edgetts.resolveVoice(voiceArg);
  if (!voice) {
    return {
      reply: `Voz "${voiceArg}" não encontrada. Em português: Antonio, Francisca e Thalita. Para mais vozes use ${message.prefix}help tts`,
    };
  }

  const tts = await getTts(voice, msgContent);
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
• Exemplo: !tts No jardim da vida, Floresce a esperança, Entre espinhos e espinhas, A felicidade dança.

Poderá alterar a voz da mensagem através do nome da voz.
• Exemplo: !tts No jardim da vida, Floresce a esperança, Entre espinhos e espinhas, A felicidade dança. voz:Francisca

Vozes em português: Antonio (padrão), Francisca, Thalita, Duarte (PT) e Raquel (PT)
Vozes noutras línguas também funcionam, pelo nome (voz:Andrew) ou nome completo (voz:en-GB-RyanNeural). Acesse a lista aqui: https://learn.microsoft.com/azure/ai-services/speech-service/language-support?tabs=tts`;
ttsCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  ttsCommand,
};
