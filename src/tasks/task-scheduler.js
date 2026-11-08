const petAttentionTask = require("./pet-attention-warn");
const fetchPendingJoins = require("./fetch-pending-joins");
const rejoinDisconnectedChannels = require("./rejoin-disconnected-channels");
const updateDiscordPresence = require("./update-discord-presence");
const checkNewAuthUsers = require("./check-new-auth-users");
const syncPlusUsers = require("./sync-plus-users");
const { runTask } = require("../metrics");

function startPetTask() {
  setInterval(() => runTask("pet", petAttentionTask), 60_000);
}

function startFetchPendingJoinsTask() {
  setInterval(() => runTask("pending_joins", fetchPendingJoins), 10_000);
}

function startRejoinDisconnectedChannelsTask() {
  setInterval(
    () => runTask("rejoin", rejoinDisconnectedChannels),
    30_000
  );
}

function startDiscordPresenceTask() {
  setInterval(
    () => runTask("discord_presence", updateDiscordPresence),
    60_000
  );
}

function startCheckNewAuthUsersTask() {
  setInterval(() => runTask("new_auth_users", checkNewAuthUsers), 30_000);
}

function startSyncPlusUsersTask() {
  setInterval(() => runTask("plus_sync", syncPlusUsers), 60_000);
}

module.exports = {
  startPetTask,
  startFetchPendingJoinsTask,
  startRejoinDisconnectedChannelsTask,
  startDiscordPresenceTask,
  startCheckNewAuthUsersTask,
  startSyncPlusUsersTask,
};
