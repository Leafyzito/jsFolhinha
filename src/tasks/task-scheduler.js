const petAttentionTask = require("./pet-attention-warn");
const fetchPendingJoins = require("./fetch-pending-joins");
const rejoinDisconnectedChannels = require("./rejoin-disconnected-channels");
const updateDiscordPresence = require("./update-discord-presence");
const checkNewAuthUsers = require("./check-new-auth-users");
const syncPlusUsers = require("./sync-plus-users");
const countCookies = require("./count-cookies");

function startPetTask() {
  setInterval(() => fb.metrics.runTask("pet", petAttentionTask), 60_000);
}

function startFetchPendingJoinsTask() {
  setInterval(
    () => fb.metrics.runTask("pending_joins", fetchPendingJoins),
    10_000,
  );
}

function startRejoinDisconnectedChannelsTask() {
  setInterval(
    () => fb.metrics.runTask("rejoin", rejoinDisconnectedChannels),
    30_000,
  );
}

function startDiscordPresenceTask() {
  setInterval(
    () => fb.metrics.runTask("discord_presence", updateDiscordPresence),
    60_000,
  );
}

function startCheckNewAuthUsersTask() {
  setInterval(
    () => fb.metrics.runTask("new_auth_users", checkNewAuthUsers),
    30_000,
  );
}

function startSyncPlusUsersTask() {
  setInterval(() => fb.metrics.runTask("plus_sync", syncPlusUsers), 60_000);
}

// runs once right away so the gauge exists soon after a restart
function startCountCookiesTask() {
  const run = () => fb.metrics.runTask("count_cookies", countCookies);
  run();
  setInterval(run, 60_000);
}

module.exports = {
  startCountCookiesTask,
  startPetTask,
  startFetchPendingJoinsTask,
  startRejoinDisconnectedChannelsTask,
  startDiscordPresenceTask,
  startCheckNewAuthUsersTask,
  startSyncPlusUsersTask,
};
