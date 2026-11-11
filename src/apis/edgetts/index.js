const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

const VOICES_TTL = 24 * 60 * 60 * 1000; // 24 hours

// free voices from edge's "read aloud", no key needed
class EdgeTtsApi {
  constructor() {
    this.defaultVoice = "pt-BR-AntonioNeural";
    this.voices = null;
    this.voicesFetchedAt = 0;
  }

  async getVoices() {
    if (this.voices && Date.now() - this.voicesFetchedAt < VOICES_TTL) {
      return this.voices;
    }

    try {
      this.voices = await new MsEdgeTTS().getVoices();
      this.voicesFetchedAt = Date.now();
    } catch (error) {
      console.error("Error fetching Edge TTS voices:", error.message);
    }
    return this.voices;
  }

  // accepts the full name (pt-BR-AntonioNeural) or just the short one (Antonio),
  // short names shared between locales prefer pt-BR
  async resolveVoice(name) {
    if (!name) {
      return this.defaultVoice;
    }

    const voices = await this.getVoices();
    if (!voices) {
      return null;
    }

    const wanted = name.toLowerCase();
    const shortName = (voice) =>
      voice.ShortName.split("-")
        .slice(2)
        .join("-")
        .replace(/(Multilingual)?Neural$/, "")
        .toLowerCase();

    const exact = voices.find((v) => v.ShortName.toLowerCase() === wanted);
    if (exact) {
      return exact.ShortName;
    }

    const matches = voices.filter((v) => shortName(v) === wanted);
    const match = matches.find((v) => v.Locale === "pt-BR") || matches[0];
    return match?.ShortName || null;
  }

  async synthesize(text, voice = this.defaultVoice) {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    // one client per request, setMetadata on a shared one would race between channels
    const tts = new MsEdgeTTS({ synthesisTimeoutMs: 20000 });
    try {
      await tts.setMetadata(
        voice,
        OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
      );
      const { audioStream } = tts.toStream(escaped);

      const chunks = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }

      const audio = Buffer.concat(chunks);
      return audio.length > 0 ? audio : null;
    } catch (error) {
      console.error("Error in Edge TTS:", error.message);
      return null;
    } finally {
      tts.close();
    }
  }
}

module.exports = EdgeTtsApi;
