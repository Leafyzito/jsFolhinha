module.exports = function buildAfkTemplate(params) {
  const message = params?.message ?? params;
  if (!message) {
    throw new Error("insert template 'afk' requires { message }");
  }

  return {
    channel: message.channelName,
    user: message.senderUsername,
    is_afk: false,
    afk: null,
    afk_message: null,
    afk_since: 0,
    afk_return: 0,
    afk_type: null,
    rafk_counter: 0,
  };
};
