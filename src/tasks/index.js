// scheduled in main.js
const dailyCookieResetTask = require("./daily-cookie-reset");
const { runTask } = require("../metrics");

// recurring tasks
const {
  startPetTask,
  startFetchPendingJoinsTask,
  startRejoinDisconnectedChannelsTask,
  startDiscordPresenceTask,
  startCheckNewAuthUsersTask,
  startSyncPlusUsersTask,
  startCountCookiesTask,
} = require("./task-scheduler");

// Function to start all recurring tasks
const startAllTasks = () => {
  // Start recurring tasks
  if (process.env.ENV == "prod") {
    console.info("* Starting production tasks");
    const cron = require("node-cron");
    cron.schedule("0 9 * * *", async () => {
      await runTask("cookie_reset", dailyCookieResetTask);
    });
    startPetTask();
    startFetchPendingJoinsTask();
    startRejoinDisconnectedChannelsTask();
    startCountCookiesTask();
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
  startCountCookiesTask,
  startAllTasks,
};
