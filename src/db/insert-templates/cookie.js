module.exports = function buildCookieTemplate(params) {
  const message = params?.message ?? null;
  const isUserPlus = params?.isUserPlus === true;

  if (!message) {
    throw new Error(
      "insert template 'cookie' requires { message, isUserPlus }"
    );
  }

  return {
    userId: message.senderUserID,
    user: message.senderUsername,
    total: isUserPlus ? 2 : 1,
    gifted: 0,
    beenGifted: 0,
    opened: 0,
    sloted: 0,
    eaten: 0,
    claimedToday: true,
    giftedToday: false,
    usedSlot: false,
    stolenToday: false,
    gotStolen: 0,
    gotStolenBy: null,
    totalStolen: 0,
    totalGotStolen: 0,
  };
};
