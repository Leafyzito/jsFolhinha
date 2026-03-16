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
    console.log(`Updating channel config for ${oldUsername} -> ${newUsername}`);

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

  if (knownUser && knownUser.currAlias === message.senderUsername) {
    // User is known and username hasn't changed, just update last seen
    return await updateLastSeen(message);
  }

  if (knownUser && knownUser.currAlias !== message.senderUsername) {
    // Username has changed, update aliases and handle channel config updates if applicable
    fb.discord.log(
      `* Updating user aliases: #${message.channelName}/${knownUser.currAlias} -> ${message.senderUsername}`
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

  fb.db
    .insert("users", {
      userid: message.senderUserID,
      aliases: [message.senderUsername],
      currAlias: message.senderUsername,
      customAliases: [],
      lsChannel: message.channelName,
      lsMessage: message.messageText,
      lsDate: Math.floor(Date.now() / 1000),
      optoutLs: false,
      optoutStalk: false,
      optoutRemind: false,
      optoutOwnChannel: false,
      blocks: {},
    })
    .catch((err) => {
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
