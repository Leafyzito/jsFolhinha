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

const normalizeUserDoc = (result, preferredAlias = null) => {
  if (!result) {
    return null;
  }
  // fb.db.get returns an array when multiple docs match (e.g. duplicates)
  if (!Array.isArray(result)) {
    return result;
  }
  if (result.length === 0) {
    return null;
  }

  const preferred = preferredAlias?.toLowerCase();
  if (preferred) {
    const match = result.find(
      (u) => u?.currAlias?.toLowerCase() === preferred
    );
    if (match) {
      return match;
    }
  }

  return result.find((u) => u?.currAlias) || result[0] || null;
};

const updateUserListener = async (message) => {
  if (message.senderUsername === process.env.BOT_USERNAME) {
    return;
  }

  // Check if user is already known in the database
  const knownUser = normalizeUserDoc(
    await fb.db.get("users", {
      userid: message.senderUserID,
    }),
    message.senderUsername
  );

  if (!knownUser) {
    // New user - create in database
    fb.discord.log(
      `* NEW USER: #${message.channelName}/${message.senderUsername}`
    );

    fb.db.insertTemplate("users", { message }).catch((err) => {
      fb.discord.importantLog(
        `Failed to insert new user ${message.senderUsername} (${message.senderUserID}): ${err.message}`
      );
      console.error("insert new user error:", err);
    });
    return;
  }

  const currentAlias = knownUser.currAlias?.toLowerCase();
  const senderUsername = message.senderUsername?.toLowerCase();

  if (currentAlias === senderUsername) {
    // User is known and username hasn't changed, just update last seen
    return await updateLastSeen(message);
  }

  if (!currentAlias) {
    // Heal incomplete docs without treating it as a nick change
    await fb.db.update(
      "users",
      { userid: message.senderUserID },
      {
        $set: { currAlias: message.senderUsername },
        $addToSet: { aliases: message.senderUsername },
      }
    );
    return await updateLastSeen(message);
  }

  // Username has changed, update aliases and handle channel config if applicable
  fb.discord.log(
    `* Updating user aliases: #${message.channelName}/${knownUser.currAlias} -> ${message.senderUsername}`
  );

  await fb.db.update(
    "users",
    { userid: message.senderUserID },
    {
      $set: { currAlias: message.senderUsername },
      $addToSet: { aliases: message.senderUsername },
    }
  );

  await handleExistingConfigUsernameChange(
    message.senderUserID,
    message.senderUsername
  );

  await updateLastSeen(message);
};

module.exports = {
  updateUserListener,
  handleExistingConfigUsernameChange,
  normalizeUserDoc,
};
