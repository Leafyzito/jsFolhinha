module.exports = async function buildConfigTemplate(params) {
  const channelIdRaw = params?.channelId ?? params?.channelID ?? null;
  if (!channelIdRaw) {
    throw new Error("insert template 'config' requires { channelId }");
  }
  const channelId = String(channelIdRaw).trim();

  let channelName = params?.channelName ?? params?.channel ?? null;
  if (!channelName) {
    const fb = global.fb;
    if (!fb?.api?.helix?.getUserByID) {
      throw new Error(
        "insert template 'config' needs channelName or initialized fb.api.helix"
      );
    }
    channelName = (await fb.api.helix.getUserByID(channelId))?.login;
  }

  return {
    channel: String(channelName).trim().toLowerCase(),
    channelId,
    state: "active",
    prefix: ["!"],
    disabledCommands: [],
    devBanCommands: [],
    offlineOnly: false,
    emoteStreak: false,
    isPaused: false,
    thankFollows: false,
    thankSubs: false,
  };
};
