class IvrApi {
  constructor() {
    this.baseUrl = "https://api.ivr.fi/v2/twitch";
  }

  async getUser(username) {
    const data = await fb.got(`${this.baseUrl}/user?login=${username}`);

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const user = data[0] || {};
    const displayName = user.displayName;
    const userId = user.id;
    const chatColor = user.chatColor ? user.chatColor : "Nenhuma";
    const badge = user.badges?.[0]?.title || "Nenhuma";
    const chatterCount = user.chatterCount;
    const createdAt = new Date(user.createdAt)
      .toLocaleDateString("pt-BR")
      .replaceAll("/", "-");
    const createdHowLongAgo = fb.utils.relativeTime(user.createdAt, true, true);
    const followers = user.followers;
    const isLive = !!user.stream;
    const lastStream = user.lastBroadcast?.startedAt
      ? fb.utils.relativeTime(user.lastBroadcast.startedAt, true, true)
      : null;
    const isBanned = user.banned;
    const banReason = user.banReason || null;

    return {
      displayName,
      userId,
      chatColor,
      badge,
      chatterCount,
      createdAt,
      createdHowLongAgo,
      followers,
      isLive,
      lastStream,
      isBanned,
      banReason,
    };
  }

  async getUserById(userid) {
    const data = await fb.got(`${this.baseUrl}/user?id=${userid}`);

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const user = data[0] || {};
    const displayName = user.displayName;
    const userId = user.id;
    const chatColor = user.chatColor ? user.chatColor : "Nenhuma";
    const badge = user.badges?.[0]?.title || "Nenhuma";
    const chatterCount = user.chatterCount;
    const createdAt = new Date(user.createdAt)
      .toLocaleDateString("pt-BR")
      .replaceAll("/", "-");
    const createdHowLongAgo = fb.utils.relativeTime(user.createdAt, true, true);
    const followers = user.followers;
    const isLive = !!user.stream;
    const lastStream = user.lastBroadcast?.startedAt
      ? fb.utils.relativeTime(user.lastBroadcast.startedAt, true, true)
      : null;
    const isBanned = user.banned;
    const banReason = user.banReason || null;

    return {
      displayName,
      userId,
      chatColor,
      badge,
      chatterCount,
      createdAt,
      createdHowLongAgo,
      followers,
      isLive,
      lastStream,
      isBanned,
      banReason,
    };
  }

  async getLive(username) {
    const data = await fb.got(`${this.baseUrl}/user?login=${username}`);

    if (data === null || data == [] || data.length === 0) {
      return null;
    }

    const lastStreamDate = data[0].lastBroadcast?.startedAt ?? null;

    if (!lastStreamDate) {
      return "never streamed";
    }

    const user = data[0] || {};
    const stream = user.stream ?? null;
    const isLive = !!stream;

    if (isLive) {
      return {
        isLive: true,
        title: stream?.title || null,
        game: stream?.game?.displayName || "(sem categoria)",
        viewers: stream?.viewersCount || 0,
        startedAt: stream?.createdAt || null,
      };
    }

    return {
      isLive: false,
      lastStreamDate: user.lastBroadcast?.startedAt || null,
      lastStreamTitle: user.lastBroadcast?.title || null,
    };
  }

  async getSubAge(user, channel) {
    const data = await fb.got(`${this.baseUrl}/subage/${user}/${channel}`);

    if (data === null || data == [] || data.length === 0) {
      return null;
    }

    const isActiveSub = data.meta !== null;
    const hasSubbed = data.cumulative !== null;
    const monthsActive = data.cumulative?.months ?? 0;
    const streakMonths = data.streak?.months ?? 0;
    const endsAt = data.meta?.endsAt ?? null;
    const subscriptionType = data.meta?.type ?? null;
    const subscriptionTier = data.meta?.tier ?? null;
    const subscriptionGifter = data.meta?.giftMeta?.gifter?.displayName;

    return {
      isActiveSub,
      hasSubbed,
      monthsActive,
      streakMonths,
      endsAt,
      subscriptionType,
      subscriptionTier,
      subscriptionGifter,
      user: data.user,
      channel: data.channel,
      followedAt: data.followedAt ?? null,
    };
  }

  async getFollowAge(user, channel) {
    const data = await fb.got(`${this.baseUrl}/subage/${user}/${channel}`);

    if (data === null || data == [] || data.length === 0) {
      return null;
    }

    const followedAt = data.followedAt ?? null;

    return {
      followedAt,
    };
  }
}

module.exports = IvrApi;
