const { shouldSkipMessage } = require("./middleware");
const schedule = require("node-schedule");

let processingReminder = [];
const scheduledReminders = new Set(); // Track scheduled reminder IDs locally

// MARKER: helper functions
// Helper function to format reminder message
const formatReminderMessage = (
  reminderSender,
  receiverName,
  howLongAgo,
  reminderMessage,
) => {
  return reminderSender === receiverName
    ? `@${receiverName}, lembrete de você mesmo há ${howLongAgo}: ${reminderMessage}`
    : `@${receiverName}, lembrete de @${reminderSender} há ${howLongAgo}: ${reminderMessage}`;
};

// Helper function to clear notifiedUsers cache for a specific user
const clearNotifiedCacheForUser = (userId) => {
  if (fb.notifiedUsers && fb.notifiedUsers.has(userId)) {
    fb.notifiedUsers.delete(userId);
    console.debug(`* Cleared notifiedUsers cache for user ${userId}`);
  }
};

// Helper function to clear all notifiedUsers cache
const clearAllNotifiedCache = () => {
  if (fb.notifiedUsers) {
    const cacheSize = fb.notifiedUsers.size;
    fb.notifiedUsers.clear();
    console.debug(`* Cleared all notifiedUsers cache (${cacheSize} users)`);
  }
};

// Helper function to check if user has pending reminders and clear cache if not
const checkAndClearCacheIfNoReminders = async (userId) => {
  try {
    const pendingReminders = await fb.db.get(
      "remind",
      { receiverId: userId, beenRead: false, remindAt: null },
      true,
    );

    // If no pending reminders, clear the user from cache
    if (
      !pendingReminders ||
      (Array.isArray(pendingReminders) && pendingReminders.length === 0)
    ) {
      clearNotifiedCacheForUser(userId);
    }
  } catch (error) {
    console.error(
      "Error checking pending reminders for cache clearing:",
      error,
    );
  }
};

// Helper function to send reminder and update database
const sendReminderAndUpdate = async (reminder, finalRes) => {
  // Get channel config from database
  const channelData = await fb.db.get("config", {
    channelId: reminder.fromChannelId,
  });

  if (!channelData) {
    // If no channel config found, send via whisper
    const receiverUser = await fb.api.helix.getUserByID(reminder.receiverId);
    if (receiverUser?.id) {
      await fb.log.whisper(receiverUser.id, finalRes);
    }
    return;
  }

  // Handle case where channelData might be an array or single document
  const channelName = channelData.channel;

  // Check if channel is paused, reminders are banned, or offline-only with stream online
  const shouldSendViaWhisper =
    channelData.isPaused ||
    (channelData.disabledCommands &&
      channelData.disabledCommands.includes("remind")) ||
    (channelData.offlineOnly &&
      (await fb.api.helix.isStreamOnline(channelName)));

  if (shouldSendViaWhisper) {
    // Send in whisper if channel is paused, reminders are banned, or offline-only with stream online
    const receiverUser = await fb.api.helix.getUserByID(reminder.receiverId);
    if (receiverUser?.id) {
      await fb.log.whisper(receiverUser.id, finalRes);
    }
  } else {
    // Send in channel if channel is not paused, reminders are not banned, and not offline-only
    fb.log.send(channelName, finalRes);
  }

  await fb.db.update(
    "remind",
    { _id: reminder._id },
    { $set: { beenRead: true } },
  );
};

