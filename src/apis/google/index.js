const { GoogleGenAI } = require("@google/genai");

// clients tried in order, falling back to the next one if a request fails
// gtx is the most abused one so it gets rate limited first, leave it last
const TRANSLATE_CLIENTS = ["dict-chrome-ex", "it", "at", "gtx"];

const GEMINI_MODEL = "gemini-2.5-flash";

class GoogleApi {
  constructor() {
    this.translateUrl = "https://translate.googleapis.com/translate_a/single";
    this.customSearchUrl = "https://www.googleapis.com/customsearch/v1";
    this.youtubeUrl = "https://www.googleapis.com/youtube/v3";
    this.gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async translate(targetLanguage, text) {
    for (const client of TRANSLATE_CLIENTS) {
      const params = new URLSearchParams({
        client,
        dt: "t",
        ie: "UTF-8",
        oe: "UTF-8",
        sl: "auto",
        tl: targetLanguage,
        q: text,
      });

      const data = await fb.got(`${this.translateUrl}?${params}`, {
        timeout: 4000,
        followRedirect: false,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      });

      const parsed = this.parseTranslation(data);
      if (parsed) {
        return parsed;
      }

      console.warn(`google translate client ${client} failed, trying next`);
    }

    return null;
  }

  parseTranslation(data) {
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return null;
    }

    const segments = data[0];
    if (segments.some((s) => !Array.isArray(s) || typeof s[0] !== "string")) {
      return null;
    }

    return {
      translatedText: segments.map((s) => s[0]).join(""),
      fromLanguage: data[2],
      toLanguage: data[3],
      confidence: Math.round((data[6] ?? 1) * 100),
    };
  }

  // returns a list of image links, or null on failure
  async searchImages(query, start = 1) {
    const params = new URLSearchParams({
      key: process.env.GOOGLE_SEARCH_API_KEY,
      cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
      q: query,
      searchType: "image",
      start: start.toString(),
    });

    const data = await fb.got(`${this.customSearchUrl}?${params}`);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      return null;
    }

    return data.items.map((item) => item.link);
  }

  // returns the first matching video as { id, title }, or null if none
  async searchYoutubeVideo(query) {
    const params = new URLSearchParams({
      key: process.env.GOOGLE_YOUTUBE_SEARCH_API_KEY,
      q: query,
      type: "video",
      part: "snippet",
      maxResults: 5,
      sort: "relevance",
    });

    const data = await fb.got(`${this.youtubeUrl}/search?${params}`);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    return { id: item.id.videoId, title: item.snippet.title };
  }

  // returns the raw youtube video resource, or null if not found
  async getYoutubeVideo(videoId) {
    const params = new URLSearchParams({
      key: process.env.GOOGLE_YOUTUBE_SEARCH_API_KEY,
      id: videoId,
      part: "snippet,statistics,contentDetails",
    });

    const data = await fb.got(`${this.youtubeUrl}/videos?${params}`);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      return null;
    }

    return data.items[0];
  }

  async generateContent(systemInstruction, userContent) {
    const response = await this.gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: userContent,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
      },
    });

    const text = response?.text;
    if (text == null || text === "") {
      throw new Error("Empty or blocked response from Gemini");
    }
    return text;
  }
}

module.exports = GoogleApi;
