async function dailyCookieResetTask() {
  fb.discord.log("* Resetting daily cookies");
  console.info("* Resetting daily cookies");

  await fb.db.updateMany(
    "cookie",
    {},
    {
      $set: {
        claimedToday: false,
        giftedToday: false,
        usedSlot: false,
        stolenToday: false,
        gotStolen: 0,
        gotStolenBy: null,
      },
    }
  );
}

module.exports = dailyCookieResetTask;
