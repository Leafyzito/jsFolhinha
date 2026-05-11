// <reference path="./types/global.d.ts" />
require("dotenv").config();

// IMPORTS
const { fetchData } = require("./src/utils/got-wrapper");
const { loadCommands } = require("./src/commands/commandsList");
const { loadReminders } = require("./src/handlers/listener/reminder");

// GLOBAL FB OBJECT SETUP
// Initialize fb object first, before any other modules
// This makes fb available globally (fb.*) and also as global.fb.*
global.fb = global.fb || {};
const fb = global.fb;

// Ensure fb is available globally for all modules
global.fb = fb;

// Add custom got function to fb
fb.got = fetchData;

// FB PROPERTIES INITIALIZATION
// Add initialization status tracking
fb.isReady = false;
fb.startTime = Math.floor(Date.now() / 1000);
fb.readyCallbacks = [];

// Initialize all fb properties upfront so they're available globally from the start
fb.utils = null;
fb.emotes = null;
fb.db = null;
fb.log = null;
fb.api = {};
fb.twitch = null;
fb.discord = null;
fb.clickhouse = null;
fb.notifiedUsers = new Set(); // Cache to track users who have been notified about reminders
fb.commandsList = null;

// FB UTILITY FUNCTIONS
// Function to mark fb as ready
fb.markReady = () => {
  fb.isReady = true;
  fb.readyCallbacks.forEach((callback) => callback());
  fb.readyCallbacks = [];
};

// MAIN INITIALIZATION FUNCTION
async function initializeApp() {
  try {
    console.log("* Starting application initialization...");

    // Initialize all utility instances first
    const { utils, emotes, db, log } =
      await require("./src/utils/init").initializeUtilities();
    fb.utils = utils;
    fb.emotes = emotes;
    fb.db = db;
    fb.log = log;

    console.log("* Utilities initialized");

    await fb.emotes.getGlobalEmotes();
    console.log("* Global emotes initialized");

    // Initialize Auth Provider
    fb.authProvider =
      await require("./src/utils/init").initializeAuthProvider();
    console.log("* Twurple Auth provider initialized");

    // Initialize APIs
    fb.api = await require("./src/utils/init").initializeAPIs();
    console.log("* APIs initialized");

    // Initialize API Client
    fb.api.twurple = await require("./src/utils/init").initializeApiClient();
    console.log("* Twurple API client initialized");

    // Initialize clients
    fb.discord = await require("./src/utils/init").initializeDiscord();
    console.log("* Discord client initialized");

    fb.twitch = await require("./src/utils/init").initializeTwitch();
    console.log("* Twitch client initialized");

    fb.twitch.eventSub =
      await require("./src/utils/init").initializeEventSubListener();
    console.log("* EventSub listener initialized");

    fb.clickhouse = await require("./src/utils/init").initializeClickHouse();
    console.log("* ClickHouse client initialized");

    // Load commands
    fb.commandsList = loadCommands();
    console.log("* Commands loaded");

    // Load and process reminders (handle missed and schedule future ones)
    await loadReminders();
    console.log("* Reminders loaded");

    // Mark fb as ready
    fb.markReady = true;
    console.log("* fb object is now ready");

    // Start recurring tasks
    const { startAllTasks } = require("./src/tasks/index");
    startAllTasks();

    // Start api server
    const apiServer = require("./src/utils/api-server");
    fb.apiServer = new apiServer();
    fb.apiServer.start();

    fb.totalCommandsUsed = await fb.db.count("commandlog", {}, true);

    fb.discord.log("* Application initialization complete!");
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
}

// Start the initialization process
initializeApp();

module.exports = { fb };