// MARKER: missed reminders
// Function to handle missed reminders
const handleMissedReminder = async (reminder) => {
  const reminderDate = new Date(reminder.remindAt * 1000);

  fb.discord.log(
    `* Sending missed reminder to ${
      reminder.fromChannelId
    } (${reminderDate.toLocaleString()})`,
  );
  console.info(
    `* Sending missed reminder to ${
      reminder.fromChannelId
    } (${reminderDate.toLocaleString()})`,
  );

  const reminderSender =
    (await fb.api.helix.getUserByID(reminder.senderId))?.login ||
    "Usuário deletado";
  const receiverName =
    (await fb.api.helix.getUserByID(reminder.receiverId))?.login ||
    "Usuário deletado 2";
  const reminderHowLongAgo = fb.utils.relativeTime(reminder.remindTime, true);

  // Check for banned content in reminder message
  const channelData = await fb.db.get("config", {
    channelId: reminder.fromChannelId,
  });
  const channelName = channelData?.channel || null;
  const checkedMessage = fb.utils.checkRegex(
    reminder.remindMessage,
    channelName,
  );
  const isBannedContent = checkedMessage.includes(
    "⚠️ Mensagem retida por conter conteúdo banido",
  );

  let finalRes;
  if (isBannedContent) {
    // Replace with banned content message format
    finalRes = `${receiverName}, você tem um remind de ${reminderSender} que contém conteúdo banido. Veja o remind em https://folhinhabot.com/lembretes (ID ${reminder._id})`;
  } else {
    finalRes = formatReminderMessage(
      reminderSender,
      receiverName,
      reminderHowLongAgo,
      reminder.remindMessage,
    );
  }

  if (finalRes.length > 480) {
    finalRes = await fb.utils.manageLongResponse(finalRes);
  }

  await sendReminderAndUpdate(reminder, finalRes);
};

// MARKER: scheduled reminders
// Function to schedule future reminders
const scheduleFutureReminder = async (reminder) => {
  // const reminderDate = new Date(reminder.remindAt * 1000);
  // console.log("* Setting timed reminder for " + reminderDate.toLocaleString());

  const job = schedule.scheduleJob(
    new Date(reminder.remindAt * 1000),
    async function () {
      // Verify the reminder has not been deleted externally, force check in db
      const remindDeletionCheck = await fb.db.get(
        "remind",
        { _id: reminder._id },
        true,
      );
      if (!remindDeletionCheck || remindDeletionCheck.beenRead) {
        return;
      }

      const reminderSender =
        (await fb.api.helix.getUserByID(reminder.senderId))?.login ||
        "Usuário deletado";
      const receiverName =
        (await fb.api.helix.getUserByID(reminder.receiverId))?.login ||
        "Usuário deletado 2";
      const howLongAgo = fb.utils.relativeTime(reminder.remindTime, true);

      // Check for banned content in reminder message
      const channelData = await fb.db.get("config", {
        channelId: reminder.fromChannelId,
      });
      const channelName = channelData?.channel || null;
      const checkedMessage = fb.utils.checkRegex(
        reminder.remindMessage,
        channelName,
      );
      const isBannedContent = checkedMessage.includes(
        "⚠️ Mensagem retida por conter conteúdo banido",
      );

      let finalRes;
      if (isBannedContent) {
        // Replace with banned content message format
        finalRes = `${receiverName}, você tem um remind de ${reminderSender} que contém conteúdo banido. Veja o remind em https://folhinhabot.com/lembretes (ID ${reminder._id})`;
      } else {
        finalRes = formatReminderMessage(
          reminderSender,
          receiverName,
          howLongAgo,
          reminder.remindMessage,
        );
      }

      if (finalRes.length > 480) {
        finalRes = await fb.utils.manageLongResponse(finalRes);
      }

      await sendReminderAndUpdate(reminder, finalRes);
    },
  );

  // Store the job in a global object to associate it with the reminderId
  if (!fb.reminderJobs) {
    fb.reminderJobs = {};
  }
  fb.reminderJobs[reminder._id] = job;
};

// MARKER: load reminders
// Main function to load and process reminders
const loadReminders = async () => {
  if (process.env.ENV !== "prod") {
    return;
  }
  // Clear the notifiedUsers cache on startup to ensure a fresh state
  clearAllNotifiedCache();

  const currentTime = Math.floor(Date.now() / 1000);

  try {
    const result = await fb.db.get("remind", { beenRead: false });

    for (const reminder of result) {
      // Handle scheduled reminders
      if (reminder.remindAt && !scheduledReminders.has(reminder._id)) {
        scheduledReminders.add(reminder._id);

        if (reminder.remindAt <= currentTime) {
          // Handle missed reminders
          await handleMissedReminder(reminder);
        } else {
          // Schedule future reminders
          await scheduleFutureReminder(reminder);
        }
      }
    }
  } catch (err) {
    console.error(`Error in reminder: ${err}`);
    if (fb.discord && fb.discord.logError) {
      fb.discord.logError(`Error in reminder: ${err}`);
    }
  }
};

