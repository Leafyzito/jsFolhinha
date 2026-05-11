const FormData = require("form-data");

class FeridinhaApi {
  constructor() {
    this.baseUrl = "https://feridinha.com";
    this.apiKey = process.env.FERIDINHA_API_KEY;
  }

  // Upload an image file to Feridinha
  async uploadImage(imageData, filename = "image.jpg") {
    try {
      const form = new FormData();
      form.append("file", imageData, filename);

      const response = await fb.got(`${this.baseUrl}/upload`, {
        method: "POST",
        headers: {
          token: this.apiKey,
          ...form.getHeaders(),
        },
        body: form,
      });

      if (!response) {
        throw new Error("Feridinha API: Request failed");
      }

      const data = response;

      if (data.success) {
        return data.message;
      }

      console.warn(
        `Failed to upload image to Feridinha. Response: ${JSON.stringify(data)}`
      );
      return null;
    } catch (error) {
      console.error("Error uploading image to Feridinha:", error);
      return null;
    }
  }

  // Upload an audio file to Feridinha
  async uploadAudio(audioData, filename = "audio.mp3") {
    try {
      const form = new FormData();
      form.append("file", audioData, filename);

      const response = await fb.got(`${this.baseUrl}/upload`, {
        method: "POST",
        headers: {
          token: this.apiKey,
          ...form.getHeaders(),
        },
        body: form,
      });

      if (!response) {
        throw new Error("Feridinha API: Request failed");
      }

      const data = response;

      if (data.success) {
        return data.message;
      }

      console.warn(
        `Failed to upload audio to Feridinha. Response: ${JSON.stringify(data)}`
      );
      return null;
    } catch (error) {
      console.error("Error uploading audio to Feridinha:", error);
      return null;
    }
  }

  // Upload a video file to Feridinha
  async uploadVideo(videoData, filename = "video.mp4") {
    try {
      const form = new FormData();
      form.append("file", videoData, filename);

      const response = await fb.got(`${this.baseUrl}/upload`, {
        method: "POST",
        headers: {
          token: this.apiKey,
          ...form.getHeaders(),
        },
        body: form,
      });

      if (!response) {
        throw new Error("Feridinha API: Request failed");
      }

      const data = response;

      if (data.success) {
        return data.message;
      }

      console.warn(
        `Failed to upload video to Feridinha. Response: ${JSON.stringify(data)}`
      );
      return null;
    } catch (error) {
      console.error("Error uploading video to Feridinha:", error);
      return null;
    }
  }

  // Automatically detect file type and upload to appropriate method
  async uploadFile(fileData, filename) {
    const extension = filename.split(".").pop()?.toLowerCase();

    // Determine file type based on extension
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(extension)) {
      return this.uploadImage(fileData, filename);
    } else if (
      ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(extension)
    ) {
      return this.uploadAudio(fileData, filename);
    } else if (
      ["mp4", "avi", "mov", "wmv", "flv", "webm"].includes(extension)
    ) {
      return this.uploadVideo(fileData, filename);
    } else {
      // Default to image upload for unknown extensions
      console.warn(
        `Unknown file extension: ${extension}, defaulting to image upload`
      );
      return this.uploadImage(fileData, filename);
    }
  }

  // Download file from URL and upload to Feridinha
  async uploadFromUrl(url, filename = null) {
    try {
      const response = await fb.got(url);

      if (!response) {
        throw new Error("Failed to download file from URL: Request failed");
      }

      // Convert response to Buffer (fb.got returns Buffer for binary data)
      const fileData = Buffer.isBuffer(response)
        ? response
        : Buffer.from(response);

      if (!filename) {
        // Extract filename from URL
        const urlParts = url.split("/");
        filename = urlParts[urlParts.length - 1] || "file";
      }

      return await this.uploadFile(fileData, filename);
    } catch (error) {
      console.error("Error uploading from URL:", error);
      return null;
    }
  }
}

module.exports = FeridinhaApi;
