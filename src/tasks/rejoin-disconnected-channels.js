async function rejoinDisconnectedChannels() {
  const normalizeLogin = (s) =>
    (s ?? "").toString().trim().replace(/^#/, "").toLowerCase();

  const connectedChannels = new Set(
    [...fb.twitch.anonClient.currentChannels].map(normalizeLogin)
  );

  // fetch channels to join from config table
  const channelsToJoin = await fb.db.get("config", { state: "active" });

  // update fb.twitch.anonClient.channelsToJoin
  fb.twitch.anonClient.channelsToJoin = channelsToJoin.map(
    (channel) => channel.channel
  );

  for (const channel of channelsToJoin) {
    const channelLogin = normalizeLogin(channel.channel);
    if (!connectedChannels.has(channelLogin)) {
      // verify user exists in twitch
      const user = await fb.api.helix.getUserByUsername(channelLogin);
      if (!user) {
        await fb.db.update(
          "config",
          { channelId: channel.channelId },
          { $set: { state: "inactive" } }
        );
        continue;
      }

      fb.twitch.anonClient.join(channelLogin);
    }
  }
}

module.exports = rejoinDisconnectedChannels;
