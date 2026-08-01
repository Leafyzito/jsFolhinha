async function rejoinDisconnectedChannels() {
  // const normalizeLogin = (s) =>
  //   (s ?? "").toString().trim().replace(/^#/, "").toLowerCase();

  // const connectedChannels = new Set(
  //   [...fb.twitch.anonClient.currentChannels].map(normalizeLogin)
  // );

  // forceDb so we don't treat a partial Redis cache as the full active set
  const configsRaw = await fb.db.get("config", { state: "active" }, true);
  const channelsToJoin = Array.isArray(configsRaw)
    ? configsRaw
    : configsRaw
      ? [configsRaw]
      : [];

  // update fb.twitch.anonClient.channelsToJoin
  fb.twitch.anonClient.channelsToJoin = channelsToJoin.map(
    (channel) => channel.channel
  );

  // for (const channel of channelsToJoin) {
  //   const channelLogin = normalizeLogin(channel.channel);
  //   if (!connectedChannels.has(channelLogin)) {
  //     // verify user exists in twitch
  //     const user = await fb.api.helix.getUserByUsername(channelLogin);
  //     if (!user) {
  //       await fb.db.update(
  //         "config",
  //         { channelId: channel.channelId },
  //         { $set: { state: "inactive" } }
  //       );
  //       continue;
  //     }

  //     fb.twitch.anonClient.join(channelLogin);
  //   }
  // }
}

module.exports = rejoinDisconnectedChannels;
