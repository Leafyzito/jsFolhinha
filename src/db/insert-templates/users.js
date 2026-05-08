module.exports = function buildUsersTemplate(params) {
  const message = params?.message ?? null;
  const userId =
    params?.userId ?? params?.userid ?? message?.senderUserID ?? null;
  const username =
    params?.username ?? params?.userLogin ?? message?.senderUsername ?? null;

  if (!userId || !username) {
    throw new Error(
      "insert template 'users' requires { userId, username } or { message }"
    );
  }

  const lsChannel =
    params?.lsChannel ??
    message?.channelName ??
    params?.channelName ??
    username;
  const lsMessage = params?.lsMessage ?? message?.messageText ?? "";
  const now = params?.now ?? fb.utils.unix();

  return {
    userid: userId,
    aliases: [username],
    currAlias: username,
    customAliases: [],
    lsChannel,
    lsMessage,
    lsDate: now,
    firstSeen: now,
    optoutLs: false,
    optoutStalk: false,
    optoutRemind: false,
    optoutOwnChannel: false,
    isPlus: false,
    isSupporter: false,
    lastSupportDate: null,
    totalDonated: 0,
    blocks: {},
    connections: {},
  };
};
