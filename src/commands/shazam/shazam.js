// something is causing the docker container to crash when built with node-shazam, idk what

// Shazam music recognition command
const { Shazam } = require("node-shazam");
const shazam = new Shazam();
const fs = require("fs");
const path = require("path");

const isDirectFileUrl = (url) => {
  const directFileExtensions = [
    ".mp4",
    ".mp3",
    ".wav",
    ".ogg",
    ".webm",
    ".m4a",
    ".aac",
  ];
  return directFileExtensions.some((ext) => url.toLowerCase().includes(ext));
};

async function makeClip(channelName) {
  try {
    const result = await fb.api.clipper.makeClip(channelName);
    return result;
  } catch (error) {
    console.log("Error making clip:", error);
    return null;
  }
}

async function shazamIt(url) {
  try {
    // If it's not a direct file URL, download and upload to feridinha first
    if (!isDirectFileUrl(url)) {
      console.log("URL is not a direct file URL, getting video download...");
      try {
        url = await fb.api.cobalt.downloadVideo(url);
        if (!url) {
          return "cobalt-error";
        }
      } catch (e) {
        console.log(`erro no getVideoDownload: ${e}`);
        return "cobalt-error";
      }
    }

    console.log(`Downloading audio content from ${url}...`);
    // Download the audio content
    const response = await fb.got(url);
    if (!response) {
      throw new Error("Failed to download audio content");
    }

    console.log("Audio content downloaded, saving to buffer...");
    // Save the buffer to a temporary file
    const tempFile = path.join(__dirname, `temp_audio_${Date.now()}.mp3`);
    fs.writeFileSync(tempFile, response);

    console.log(tempFile);
    console.log("Using Shazam to recognize audio...");
    // Use the file path with Shazam
    const recognition = await shazam.recognise(tempFile, "en-US");

    // Clean up the temporary file
    fs.unlinkSync(tempFile);

    return recognition;
  } catch (error) {
    console.error("Error in shazamIt:", error);
    return null;
  }
}

const shazamCommand = async (message) => {
  if (message.args.length < 2) {
    return {
      reply: `Use o formato: ${message.prefix}shazam <link>. Se estiver com dúvidas sobre o comando, acesse https://folhinhabot.com/comandos/shazam 😁`,
    };
  }

  let urlToShazam = message.args[1];

  // Validate if it's a URL
  const urlPattern =
    /^(https?:\/\/)?(www\.)?([\da-z.-]+)\.([a-z.]{2,})([/\w .-?=&]*)*\/?$/;
  if (!urlPattern.test(urlToShazam)) {
    return {
      reply: `Por favor, forneça um link válido. Use o formato: ${message.prefix}shazam <link>. Se estiver com dúvidas sobre o comando, acesse https://folhinhabot.com/comandos/shazam 😁`,
    };
  }

  // Check if it's a Twitch channel URL or a clip URL
  const twitchChannelMatch = urlToShazam.match(/twitch\.tv\/([^/?]+)(?:\?|$)/);
  const twitchClipMatch = urlToShazam.match(/twitch\.tv\/[^/]+\/clip\//);

  if (twitchChannelMatch && !twitchClipMatch) {
    const channelName = twitchChannelMatch[1];
    console.log(`Detected Twitch channel: ${channelName}, creating clip...`);

    // Create clip
    const clip = await makeClip(channelName);
    if (!clip) {
      console.log(`Não deu pra criar clip com o makeClip`);
      return {
        reply: `Não consegui criar um clip para identificar a música, tente novamente. Se o problema persistir, avise o dev`,
      };
    }
    urlToShazam = clip.makeClipUrl;
  }

  const result = await shazamIt(urlToShazam);
  if (!result) {
    return {
      reply: `Não consegui identificar a música desse link`,
    };
  }

  if (result === "cobalt-error") {
    return {
      reply: `Erro ao processar o vídeo. Tente novamente mais tarde.`,
    };
  }

  if (result.track) {
    const track = result.track;
    return {
      reply: `🎵 Música identificada: ${track.title} - ${track.subtitle} (${track.url})`,
    };
  }

  return {
    reply: `Não consegui identificar a música desse link`,
  };
};

shazamCommand.commandName = "shazam";
shazamCommand.aliases = ["shazam"];
shazamCommand.shortDescription = "Identifica músicas através do Shazam";
shazamCommand.cooldown = 10_000;
shazamCommand.cooldownType = "channel";
shazamCommand.whisperable = true;
shazamCommand.description = `Este comando pode estar um pouco instável. Qualquer problema, por favor avise o dev

Identifica músicas de algum link fornecido ou de uma live da Twitch:
• Exemplo: !shazam https://x.com/billieeilishtrs/status/1839682299673096667 - O bot vai fazer o download do vídeo e depois identificar a música

• Exemplo: !shazam https://f.feridinha.com/okjxM.mp4 - O bot vai identificar a música do vídeo fornecido
• Exemplo: !shazam www.twitch.tv/xql - O bot vai criar um clip e depois identificar a música do clip`;
shazamCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  shazamCommand,
};