// MARKER: reminder responses
// Function to handle reminder responses
const handleReminderResponse = async (message, reminders) => {
  // Ensure reminders is always an array
  if (!Array.isArray(reminders)) {
    reminders = [reminders];
  }

  if (reminders.length <= 3) {
    // Handle small number of reminders (≤3)
    let replyMsg = `${message.displayName}, você tem ${
      reminders.length
    } lembrete${reminders.length > 1 ? "s" : ""}: `;

    const firstThreeReminders = reminders.slice(0, 3);
    for (const reminder of firstThreeReminders) {
      const remindSender = await fb.api.helix.getUserByID(reminder.senderId);
      const remindTimeSince = fb.utils.relativeTime(reminder.remindTime, true);
      replyMsg +=
        ` @${
          remindSender?.login || "Usuário deletado"
        } (há ${remindTimeSince}): ${reminder.remindMessage}` +
        (reminder._id ===
        firstThreeReminders[firstThreeReminders.length - 1]._id
          ? ""
          : " ●");
    }

    if (replyMsg.length > 480) {
      fb.log.send(
        message.channelName,
        `${message.displayName}, você tem ${reminders.length} lembretes. Acesse https://folhinhabot.com/lembretes para ver os seus lembretes pendentes`,
      );
      return;
    }

    fb.log.send(message.channelName, replyMsg);

    // Mark reminders as read
    for (const reminder of firstThreeReminders) {
      await fb.db.update(
        "remind",
        { _id: reminder._id },
        { $set: { beenRead: true } },
      );
    }

    // Clear the user from notified cache since reminders were actually read
    clearNotifiedCacheForUser(message.senderUserID);

    return;
  }

  // Handle large number of reminders (>3)
  fb.log.send(
    message.channelName,
    `${message.displayName}, você tem ${reminders.length} lembretes. Acesse https://folhinhabot.com/lembretes para ver os seus lembretes pendentes`,
  );
};

// MARKER: main listener
// Main reminder listener function
const reminderListener = async (message) => {
  // Check if channel is paused or has reminders banned
  if (await shouldSkipMessage(message, "remind")) {
    return;
  }

  // Check if reminder is already being processed
  if (processingReminder.includes(message.senderUsername)) {
    return;
  }

  // Check if user has already been notified about their reminders in this session
  if (fb.notifiedUsers.has(message.senderUserID)) {
    return;
  }

  processingReminder.push(message.senderUsername);

  try {
    // Get user's pending reminders (immediate reminders only)
    const reminders = await fb.db.get(
      "remind",
      { receiverId: message.senderUserID, beenRead: false, remindAt: null },
      true,
    );

    if (!reminders) {
      processingReminder = processingReminder.filter(
        (user) => user !== message.senderUsername,
      );
      return;
    }

    // Ensure reminders is always an array
    const remindersArray = Array.isArray(reminders) ? reminders : [reminders];

    // Filter out reminders that were created very recently (within 2 seconds) by the same user
    // This prevents immediate execution of reminders on the same message that creates them
    const currentTime = Date.now();
    const filteredReminders = remindersArray.filter((reminder) => {
      const reminderTime = reminder.remindTime * 1000; // Convert to milliseconds
      const timeDiff = currentTime - reminderTime;
      return timeDiff >= 2000; // Only process reminders older than 2 seconds
    });

    if (filteredReminders.length === 0) {
      processingReminder = processingReminder.filter(
        (user) => user !== message.senderUsername,
      );
      return;
    }

    fb.notifiedUsers.add(message.senderUserID);

    // Handle the reminder response
    await handleReminderResponse(message, filteredReminders);
  } catch (error) {
    console.error("Error processing reminder:", error);
  } finally {
    // Clean up processing state
    processingReminder = processingReminder.filter(
      (user) => user !== message.senderUsername,
    );
  }
};

module.exports = {
  reminderListener,
  loadReminders,
  clearNotifiedCacheForUser,
  clearAllNotifiedCache,
  checkAndClearCacheIfNoReminders,
};
