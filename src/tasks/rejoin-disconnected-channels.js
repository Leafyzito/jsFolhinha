async function rejoinDisconnectedChannels() {
  const connectedChannels = [...fb.twitch.anonClient.currentChannels];

  // fetch channels to join from config table
  const channelsToJoin = await fb.db.get("config", {});

  // update fb.twitch.anonClient.channelsToJoin
  fb.twitch.anonClient.channelsToJoin = channelsToJoin.map(
    (channel) => channel.channel
  );

  for (const channel of channelsToJoin) {
    if (!connectedChannels.includes(channel.channel)) {
      fb.twitch.join([channel.channel]);
    }
  }
}

module.exports = rejoinDisconnectedChannels;
