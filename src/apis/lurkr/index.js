// lurkr's public api for chat bots, docs at https://lurkr.leafyzito.dev/api
// returns the data, { error } for a 400/403/404 ("invalid id", "private", "not found"), or null if the request failed
class LurkrApi {
  constructor() {
    this.siteUrl = "https://lurkr.leafyzito.dev";
    this.baseUrl = `${this.siteUrl}/api/v1`;
  }

  async request(path) {
    return fb.got(`${this.baseUrl}${path}`, {
      headers: { "user-agent": "FolhinhaBot" },
      returnErrorBody: true,
    });
  }

  async getWatchtime(userId) {
    return this.request(`/watchtime/${userId}`);
  }

  async getChannelWatchtime(userId, channelId) {
    return this.request(`/watchtime/${userId}/${channelId}`);
  }
}

module.exports = LurkrApi;
