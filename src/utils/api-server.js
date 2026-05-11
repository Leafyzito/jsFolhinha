const express = require("express");
const { createRateLimiter } = require("./rateLimit/index.js");
const { getWrapped } = require("./wrapped.js");
class ApiServer {
  constructor() {
    this.app = express();
    this.port = process.env.STATUS_PORT || 3323;

    // Create rate limiter for status endpoint
    this.rateLimiter = createRateLimiter();

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Apply rate limiting to all routes
    this.app.use(this.rateLimiter.createMiddleware());
  }

  setupRoutes() {
    // Root endpoint with detailed status information
    this.app.get("/", (req, res) => {
      const uptime =
        Math.floor(Date.now() / 1000) - (global.fb?.startTime || 0);

      res.status(200).json({
        status: "running",
        uptime: uptime,
        uptimeHumanized: fb.utils.relativeTime(fb.startTime, true),
        startTime: global.fb?.startTime || null,
        connectedChannels: fb.twitch.anonClient.currentChannels.length || 0,
        // channelsToJoin: [...fb.twitch.anonClient.channelsToJoin].length || 0,
        stats: {
          totalCommandsUsed: fb.totalCommandsUsed,
          totalChannels: fb.twitch.anonClient.currentChannels.length || 0,
          //totalChannels: [...fb.twitch.anonClient.channelsToJoin].length || 0,
        },
      });
    });

    this.app.get("/commands", (req, res) => {
      if (!fb.commandsList) {
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // Build an array of command info, ensure unique by commandName
      const commandsSeen = new Set();
      const commandsDetailed = Object.entries(fb.commandsList)
        .map(([commandName, info]) => ({
          commandName,
          ...info,
        }))
        .filter((cmd) => {
          if (commandsSeen.has(cmd.commandName)) return false;
          commandsSeen.add(cmd.commandName);
          return true;
        });

      res.status(200).json({ commands: commandsDetailed });
    });

    this.app.get("/plus", async (req, res) => {
      let dev = await fb.db.get("users", { userid: process.env.DEV_USERID }, true);
      if (dev && !Array.isArray(dev)) {
        dev = [dev];
      }
      let devUsers = [];
      if (dev) {
        devUsers = dev.map((user) => ({
          userid: user.userid,
          currAlias: user.currAlias,
        }));
      }

      const adminUserIds = process.env.ADMIN_USERIDS && process.env.ADMIN_USERIDS.startsWith("[")
        ? JSON.parse(process.env.ADMIN_USERIDS)
        : process.env.ADMIN_USERIDS.split(",");
      let admins = await fb.db.get("users", { userid: { $in: adminUserIds } }, true);
      if (admins && !Array.isArray(admins)) {
        admins = [admins];
      }
      let adminUsers = [];
      if (admins) {
        adminUsers = admins.map((user) => ({
          userid: user.userid,
          currAlias: user.currAlias,
        }));
      }

      let plus = await fb.db.get("users", { isPlus: true }, true);
      if (plus && !Array.isArray(plus)) {
        plus = [plus];
      }
      let plusUsers = [];
      if (plus) {
        plusUsers = plus.map((user) => ({
          userid: user.userid,
          currAlias: user.currAlias,
          isFounder: !!user.plusFounder,
        }));
      }

      let supporters = await fb.db.get("users", { isSupporter: true, isPlus: false }, true);
      if (supporters && !Array.isArray(supporters)) {
        supporters = [supporters];
      }
      let supporterUsers = [];
      if (supporters) {
        supporterUsers = supporters.map((user) => ({
          userid: user.userid,
          currAlias: user.currAlias,
        }));
      }

      res.status(200).json({ dev: devUsers, admins: adminUsers, plus: plusUsers, supporters: supporterUsers });
    });

    this.app.get("/wrapped/:username", async (req, res) => {
      try {
        if (!req.params.username) {
          return res.status(400).json({ error: "Username is required" });
        }

        const wrapped = await getWrapped(req.params.username);
        if (wrapped.statusCode == 404) {
          return res.status(404).json({ error: wrapped.errorMessage });
        }

        return res.status(200).json(wrapped);
      } catch (error) {
        console.error("Error in /wrapped/:username:", error);
        fb.discord.logError(
          `Error in /wrapped/:username (${req.params.username || ""}): ${error}`
        );
        return res.status(500).json({ error: "Internal Server Error" });
      }
    });
  }

  start() {
    this.server = this.app.listen(this.port, "0.0.0.0", () => {
      console.info(`* API server running on port ${this.port}`);
      console.info(`* API endpoint: http://0.0.0.0:${this.port}/`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => this.shutdown());
    process.on("SIGINT", () => this.shutdown());
  }

  shutdown() {
    if (this.server) {
      console.info("* Shutting down API server...");
    }
    // Force exit
    process.exit(0);
  }
}

module.exports = ApiServer;
