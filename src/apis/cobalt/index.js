class CobaltApi {
  constructor() {
    this.baseUrl = "http://cobalt:9000/";
    this.headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "ApiKey " + process.env.COBALT_API_KEY,
    };
  }

  async downloadVideo(url) {
    try {
      const payload = { url };
      const response = await fb.got(this.baseUrl, {
        method: "POST",
        headers: this.headers,
        json: payload,
      });

      if (!response) {
        fb.discord.logError(`Cobalt API returned null for video download`);
        return null;
      }

      const resData = response;
      const resUrl = resData.url;

      // Download the video content
      const videoResponse = await fb.got(resUrl);
      if (!videoResponse) {
        return null;
      }

      // Upload to feridinha
      const fileName = `video_${Date.now()}.mp4`;
      const feridinhaUrl = await fb.api.feridinha.uploadVideo(
        videoResponse,
        fileName
      );

      if (!feridinhaUrl) {
        console.warn(
          "Failed to upload to feridinha, falling back to original URL"
        );
        return resUrl;
      }

      return feridinhaUrl;
    } catch (error) {
      fb.discord.logError(`Error in downloadVideo: ${error.message}`);
      return null;
    }
  }

  async downloadAudio(url) {
    try {
      const payload = {
        url,
        downloadMode: "audio",
      };
      const response = await fb.got(this.baseUrl, {
        method: "POST",
        headers: this.headers,
        json: payload,
      });

      if (!response) {
        fb.discord.logError(`Cobalt API returned null for audio download`);
        return null;
      }

      const resData = response;
      const resUrl = resData.url;

      // Download the audio content
      const audioResponse = await fb.got(resUrl);
      if (!audioResponse) {
        return null;
      }

      // Upload to feridinha
      const fileName = `audio_${Date.now()}.mp3`;
      const feridinhaUrl = await fb.api.feridinha.uploadAudio(
        audioResponse,
        fileName
      );

      if (!feridinhaUrl) {
        console.warn(
          "Failed to upload to feridinha, falling back to original URL"
        );
        return resUrl;
      }

      return feridinhaUrl;
    } catch (error) {
      fb.discord.logError(`Error in downloadAudio: ${error.message}`);
      return null;
    }
  }

  async downloadMedia(url, type = "video") {
    if (type === "audio") {
      return this.downloadAudio(url);
    }
    return this.downloadVideo(url);
  }
}

module.exports = CobaltApi;
