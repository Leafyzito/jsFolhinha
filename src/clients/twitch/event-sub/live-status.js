// How long to wait for more channels before asking Helix about them together
const REFRESH_DELAY = 2_000;

// Live state per channel, kept current by stream events
// Helix only fills in channels we have no event for yet (startup, new subscriptions)
class LiveStatus {
  constructor() {
    // Map<channelId, { live, updatedAt }>
    this.channels = new Map();
    this.pendingRefresh = new Set();
    this.refreshTimer = null;
  }

  // Returns true or false, null if we don't know yet
  get(channelId) {
    return this.channels.get(channelId)?.live ?? null;
  }

  set(channelId, live) {
    this.channels.set(channelId, { live, updatedAt: Date.now() });
  }

  delete(channelId) {
    this.channels.delete(channelId);
  }

  async refresh(channelIds) {
    if (channelIds.length === 0) {
      return;
    }

    const startedAt = Date.now();
    let streams;
    try {
      streams = await fb.api.helix.getStreamsByUserIds(channelIds);
    } catch (error) {
      // Channels stay unknown, so they keep falling back to Helix one by one
      console.error("Error refreshing live status:", error);
      fb.discord.logError(`Error refreshing live status: ${error.message}`);
      return;
    }

    const liveIds = new Set(streams.map((stream) => stream.channelId));
    for (const channelId of channelIds) {
      // A stream event that arrived during the request is newer than this answer
      if (this.channels.get(channelId)?.updatedAt >= startedAt) {
        continue;
      }
      this.set(channelId, liveIds.has(channelId));
    }
  }

  // Groups channels verified around the same time into one Helix request
  queueRefresh(channelId) {
    this.pendingRefresh.add(channelId);
    if (this.refreshTimer) {
      return;
    }

    this.refreshTimer = setTimeout(() => {
      const channelIds = [...this.pendingRefresh];
      this.pendingRefresh.clear();
      this.refreshTimer = null;
      this.refresh(channelIds);
    }, REFRESH_DELAY);
  }
}

module.exports = LiveStatus;
