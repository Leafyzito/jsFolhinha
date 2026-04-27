const petAttentionTask = require("./pet-attention-warn");
const fetchPendingJoins = require("./fetch-pending-joins");
const rejoinDisconnectedChannels = require("./rejoin-disconnected-channels");
const updateDiscordPresence = require("./update-discord-presence");
const checkNewAuthUsers = require("./check-new-auth-users");

function startPetTask() {
  setInterval(() => petAttentionTask(), 60_000);
}

function startFetchPendingJoinsTask() {
  setInterval(() => fetchPendingJoins(), 10_000);
}

function startRejoinDisconnectedChannelsTask() {
  setInterval(() => rejoinDisconnectedChannels(), 30_000);
}

function startDiscordPresenceTask() {
  setInterval(() => updateDiscordPresence(), 60_000);
}

function startCheckNewAuthUsersTask() {
  setInterval(() => checkNewAuthUsers(), 30_000); // 30 seconds
}

module.exports = {
  startPetTask,
  startFetchPendingJoinsTask,
  startRejoinDisconnectedChannelsTask,
  startDiscordPresenceTask,
  startCheckNewAuthUsersTask,
};
