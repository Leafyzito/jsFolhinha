const path = require("path");
async function getOfflineImage(previewTarget) {
  try {
    const userData = await fb.api.helix.getUserByUsername(previewTarget);

    if (
      !userData ||
      !userData.offlineImageUrl ||
      userData.offlineImageUrl === ""
    ) {
      return null;
    }

    return await fb.api.feridinha.uploadFromUrl(userData.offlineImageUrl);
  } catch (error) {
    console.error("Error getting offline image:", error);
    return null;
  }
}

async function getPreview(previewTarget) {
  // First try to use the clipper API's makePreview
  try {
    const result = await fb.api.clipper.makePreview(previewTarget);
    if (result && result.makePreviewUrl) {
      return { isLive: true, image: result.makePreviewUrl };
    }
  } catch (error) {
    console.error("Error making preview with clipper API:", error);
  }

  // If clipper API fails, fall back to Helix API
  const data = await fb.api.helix.getStream(previewTarget);

  if (!data) {
    // if offline, return the offline image
    const offlineImage = await getOfflineImage(previewTarget);
    return { isLive: false, image: offlineImage };
  }

  if (!data.id) {
    // if offline, return the offline image
    const offlineImage = await getOfflineImage(previewTarget);
    return { isLive: false, image: offlineImage };
  }

  // Use Helix API thumbnail as fallback
  try {
    const thumbPreviewRaw = data.thumbnail_url;
    const thumbPreview = thumbPreviewRaw.replace("{width}x{height}", "0x0");
    const thumbPreviewUrl = await fb.api.feridinha.uploadFromUrl(
      thumbPreview,
      "preview.jpg"
    );

    return { isLive: true, image: thumbPreviewUrl };
  } catch (error) {
    console.error("Error getting thumbnail preview:", error);
    return { isLive: true, image: null };
  }
}

const previewCommand = async (message) => {
  const previewTarget =
    message.args[1]?.replace(/^@/, "") || message.channelName;

  const targetId = await fb.api.helix.getUserByUsername(previewTarget);
  if (!targetId) {
    return {
      reply: `Esse canal não existe`,
    };
  }

  const preview = await getPreview(previewTarget);

  if (!preview.isLive && preview.image === null) {
    return {
      reply: `O canal ${previewTarget} não está em live`,
    };
  }

  if (!preview.isLive && preview.image !== null) {
    return {
      reply: `O canal ${previewTarget} não está em live, aqui está a tela offline: ${preview.image}`,
    };
  }

  if (preview.isLive) {
    return {
      reply: `Preview da live de ${previewTarget}: ${preview.image}`,
    };
  }
};

previewCommand.commandName = "preview";
previewCommand.aliases = ["preview", "prev", "thumb", "thumbnail"];
previewCommand.shortDescription =
  "Mostra uma imagem do momento atual de uma live";
previewCommand.cooldown = 5000;
previewCommand.cooldownType = "channel";
previewCommand.whisperable = false;
previewCommand.description = "Exibe uma imagem do momento atual da live do canal fornecido ou a tela offline caso não esteja em live";
previewCommand.examples = [
  {
    description: "Ver o preview da live de outro canal",
    input: "!preview omeiaum",
    output: "Preview da live de omeiaum: https://f.feridinha.com/preview.jpg",
  },
];
previewCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  previewCommand,
};
