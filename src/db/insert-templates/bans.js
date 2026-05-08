module.exports = function buildBansTemplate(params) {
  const userId = params?.userId ?? params?.targetUserId ?? null;
  if (!userId) {
    throw new Error("insert template 'bans' requires { userId }");
  }

  return {
    userId,
    bannedCommands: [],
  };
};
