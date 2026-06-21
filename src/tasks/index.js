// scheduled in main.js
const dailyCookieResetTask = require("./daily-cookie-reset");

// recurring tasks
const {
  startPetTask,
  startFetchPendingJoinsTask,
  startRejoinDisconnectedChannelsTask,
  startDiscordPresenceTask,
  startCheckNewAuthUsersTask,
  startSyncPlusUsersTask,
} = require("./task-scheduler");

// Function to start all recurring tasks
const startAllTasks = () => {
  // Start recurring tasks
  if (process.env.ENV == "prod") {
    console.info("* Starting production tasks");
    const cron = require("node-cron");
    cron.schedule("0 9 * * *", async () => {
      await dailyCookieResetTask();
    });
    startPetTask();
    startFetchPendingJoinsTask();
    startRejoinDisconnectedChannelsTask();
  }
    startSyncPlusUsersTask();
  startDiscordPresenceTask();
  startCheckNewAuthUsersTask();
};

module.exports = {
  dailyCookieResetTask,
  startPetTask,
  startFetchPendingJoinsTask,
  startRejoinDisconnectedChannelsTask,
  startDiscordPresenceTask,
  startCheckNewAuthUsersTask,
  startSyncPlusUsersTask,
  startAllTasks,
};
