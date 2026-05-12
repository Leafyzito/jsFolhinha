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
    console.error("Error making clip:", error);
    return null;
  }
}

/** Returns clip URL for Shazam, or null if clip creation failed. */
async function resolveTwitchLiveClipUrl(channelLogin) {
  console.debug(`Detected Twitch channel: ${channelLogin}, creating clip...`);
  const clip = await makeClip(channelLogin);
  if (!clip || !clip.makeClipUrl) {
    console.debug(`Não deu pra criar clip com o makeClip`);
    return null;
  }
  return clip.makeClipUrl;
}

async function shazamIt(url) {
  try {
    // If it's not a direct file URL, download and upload to feridinha first
    if (!isDirectFileUrl(url)) {
      console.debug("URL is not a direct file URL, getting video download...");
      try {
        url = await fb.api.cobalt.downloadVideo(url);
        if (!url) {
          return "cobalt-error";
        }
      } catch (e) {
        console.error(`erro no getVideoDownload: ${e}`);
        return "cobalt-error";
      }
    }

    console.debug(`Downloading audio content from ${url}...`);
    // Download the audio content
    const response = await fb.got(url);
    if (!response) {
      throw new Error("Failed to download audio content");
    }

    console.debug("Audio content downloaded, saving to buffer...");
    // Save the buffer to a temporary file
    const tempFile = path.join(__dirname, `temp_audio_${Date.now()}.mp3`);
    fs.writeFileSync(tempFile, response);

    console.debug(tempFile);
    console.debug("Using Shazam to recognize audio...");
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

const clipCreationFailedReply = {
  reply: `Não consegui criar um clip para identificar a música, tente novamente. Se o problema persistir, avise o dev`,
};

const shazamCommand = async (message) => {
  if (message.args.length < 2) {
    return {
      reply: `Use o formato: ${message.prefix}shazam <link ou usuário da Twitch>. Se estiver com dúvidas sobre o comando, acesse https://folhinhabot.com/comandos/shazam 😁`,
    };
  }

  const rawInput = message.args[1];

  const urlPattern =
    /^(https?:\/\/)?(www\.)?([\da-z.-]+)\.([a-z.]{2,})([/\w .-?=&]*)*\/?$/;

  let urlToShazam;

  if (urlPattern.test(rawInput)) {
    urlToShazam = rawInput;

    const twitchChannelMatch = rawInput.match(/twitch\.tv\/([^/?]+)(?:\?|$)/);
    const twitchClipMatch = rawInput.match(/twitch\.tv\/[^/]+\/clip\//);

    if (twitchChannelMatch && !twitchClipMatch) {
      const channelName = twitchChannelMatch[1];
      const clipUrl = await resolveTwitchLiveClipUrl(channelName);
      if (!clipUrl) {
        return clipCreationFailedReply;
      }
      urlToShazam = clipUrl;
    }
  } else {
    const candidate = rawInput.replace(/^@/, "").trim();
    if (!candidate) {
      return {
        reply: `Por favor, forneça um link ou um usuário da Twitch. Use o formato: ${message.prefix}shazam <link ou usuário>. Se estiver com dúvidas sobre o comando, acesse https://folhinhabot.com/comandos/shazam 😁`,
      };
    }

    const user = await fb.api.helix.getUserByUsername(candidate);
    if (!user) {
      return {
        reply: `Não encontrei esse usuário`,
      };
    }

    const stream = await fb.api.helix.getStream(user.login);
    if (!stream) {
      return {
        reply: `O canal ${user.displayName || user.login} não está em live`,
      };
    }

    const clipUrl = await resolveTwitchLiveClipUrl(user.login);
    if (!clipUrl) {
      return clipCreationFailedReply;
    }
    urlToShazam = clipUrl;
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
      reply: `🎵 Música identificada: ${track.title} - ${track.subtitle} ● ${track.url}`,
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

Identifica músicas de algum link fornecido ou de uma live da Twitch:`;
shazamCommand.examples = [
  {
    description: "Identificar a música a partir de um link de vídeo",
    input: "!shazam https://f.feridinha.com/okjxM.mp4",
    output: "🎵 Música identificada: bad guy - Billie Eilish ● https://www.shazam.com/track/...",
  },
  {
    description: "Identificar a música a partir de um link da Twitch",
    input: "!shazam https://www.twitch.tv/xqc",
    output: "🎵 Música identificada: Lose Yourself - Eminem ● https://www.shazam.com/track/...",
  },
  {
    description: "Identificar a música do canal de uma live",
    input: "!shazam xqc",
    output: "🎵 Música identificada: bad guy - Billie Eilish ● https://www.shazam.com/track/...",
  },
];
shazamCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  shazamCommand,
};
