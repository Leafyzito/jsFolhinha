const path = require("path");
const fs = require("fs");

class TwitchClipperAPI {
  constructor() {
    this.baseUrl = "http://twitchclipper:8989";
  }

  async makeClip(channelName) {
    try {
      const res = await fb.got(`${this.baseUrl}/clip/${channelName}`);

      if (res === null) {
        fb.discord.logError(`Twitch Clipper API returned null`);
        return null;
      }

      const clipsFolder = path.join(process.cwd(), "apps/twitchClipper/clips");
      const clipPath = path.join(clipsFolder, res.path.replace(/^\//, ""));

      // upload clip to feridinha
      const clipName = path.basename(clipPath);
      const clipContent = fs.readFileSync(clipPath);
      const clipUrl = await fb.api.feridinha.uploadFile(clipContent, clipName);

      return { makeClipUrl: clipUrl };
    } catch (error) {
      fb.discord.logError(`Error in makeClip: ${error.message}`);
      return null;
    }
  }

  async makePreview(channelName) {
    try {
      const res = await fb.got(`${this.baseUrl}/preview/${channelName}`);

      if (res === null) {
        // fb.discord.logError(`Twitch Clipper API returned null for preview`);
        return null;
      }

      const previewsFolder = path.join(
        process.cwd(),
        "apps/twitchClipper/previews"
      );
      const previewPath = path.join(
        previewsFolder,
        res.path.replace(/^\//, "")
      );

      // upload preview to feridinha
      const previewName = path.basename(previewPath);
      const previewContent = fs.readFileSync(previewPath);
      const previewUrl = await fb.api.feridinha.uploadFile(
        previewContent,
        previewName
      );

      return { makePreviewUrl: previewUrl };
    } catch (error) {
      fb.discord.logError(`Error in makePreview: ${error.message}`);
      return null;
    }
  }
}

module.exports = TwitchClipperAPI;
