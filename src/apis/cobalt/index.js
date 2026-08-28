class CobaltApi {
  constructor() {
    this.baseUrl = "http://cobalt:9000/";
    this.headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "ApiKey " + process.env.COBALT_API_KEY,
    };
  }

  toMediaBuffer(data) {
    if (Buffer.isBuffer(data) && data.length > 0) {
      return data;
    }
    return null;
  }

  async fetchCobaltMedia(url, { downloadMode } = {}) {
    const payload = { url };
    if (downloadMode) {
      payload.downloadMode = downloadMode;
    }

    const response = await fb.got(this.baseUrl, {
      method: "POST",
      headers: this.headers,
      json: payload,
    });

    if (!response?.url) {
      return null;
    }

    const mediaResponse = await fb.got(response.url);
    return this.toMediaBuffer(mediaResponse);
  }

  async downloadVideo(url) {
    try {
      const videoResponse = await this.fetchCobaltMedia(url);
      if (!videoResponse) {
        fb.discord.logError(`Cobalt API returned no video content`);
        return null;
      }

      const fileName = `video_${Date.now()}.mp4`;
      const feridinhaUrl = await fb.api.feridinha.uploadVideo(
        videoResponse,
        fileName
      );

      if (!feridinhaUrl) {
        fb.discord.logError(`Failed to upload video to feridinha`);
        return null;
      }

      return feridinhaUrl;
    } catch (error) {
      fb.discord.logError(`Error in downloadVideo: ${error.message}`);
      return null;
    }
  }

  async downloadAudio(url) {
    try {
      const audioResponse = await this.fetchCobaltMedia(url, {
        downloadMode: "audio",
      });
      if (!audioResponse) {
        fb.discord.logError(`Cobalt API returned no audio content`);
        return null;
      }

      const fileName = `audio_${Date.now()}.mp3`;
      const feridinhaUrl = await fb.api.feridinha.uploadAudio(
        audioResponse,
        fileName
      );

      if (!feridinhaUrl) {
        fb.discord.logError(`Failed to upload audio to feridinha`);
        return null;
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
