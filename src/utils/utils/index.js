const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
require("dayjs/locale/pt"); // Import Portuguese locale

dayjs.extend(relativeTime);
dayjs.locale("pt"); // Set locale globally

const { CreateRegex } = require("../../extras/Regex.js");

const regexObj = new CreateRegex();

class Utils {
  sanitizeOtherPrefixes(input) {
    // Remove common command prefixes from the beginning of input
    return input.replace(/^[$*!|+?%=&/#.,<>@⠀\-_\\]+/, "");
  }

  validPrefixes() {
    return [
      "!",
      "?",
      "&",
      "%",
      "+",
      "*",
      "-",
      "=",
      "|",
      "@",
      "#",
      "$",
      "~",
      "\\",
      "_",
      ",",
      ";",
      "<",
      ">",
    ];
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  relativeTime(input, returnOnlyTime = false, compact = true) {
    let date;

    // Handle string numbers (e.g., "1725892920" or "1716003627.455552")
    if (typeof input === "string" && /^\d+(\.\d+)?$/.test(input)) {
      input = Number(input);
    }

    if (typeof input === "number") {
      // Detect if it's in seconds or milliseconds
      date =
        input.toString().length === 10 ||
        (input.toString().includes(".") && input < 1e12)
          ? dayjs.unix(Math.floor(input)) // seconds (floor to remove decimal part)
          : dayjs(input); // milliseconds
    } else {
      // This will handle Date objects and ISO date strings
      date = dayjs(input);
    }

    if (!compact) {
      // Default full format ("há 2 dias", "em 1 hora", etc.)
      return date.fromNow();
    }

    // Compact format logic with support for days, months, and years
    const now = dayjs();
    const isFuture = date.isAfter(now);
    let diff = Math.abs(now.diff(date, "second")); // difference in seconds

    const units = [];

    // Calculate years
    const years = Math.floor(diff / (365 * 24 * 3600));
    if (years > 0) {
      units.push(`${years}a`);
      diff -= years * 365 * 24 * 3600;
    }

    // Calculate months (approximate, using 30 days)
    const months = Math.floor(diff / (30 * 24 * 3600));
    if (months > 0) {
      units.push(`${months}me`);
      diff -= months * 30 * 24 * 3600;
    }

    // Calculate weeks (7 days)
    const weeks = Math.floor(diff / (7 * 24 * 3600));
    if (weeks > 0) {
      units.push(`${weeks}se`);
      diff -= weeks * 7 * 24 * 3600;
    }

    // Calculate days
    const days = Math.floor(diff / (24 * 3600));
    if (days > 0) {
      units.push(`${days}d`);
      diff -= days * 24 * 3600;
    }

    // Calculate hours
    const hours = Math.floor(diff / 3600);
    if (hours > 0) {
      units.push(`${hours}h`);
      diff -= hours * 3600;
    }

    // Calculate minutes
    const minutes = Math.floor(diff / 60);
    if (minutes > 0) {
      units.push(`${minutes}m`);
      diff -= minutes * 60;
    }

    // Calculate seconds (only if no other units or if it's a very short time)
    const seconds = diff;
    if (
      units.length === 0 ||
      (years === 0 &&
        months === 0 &&
        weeks === 0 &&
        days === 0 &&
        hours === 0 &&
        minutes === 0)
    ) {
      units.push(`${seconds}s`);
    }

    if (returnOnlyTime) {
      return units.join(" ");
    }

    return `${isFuture ? "em" : "há"} ${units.join(" ")}`;
  }

  unix(date = new Date()) {
    return Math.floor(date.getTime() / 1000);
  }

  // Centralized whisper waiting system
  whisperWaiters = new Map();

  waitForWhisper(check, timeout = 30_000) {
    const waiterId = `${check.channelName}_${
      check.senderUsername || "any"
    }_${Date.now()}`;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.whisperWaiters.delete(waiterId);
        resolve(null);
      }, timeout);

      // Store the waiter with its check criteria
      this.whisperWaiters.set(waiterId, {
        check,
        resolve,
        timer,
      });
    });
  }

  // New function to wait for multiple whispers from different users
  async waitForMultipleWhispers(checks, timeout = 30_000) {
    const results = {};
    const pendingChecks = new Map();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        // Clean up any remaining waiters
        for (const [, waiter] of pendingChecks) {
          clearTimeout(waiter.timer);
        }
        resolve(results);
      }, timeout);

      // Create a waiter for each check
      checks.forEach((check, index) => {
        const waiterId = `multi_whisper_${
          check.senderUserID || check.senderUsername || "any"
        }_${index}_${Date.now()}`;

        const waiter = {
          check,
          resolve: (msg) => {
            // Store the result
            const key =
              check.senderUserID || check.senderUsername || `player_${index}`;
            results[key] = msg;

            // Remove this waiter
            pendingChecks.delete(waiterId);

            // Check if all checks are complete
            if (pendingChecks.size === 0) {
              clearTimeout(timer);
              resolve(results);
            }
          },
          timer: null, // Will be set by the multi-whisper waiter system
        };

        pendingChecks.set(waiterId, waiter);
      });

      // Store the multi-whisper waiter in a special map
      if (!this.multiWhisperWaiters) {
        this.multiWhisperWaiters = new Map();
      }

      const multiWaiterId = `multi_whisper_${Date.now()}`;
      this.multiWhisperWaiters.set(multiWaiterId, {
        pendingChecks,
        timer,
        resolve,
      });
    });
  }

  // Method to check if a whisper matches any waiting criteria
  checkWhisperWaiters(msg) {
    // Check multi-whisper waiters first
    if (this.multiWhisperWaiters) {
      for (const [, multiWaiter] of this.multiWhisperWaiters) {
        const { pendingChecks } = multiWaiter;

        for (const [, waiter] of pendingChecks) {
          const { check, resolve } = waiter;

          // Check if all specified conditions are met
          let shouldResolve = true;

          // Check sender user ID if specified
          if (check.senderUserID && msg.senderUserID !== check.senderUserID) {
            shouldResolve = false;
          }

          // Check sender username if specified (for backward compatibility)
          if (
            check.senderUsername &&
            msg.senderUsername !== check.senderUsername
          ) {
            shouldResolve = false;
          }

          // Check message content if specified
          if (check.content && check.content.length > 0) {
            const messageMatches = check.content.some(
              (content) =>
                msg.messageText.toLowerCase().trim() ===
                content.toLowerCase().trim()
            );
            if (!messageMatches) {
              shouldResolve = false;
            }
          }

          if (shouldResolve) {
            resolve(msg);
            break; // Only resolve one waiter per message
          }
        }
      }
    }

    // Check regular single whisper waiters
    for (const [waiterId, waiter] of this.whisperWaiters) {
      const { check, resolve, timer } = waiter;

      const matches =
        (check.senderUsername &&
          msg.senderUsername === check.senderUsername &&
          msg.channelName === check.channelName &&
          check.content.some(
            (content) => msg.messageText.toLowerCase() === content.toLowerCase()
          )) ||
        (!check.senderUsername &&
          msg.channelName === check.channelName &&
          check.content.some(
            (content) => msg.messageText.toLowerCase() === content.toLowerCase()
          ));

      if (matches) {
        clearTimeout(timer);
        this.whisperWaiters.delete(waiterId);
        resolve(msg);
        return true;
      }
    }
    return false;
  }

  async manageLongResponse(content, sendOnlyLink = false) {
    const gist = await fb.api.github.createGist(content);
    // const raw_url = gist.raw_url;
    const gistLen = gist.length;
    const maxContentLength = 480 - gistLen - 10;
    // limit the response to 500 characters, including the gist, add gist link to end of it
    const truncatedContent = content.substring(0, maxContentLength);
    const response = `${truncatedContent}... ${gist}`;
    console.log(response);

    return sendOnlyLink ? gist : response;
  }

  checkRegex(content, channelName, message = null) {
    const result = regexObj.check(content, content.split(" "), channelName);
    if (result.caught) {
      console.log(
        `* Caught by ${result.caughtCategory} (${result.matchedWord}) - original content: ${content}`
      );
      fb.discord.importantLog(
        `* Caught by ${result.caughtCategory} (${result.matchedWord}) in #${channelName} - original content: ${content}`
      );
      if (message) {
        if (!message.notes) {
          message.notes = "";
        }
        message.notes =
          message.notes +
          `Caught by: ${result.caughtCategory} (${result.matchedWord}) - Original content: ${content}`;
      }
      content =
        "⚠️ Mensagem retida por conter conteúdo banido, tente novamente ou mude um pouco o comando";
    }
    return content;
  }

  async createNewChannelConfig(channelId) {
    // first check if config already exists
    const config = await fb.db.get("config", { channelId: channelId });
    if (config) {
      fb.discord.importantLog(
        `* Tried to create duplicate config for channelId ${channelId}`
      );
      return;
    }

    const channelName = (await fb.api.helix.getUserByID(channelId)).login;
    const newConfig = {
      channel: channelName,
      channelId: channelId,
      prefix: ["!"],
      offlineOnly: false,
      emoteStreak: false,
      isPaused: false,
      disabledCommands: [],
      devBanCommands: [],
      thankFollows: false,
      thankSubs: false,
      // customMessages is optional and will be undefined by default
    };

    await fb.db.insert("config", newConfig);
    await fb.api.rustlog.addChannel(channelId);
  }

  // Centralized message waiting system
  messageWaiters = new Map();

  async waitForMessage(check, timeout = 30_000) {
    const waiterId = `${check.channelName || "any"}_${
      check.senderUsername || "any"
    }_${check.senderUserID || "any"}_${Date.now()}`;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.messageWaiters.delete(waiterId);
        resolve(null);
      }, timeout);

      // Store the waiter with its check criteria
      this.messageWaiters.set(waiterId, {
        check,
        resolve,
        timer,
      });
    });
  }

  // New function to wait for multiple messages from different users
  async waitForMultipleMessages(checks, timeout = 30_000) {
    const results = {};
    const pendingChecks = new Map();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        // Clean up any remaining waiters
        for (const [, waiter] of pendingChecks) {
          clearTimeout(waiter.timer);
        }
        resolve(results);
      }, timeout);

      // Create a waiter for each check
      checks.forEach((check, index) => {
        const waiterId = `multi_${check.channelName || "any"}_${
          check.senderUsername || "any"
        }_${check.senderUserID || "any"}_${index}_${Date.now()}`;

        const waiter = {
          check,
          resolve: (msg) => {
            // Store the result
            const key =
              check.senderUsername || check.senderUserID || `player_${index}`;
            results[key] = msg;

            // Remove this waiter
            pendingChecks.delete(waiterId);

            // Check if all checks are complete
            if (pendingChecks.size === 0) {
              clearTimeout(timer);
              resolve(results);
            }
          },
          timer: null, // Will be set by the multi-message waiter system
        };

        pendingChecks.set(waiterId, waiter);
      });

      // Store the multi-waiter in a special map
      if (!this.multiMessageWaiters) {
        this.multiMessageWaiters = new Map();
      }

      const multiWaiterId = `multi_${Date.now()}`;
      this.multiMessageWaiters.set(multiWaiterId, {
        pendingChecks,
        timer,
        resolve,
      });
    });
  }

  // Method to check if a message matches any waiting criteria
  checkMessageWaiters(msg) {
    if (msg.senderUserID == process.env.BOT_USERID) {
      return false;
    }
    // Check multi-message waiters first
    if (this.multiMessageWaiters) {
      for (const [, multiWaiter] of this.multiMessageWaiters) {
        const { pendingChecks } = multiWaiter;

        for (const [, waiter] of pendingChecks) {
          const { check, resolve } = waiter;

          // Check if all specified conditions are met
          let shouldResolve = true;

          // Check channel name if specified
          if (check.channelName && msg.channelName !== check.channelName) {
            shouldResolve = false;
          }

          // Check sender user ID if specified
          if (check.senderUserID && msg.senderUserID !== check.senderUserID) {
            shouldResolve = false;
          }

          // Check sender username if specified
          if (
            check.senderUsername &&
            msg.senderUsername !== check.senderUsername
          ) {
            shouldResolve = false;
          }

          // Check message content if specified
          if (check.content && check.content.length > 0) {
            const messageMatches = check.content.some(
              (content) =>
                msg.messageText.toLowerCase().trim() ===
                content.toLowerCase().trim()
            );
            if (!messageMatches) {
              shouldResolve = false;
            }
          }

          if (shouldResolve) {
            resolve(msg);
            break; // Only resolve one waiter per message
          }
        }
      }
    }

    // Check regular single message waiters
    for (const [waiterId, waiter] of this.messageWaiters) {
      const { check, resolve, timer } = waiter;

      // Check if all specified conditions are met
      let shouldResolve = true;

      // Check channel name if specified
      if (check.channelName && msg.channelName !== check.channelName) {
        shouldResolve = false;
      }

      // Check sender user ID if specified
      if (check.senderUserID && msg.senderUserID !== check.senderUserID) {
        shouldResolve = false;
      }

      // Check sender username if specified
      if (check.senderUsername && msg.senderUsername !== check.senderUsername) {
        shouldResolve = false;
      }

      // Check message content if specified
      if (check.content && check.content.length > 0) {
        const messageMatches = check.content.some(
          (content) =>
            msg.messageText.toLowerCase().trim() ===
            content.toLowerCase().trim()
        );
        if (!messageMatches) {
          shouldResolve = false;
        }
      }

      if (shouldResolve) {
        clearTimeout(timer);
        this.messageWaiters.delete(waiterId);
        resolve(msg);
        return true;
      }
    }
    return false;
  }

  async isBotMod(channelId, channelConfig = null) {
    try {
      // Check if broadcaster has authenticated
      const scopes =
        fb.authProvider.provider.getCurrentScopesForUser(channelId);
      const hasAuthenticated = scopes && scopes.length > 0;

      if (!hasAuthenticated) {
        // Broadcaster hasn't authenticated, can't check status
        return null;
      }

      // Use provided config or fetch it if not available
      const config =
        channelConfig || (await fb.db.get("config", { channelId: channelId }));
      if (!config) {
        // Config doesn't exist, status never checked
        return null;
      }

      // If value is explicitly false, bot is confirmed not mod
      if (config.botIsMod === false) {
        return false;
      }

      // If value is true, bot is confirmed mod
      if (config.botIsMod === true) {
        return true;
      }

      // Value is undefined or doesn't exist, status never checked
      return null;
    } catch {
      // console.error(`Error checking bot mod status for ${channelId}:`, error);
      return null;
    }
  }

  async isBotVip(channelId, channelConfig = null) {
    try {
      // Check if broadcaster has authenticated
      const scopes =
        fb.authProvider.provider.getCurrentScopesForUser(channelId);
      const hasAuthenticated = scopes && scopes.length > 0;

      if (!hasAuthenticated) {
        // Broadcaster hasn't authenticated, can't check status
        return null;
      }

      // Use provided config or fetch it if not available
      const config =
        channelConfig || (await fb.db.get("config", { channelId: channelId }));
      if (!config) {
        // Config doesn't exist, status never checked
        return null;
      }

      // If value is explicitly false, bot is confirmed not VIP
      if (config.botIsVip === false) {
        return false;
      }

      // If value is true, bot is confirmed VIP
      if (config.botIsVip === true) {
        return true;
      }

      // Value is undefined or doesn't exist, status never checked
      return null;
    } catch {
      // console.error(`Error checking bot VIP status for ${channelId}:`, error);
      return null;
    }
  }
}

module.exports = Utils;
