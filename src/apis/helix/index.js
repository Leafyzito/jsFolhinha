class HelixApi {
  constructor() {
    this.baseUrl = "https://api.twitch.tv/helix";
    this.streamerStatusCache = {};
    this.userCache = new Map(); // Cache for user data
    this.userCacheTimeout = 24 * 60 * 60 * 1000; // 24 hour cache timeout
  }

  async _getBotAccessToken() {
    try {
      // Check if auth provider is available
      if (
        !fb ||
        !fb.authProvider ||
        !fb.authProvider.provider ||
        !process.env.BOT_USERID
      ) {
        console.warn(
          "HelixApi: Auth provider not available, falling back to env variable"
        );
        return process.env.BOT_OAUTH_TOKEN || null;
      }

      // Get token from RefreshingAuthProvider (automatically handles refresh)
      const tokenData = await fb.authProvider.provider.getAccessTokenForUser(
        process.env.BOT_USERID
      );

      if (!tokenData || !tokenData.accessToken) {
        console.error(
          "HelixApi: Failed to get bot access token from auth provider, falling back to env variable"
        );
        return process.env.BOT_OAUTH_TOKEN || null;
      }

      return tokenData.accessToken;
    } catch (error) {
      console.error(
        `HelixApi: Error getting bot access token: ${error.message}, falling back to env variable`
      );
      return process.env.BOT_OAUTH_TOKEN || null;
    }
  }

  async _getUserAccessToken(userId) {
    try {
      if (
        !fb ||
        !fb.authProvider ||
        !fb.authProvider.provider ||
        !userId
      ) {
        return null;
      }

      const tokenData =
        await fb.authProvider.provider.getAccessTokenForUser(userId);

      if (!tokenData || !tokenData.accessToken) {
        console.error(
          `HelixApi: Failed to get access token for userId: ${userId}`
        );
        return null;
      }

      return tokenData.accessToken;
    } catch (error) {
      console.error(
        `HelixApi: Error getting user access token for ${userId}: ${error.message}`
      );
      return null;
    }
  }

  async getUserByUsername(username) {
    username = username.toLowerCase();

    // Check cache first
    const cached = this.userCache.get(username);
    if (cached) {
      if (Date.now() - cached.timestamp < this.userCacheTimeout) {
        return cached.data;
      }
      // Cache expired, remove it
      this.userCache.delete(username);
    }

    // Not in cache, make API request
    const token = await this._getBotAccessToken();
    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    };
    const response = await fb.got(`${this.baseUrl}/users?login=${username}`, {
      headers,
    });

    if (!response) {
      fb.discord.logError(
        `Helix API (getUserByUsername): Request failed for username: ${username}`
      );
      return null;
    }

    let data = response;
    if (!data.data || data.data.length === 0) {
      return null;
    }

    data = data.data;

    const userData = {
      id: data[0].id || null,
      login: data[0].login || null,
      displayName: data[0].display_name || null,
      type: data[0].type || null,
      description: data[0].description || null,
      profileImageUrl: data[0].profile_image_url || null,
      offlineImageUrl: data[0].offline_image_url || null,
      viewCount: data[0].view_count || null,
      createdAt: data[0].created_at || null,
    };

    // Cache the result
    this.userCache.set(username, {
      data: userData,
      timestamp: Date.now(),
    });

    return userData;
  }

  async getUserByID(userId) {
    const token = await this._getBotAccessToken();
    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    };
    const response = await fb.got(`${this.baseUrl}/users?id=${userId}`, {
      headers,
    });

    if (!response) {
      fb.discord.logError(
        `Helix API (getUserByID): Request failed for userId: ${userId}`
      );
      return null;
    }

    let data = response;
    if (!data.data || data.data.length === 0) {
      return null;
    }

    data = data.data;

    const id = data[0].id || null;
    const login = data[0].login || null;
    const displayName = data[0].display_name || null;
    const type = data[0].type || null;
    const description = data[0].description || null;
    const profileImageUrl = data[0].profile_image_url || null;
    const offlineImageUrl = data[0].offline_image_url || null;
    const viewCount = data[0].view_count || null;
    const createdAt = data[0].created_at || null;

    return {
      id,
      login,
      displayName,
      type,
      description,
      profileImageUrl,
      offlineImageUrl,
      viewCount,
      createdAt,
    };
  }

  async getColor(userId) {
    const token = await this._getBotAccessToken();
    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    };
    const response = await fb.got(
      `${this.baseUrl}/chat/color?user_id=${userId}`,
      {
        headers,
      }
    );

    if (!response) {
      fb.discord.logError(
        `Helix API (getColor): Request failed for userId: ${userId}`
      );
      return null;
    }

    let data = response;
    if (!data.data || data.data.length === 0) {
      return null;
    }

    data = data.data;

    const user_id = data[0].user_id || null;
    const user_login = data[0].user_login || null;
    const user_name = data[0].user_name || null;
    const color = data[0].color || null;

    return {
      user_id,
      user_login,
      user_name,
      color,
    };
  }

  async getStream(username) {
    const token = await this._getBotAccessToken();
    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    };
    const response = await fb.got(
      `${this.baseUrl}/streams?user_login=${username}`,
      {
        headers,
      }
    );

    if (!response) {
      fb.discord.logError(
        `Helix API (getStream): Request failed for username: ${username}`
      );
      return null;
    }

    let data = response;
    if (!data.data || data.data.length === 0) {
      return null;
    }

    data = data.data;

    const id = data[0].id || null;
    const user_id = data[0].user_id || null;
    const user_login = data[0].user_login || null;
    const user_name = data[0].user_name || null;
    const game_id = data[0].game_id || null;
    const game_name = data[0].game_name || null;
    const type = data[0].type || null;
    const title = data[0].title || null;
    const tags = data[0].tags || null;
    const viewer_count = data[0].viewer_count || null;
    const started_at = data[0].started_at || null;
    const language = data[0].language || null;
    const thumbnail_url = data[0].thumbnail_url || null;
    const is_mature = data[0].is_mature || null;

    return {
      id,
      user_id,
      user_login,
      user_name,
      game_id,
      game_name,
      type,
      title,
      tags,
      viewer_count,
      started_at,
      language,
      thumbnail_url,
      is_mature,
    };
  }

  async getStreamsByUserIds(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }

    const token = await this._getBotAccessToken();
    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    };

    // Split userIds into chunks of 100 (Twitch API limit)
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < userIds.length; i += chunkSize) {
      chunks.push(userIds.slice(i, i + chunkSize));
    }

    const allStreams = [];

    // Process each chunk
    for (const chunk of chunks) {
      try {
        // Build query string with multiple user_id parameters
        const userParams = chunk.map((id) => `user_id=${id}`).join("&");
        let url = `${this.baseUrl}/streams?${userParams}&first=100`;

        // Handle pagination for this chunk
        let hasMorePages = true;
        while (hasMorePages) {
          const response = await fb.got(url, { headers });

          if (!response) {
            console.error(
              `Helix API (getStreamsByUserIds): Request failed for chunk`
            );
            break;
          }

          const data = response.data || [];
          const pagination = response.pagination || {};

          // Process streams from this page
          for (const stream of data) {
            if (stream.type === "live") {
              allStreams.push({
                channelId: stream.user_id,
                channelName: stream.user_login,
                displayName: stream.user_name,
                isLive: true,
                startedAt: stream.started_at
                  ? new Date(stream.started_at)
                  : new Date(),
              });
            }
          }

          // Check if there are more pages
          if (pagination.cursor) {
            url = `${this.baseUrl}/streams?${userParams}&first=100&after=${pagination.cursor}`;
          } else {
            hasMorePages = false;
          }
        }
      } catch (error) {
        console.error(`Error fetching streams for chunk: ${error.message}`);
        // Continue with other chunks even if one fails
      }
    }

    return allStreams;
  }

  // Stream status cache to avoid excessive API calls
  async isStreamOnline(channelName, cacheTimeout = 60) {
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if the streamer's online status is present in the cache and not expired
    if (
      this.streamerStatusCache[channelName] &&
      currentTime - this.streamerStatusCache[channelName].timestamp <
        cacheTimeout
    ) {
      return this.streamerStatusCache[channelName].status === "live";
    }

    const token = await this._getBotAccessToken();
    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await fb.got(
        `${this.baseUrl}/streams?user_login=${channelName}`,
        { headers }
      );

      if (!response) {
        fb.discord.logError(
          `Helix API (isStreamOnline): Request failed for channelName: ${channelName}`
        );
        return false;
      }

      let data = response;
      if (!data || !data.data || data.data.length === 0) {
        return false;
      }

      data = data.data;

      const streamerStatus = data && data.length > 0 ? data[0].type : "offline";

      // Update the cache with the current status and timestamp
      this.streamerStatusCache[channelName] = {
        status: streamerStatus,
        timestamp: currentTime,
      };

      return this.streamerStatusCache[channelName].status === "live";
    } catch (error) {
      console.error(`Error fetching stream status for ${channelName}:`, error);
      // If API call fails, return cached value if available, otherwise false
      if (this.streamerStatusCache[channelName]) {
        return this.streamerStatusCache[channelName].status === "live";
      }
      return false;
    }
  }

  async timeoutUser(channelId, userId, duration, reason) {
    const token = await this._getBotAccessToken();
    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const response = await fb.got(
      `${this.baseUrl}/moderation/bans?broadcaster_id=${channelId}&moderator_id=${process.env.BOT_USERID}`,
      {
        headers,
        method: "POST",
        json: {
          data: {
            user_id: userId,
            duration: duration,
            reason: reason,
          },
        },
      }
    );

    if (!response) {
      return false; // request failed
    }

    return true;
  }

  async whisper(whisperTargetId, content) {
    const token = await this._getBotAccessToken();
    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    };
    const response = await fb.got(
      `${this.baseUrl}/whispers?from_user_id=${process.env.BOT_USERID}&to_user_id=${whisperTargetId}`,
      {
        headers,
        method: "POST",
        json: {
          message: content,
        },
      }
    );

    if (!response) {
      fb.discord.logError(
        `Helix API (whisper): Request failed for whisperTargetId: ${whisperTargetId}`
      );
      return false;
    }

    // Note: fb.got doesn't provide status codes, so we can't check for 429 (rate limit error) specifically
    // The API will return null on failure, which we handle above

    return true;
  }

  async getManyUsersByUserIDs(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }

    const token = await this._getBotAccessToken();

    // Split userIds into chunks of 100 (Twitch API limit)
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < userIds.length; i += chunkSize) {
      chunks.push(userIds.slice(i, i + chunkSize));
    }

    const allUsers = [];

    // Process each chunk
    for (const chunk of chunks) {
      const userIdsToUrl = chunk.join("&id=");
      const headers = {
        "Client-ID": process.env.BOT_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      };

      try {
        const response = await fb.got(
          `${this.baseUrl}/users?id=${userIdsToUrl}`,
          { headers }
        );

        if (response) {
          const data = response.data;

          if (data && data.length > 0) {
            data.forEach((user) => {
              const id = user.id || null;
              const login = user.login || null;
              const displayName = user.display_name || null;
              const type = user.type || null;
              const description = user.description || null;
              const profileImageUrl = user.profile_image_url || null;
              const offlineImageUrl = user.offline_image_url || null;
              const viewCount = user.view_count || null;
              const createdAt = user.created_at || null;

              allUsers.push({
                id,
                login,
                displayName,
                type,
                description,
                profileImageUrl,
                offlineImageUrl,
                viewCount,
                createdAt,
              });
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching users for chunk: ${error}`);
        // Continue with other chunks even if one fails
      }
    }

    return allUsers;
  }

  async getBroadcasterSubscriptions(broadcasterId) {
    const token = await this._getUserAccessToken(broadcasterId);
    if (!token) {
      const message = `Helix API (getBroadcasterSubscriptions): No access token for broadcaster ${broadcasterId}`;
      console.error(message);
      if (fb.discord && fb.discord.logError) {
        fb.discord.logError(message);
      }
      return null;
    }

    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    };

    const subscribers = [];
    let url = `${this.baseUrl}/subscriptions?broadcaster_id=${broadcasterId}&first=100`;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const response = await fb.got(url, { headers });

        if (!response) {
          const message = `Helix API (getBroadcasterSubscriptions): Request failed for broadcaster ${broadcasterId}`;
          console.error(message);
          if (fb.discord && fb.discord.logError) {
            fb.discord.logError(message);
          }
          return null;
        }

        const data = response.data || [];
        for (const sub of data) {
          if (sub.user_id) {
            subscribers.push({
              userId: sub.user_id,
              login: sub.user_login || sub.user_name || sub.user_id,
            });
          }
        }

        const pagination = response.pagination || {};
        if (pagination.cursor) {
          url = `${this.baseUrl}/subscriptions?broadcaster_id=${broadcasterId}&first=100&after=${pagination.cursor}`;
        } else {
          hasMorePages = false;
        }
      } catch (error) {
        const message = `Helix API (getBroadcasterSubscriptions): ${error.message}`;
        console.error(message);
        if (fb.discord && fb.discord.logError) {
          fb.discord.logError(message);
        }
        return null;
      }
    }

    return subscribers;
  }

  async createClip(channelId) {
    const token = await this._getBotAccessToken();
    const headers = {
      "Client-ID": process.env.BOT_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    };
    const response = await fb.got(
      `${this.baseUrl}/clips?broadcaster_id=${channelId}`,
      { method: "POST", headers }
    );

    if (!response) {
      fb.discord.logError(
        `Helix API (createClip): Request failed for channelId: ${channelId}`
      );
      return null;
    }

    // Note: fb.got doesn't provide status codes, so we can't check for specific status codes
    // The API will return null on failure, which we handle above

    const data = response;

    if (!data.data || data.data.length === 0) {
      return null;
    }

    const id = data.data[0].id;
    const editUrl = data.data[0].edit_url;
    const clipUrl = `https://clips.twitch.tv/${id}`;
    return { id, editUrl, clipUrl };
  }
}

module.exports = HelixApi;
