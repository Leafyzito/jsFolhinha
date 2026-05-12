const path = require("path");
const downloadCommand = async (message) => {
  if (message.args.length < 2) {
    return {
      reply: `Use o formato: ${message.prefix}download (opcional: video/audio) <link para fazer download>`,
    };
  }

  if (
    (message.args.length === 2 || message.args[1].toLowerCase() === "video") &&
    message.args[1].toLowerCase() !== "audio"
  ) {
    const urlToDownload = message.args[2] ? message.args[2] : message.args[1];
    if (urlToDownload === "video" || urlToDownload === "audio") {
      return {
        reply: `Use o formato: ${message.prefix}download video <link para fazer download>`,
      };
    }

    try {
      const downloadUrl = await fb.api.cobalt.downloadVideo(urlToDownload);
      if (!downloadUrl) {
        return {
          reply: `Não foi possível fazer o download, o serviço para esse site não está funcionando no momento. Tente novamente mais tarde`,
        };
      }
      return {
        reply: `💾 ${downloadUrl}`,
      };
    } catch (e) {
      console.error(`erro no getVideoDownload: ${e}`);
      try {
        const errorText = e.message;
        if ("connect to the service api" in errorText) {
          return {
            reply: `Não foi possível fazer o download, o serviço para esse site não está funcionando no momento. Tente novamente mais tarde`,
          };
        } else {
          return {
            reply: `Não foi possível fazer o download desse link`,
          };
        }
      } catch (e2) {
        console.error(`erro no try-catch do getVideoDownload: ${e2}`);
        return {
          reply: `Não foi possível fazer o download desse link`,
        };
      }
    }
  }

  if (message.args[1].toLowerCase() === "audio") {
    const urlToDownload = message.args[2];
    if (!urlToDownload) {
      return {
        reply: `Use o formato: ${message.prefix}download audio <link para fazer download>`,
      };
    }

    try {
      const downloadUrl = await fb.api.cobalt.downloadAudio(urlToDownload);
      if (!downloadUrl) {
        return {
          reply: `Não foi possível fazer o download, o serviço para esse site não está funcionando no momento. Tente novamente mais tarde`,
        };
      }
      return {
        reply: `💾 ${downloadUrl}`,
      };
    } catch (e) {
      console.error(`erro no getAudioDownload: ${e}`);
      return {
        reply: `Não foi possível fazer o download desse link`,
      };
    }
  }

  return {
    reply: `Use o formato: ${message.prefix}download (opcional: video/audio) <link para fazer download>`,
  };
};

downloadCommand.commandName = "download";
downloadCommand.aliases = ["download", "dl"];
downloadCommand.shortDescription = "Faz o download de algum vídeo/audio";
downloadCommand.cooldown = 5000;
downloadCommand.cooldownType = "channel";
downloadCommand.whisperable = true;
downloadCommand.description = `Faça o download de mídias através do bot

Pode também fazer download apenas do audio (mp3), utilizando o formato !download audio {link}

Sites mais famosos suportados: Youtube, Instagram, Facebook, Reddit, Tiktok, Twitter, clipes da Twitch
Para mais informações sobre a API utilizada, acesse https://github.com/imputnet/cobalt/tree/main/api#supported-services`;
downloadCommand.examples = [
  {
    description: "Fazer o download de um vídeo",
    input: "!download https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    output: "💾 https://f.feridinha.com/abcde.mp4",
  },
  {
    description: "Fazer o download apenas do áudio",
    input: "!download audio https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    output: "💾 https://f.feridinha.com/abcde.mp3",
  },
];
downloadCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  downloadCommand,
};
