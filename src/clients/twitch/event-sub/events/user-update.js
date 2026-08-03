const {
  handleExistingConfigUsernameChange,
  normalizeUserDoc,
} = require("../../../../handlers/listener/update-user");

module.exports = async function handleUserUpdate(event) {
  try {
    // These are the only properties allowed per your schema
    const userId = event.userId;
    const userLogin =
      event.userName ||
      (event.userDisplayName ? event.userDisplayName.toLowerCase() : "unknown");

    // Get user by userId from DB
    const knownUser = normalizeUserDoc(
      await fb.db.get("users", {
        userid: userId,
      }),
      userLogin
    );

    if (knownUser) {
      // Only update if their currAlias is not up to date
      if (knownUser.currAlias !== userLogin) {
        fb.discord.log(
          `* EventSub: Username update detected: ${knownUser.currAlias} -> ${userLogin} (${userId})`
        );
        // Update user aliases in database
        await fb.db.update(
          "users",
          { userid: userId },
          {
            $set: { currAlias: userLogin },
            $addToSet: { aliases: userLogin },
          }
        );
        // Update broadcaster config if applicable
        await handleExistingConfigUsernameChange(userId, userLogin);
      }
    } else {
      // Insert as new user (came via EventSub, so possible broadcaster, mod, or regular user) (should never happen i think)
      fb.discord.log(
        `* EventSub: NEW USER detected via update: ${userLogin} (${userId})`
      );
      await fb.db.insertTemplate("users", {
        message: {
          senderUserID: userId,
          senderUsername: userLogin,
          channelName: userLogin,
          messageText: "",
        },
      });
      // Handle broadcaster config possibility too
      await handleExistingConfigUsernameChange(userId, userLogin);
    }
  } catch (error) {
    console.error(error);
    fb.discord.logError(`Error handling user update event: ${error.message}`);
  }
};
