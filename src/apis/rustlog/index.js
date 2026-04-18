class RustlogApi {
  constructor() {
    this.baseUrl = "https://logs.folhinhabot.com";
  }

  async addChannel(channelId) {
    const response = await fb.got(`${this.baseUrl}/admin/channels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.RUSTLOG_API_KEY,
      },
      json: {
        channels: [channelId],
      },
    });

    if (!response) {
      fb.discord.logError(
        `Failed to add channel ${channelId} to rustlog: Request failed`
      );
      throw new Error(
        `Failed to add channel ${channelId} to rustlog: Request failed`
      );
    }

    return true;
  }

  async removeChannel(channelId) {
    const response = await fb.got(`${this.baseUrl}/admin/channels`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.RUSTLOG_API_KEY,
      },
      json: {
        channels: [channelId],
      },
    });

    if (!response) {
      fb.discord.logError(
        `Failed to remove channel ${channelId} from rustlog: Request failed`
      );
      throw new Error(
        `Failed to remove channel ${channelId} from rustlog: Request failed`
      );
    }

    return true;
  }

  async getRandomLine(channelId, userId = null, jsonFormat = false) {
    let url;
    if (!userId) {
      url = `${this.baseUrl}/channelid/${channelId}/random`;
    } else {
      url = `${this.baseUrl}/channelid/${channelId}/userid/${userId}/random`;
    }

    if (jsonFormat) {
      url += "?jsonBasic=true";
    }

    const response = await fb.got(url, {
      headers: { accept: "application/json" },
    });

    if (!response) {
      return null;
    }

    return response;
  }

  async getRecentLines(channelId, limit = 50) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");

    const url = `${this.baseUrl}/channelid/${channelId}/${year}/${month}/${day}`;
    const raw = await fb.got(url, {
      responseType: "text",
      searchParams: {
        reverse: "1",
        limit: String(limit),
      },
    });

    if (raw == null) {
      return { ok: false, reason: "fetch_failed" };
    }

    const LINE_REGEX = /\[(.*?)\] #(.*?) (.*?): (.*)/;
    const rows = raw
      .split(/\r?\n/)
      .map((line) => {
        const match = line.match(LINE_REGEX);
        if (!match) {
          return null;
        }
        const [, timestamp, , user, msg] = match;
        return {
          timestamp,
          user,
          message: msg,
        };
      })
      .filter(Boolean);

    if (rows.length === 0) {
      return { ok: false, reason: "empty_log" };
    }

    rows.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const text = rows.map((r) => `${r.user}: ${r.message}`).join("\n");
    return { ok: true, text };
  }
}

module.exports = RustlogApi;
