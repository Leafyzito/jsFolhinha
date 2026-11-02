// clients tried in order, falling back to the next one if a request fails
// gtx is the most abused one so it gets rate limited first, leave it last
const TRANSLATE_CLIENTS = ["dict-chrome-ex", "it", "at", "gtx"];

class GoogleApi {
  constructor() {
    this.translateUrl = "https://translate.googleapis.com/translate_a/single";
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
}

module.exports = GoogleApi;
