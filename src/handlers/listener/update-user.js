async function updateLastSeen(message) {
  const update_doc = {
    $set: {
      lsDate: Math.floor(Date.now() / 1000),
      lsChannel: message.channelName,
      lsMessage: message.messageText,
    },
  };

  await fb.db.update("users", { userid: message.senderUserID }, update_doc);
  return;
}

async function handleExistingConfigUsernameChange(userId, newUsername) {
  // Get channel config from database and update if applicable
  const channelConfig = await fb.db.get("config", {
    channelId: userId,
  });

  if (channelConfig) {
    const oldUsername = channelConfig.channel;

    fb.discord.log(
      `* Updating channel config for ${oldUsername} -> ${newUsername}`
    );
    console.info(
      `Updating channel config for ${oldUsername} -> ${newUsername}`
    );

    await fb.db.update(
      "config",
      { channelId: userId },
      { $set: { channel: newUsername } }
    );

    // Handle Twitch client operations for channel changes
    fb.twitch.part(oldUsername);
    const joinResult = fb.twitch.join([newUsername]);
    if (!joinResult) {
      fb.discord.importantLog(
        `Error joining ${newUsername} after username change`
      );
    }

    fb.log.send(
      newUsername,
      `Troca de nick detetada: ${oldUsername} -> ${newUsername}`
    );
  }
}

const updateUserListener = async (message) => {
  if (message.senderUsername === process.env.BOT_USERNAME) {
    return;
  }

  // Check if user is already known in the database
  const knownUser = await fb.db.get("users", {
    userid: message.senderUserID,
  });

  const currentAlias = knownUser?.currAlias?.toLowerCase();
  const senderUsername = message.senderUsername?.toLowerCase();

  if (knownUser && currentAlias && currentAlias === senderUsername) {
    // User is known and username hasn't changed, just update last seen
    return await updateLastSeen(message);
  }

  if (knownUser) {
    // Username changed or currAlias was missing, update aliases
    fb.discord.log(
      `* Updating user aliases: #${message.channelName}/${knownUser.currAlias ?? "(none)"} -> ${message.senderUsername}`
    );

    await fb.db.update(
      "users",
      { userid: message.senderUserID },
      {
        $set: { currAlias: message.senderUsername },
        $push: { aliases: message.senderUsername },
      }
    );

    // Handle broadcaster username change if applicable
    await handleExistingConfigUsernameChange(
      message.senderUserID,
      message.senderUsername
    );

    await updateLastSeen(message);
    return;
  }

  // New user - create in database
  fb.discord.log(
    `* NEW USER: #${message.channelName}/${message.senderUsername}`
  );
  // console.log(`NEW USER: #${message.channelName}/${message.senderUsername}`);

  fb.db.insertTemplate("users", { message }).catch((err) => {
    fb.discord.importantLog(
      `Failed to insert new user ${message.senderUsername} (${message.senderUserID}): ${err.message}`
    );
    console.error("insert new user error:", err);
  });
};

module.exports = {
  updateUserListener,
  handleExistingConfigUsernameChange,
};
