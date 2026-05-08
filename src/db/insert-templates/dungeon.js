module.exports = function buildDungeonTemplate(params) {
  const message = params?.message ?? params;
  if (!message) {
    throw new Error("insert template 'dungeon' requires { message }");
  }

  return {
    userId: message.senderUserID,
    username: message.senderUsername,
    xp: 0,
    level: 0,
    wins: 0,
    losses: 0,
    lastDungeon: 0,
    cooldown: 0,
  };
};
