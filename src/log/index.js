class Logger {
  constructor() {
    this.channelMsgCooldowns = new Map(); // Track last message timestamp per channel
  }

  async manageChannelMsgCooldown(channel) {
    // universal cooldown for all channels to avoid timeouts

    // Parallelize bot status checks for better performance
    const [isBotMod, isBotVip] = await Promise.all([
      fb.utils.isBotMod(channel),
      fb.utils.isBotVip(channel),
    ]);

    if (isBotMod || isBotVip) {
      return;
    }

    const now = Date.now();
    const lastMessageTime = this.channelMsgCooldowns.get(channel) || 0;
    const timeSinceLastMessage = now - lastMessageTime;

    if (timeSinceLastMessage < 2000) {
      // 2 seconds cooldown
      await new Promise((resolve) =>
        setTimeout(resolve, 2000 - timeSinceLastMessage)
      );
    }

    this.channelMsgCooldowns.set(channel, Date.now());
  }

  // handle send errors
  handleSendError(
    err,
    channel,
    content,
    retryMethod,
    retryCount = 0,
    lastResortWhisperTarget = null
  ) {
    // console.log('handleSendError: ', err);

    // Handle identical message error - no retries needed
    if (err.message.includes("identical to the previous one")) {
      console.log("sending identical message error, ending here");
      return;
    }

    // Check if we've hit max retries
    if (retryCount >= 3) {
      // send whisper to user as last resort
      if (lastResortWhisperTarget) {
        console.log("Max retries reached, whispering response to user");
        fb.discord.log(
          `* Dropped message in #${channel}, whispering response to ${lastResortWhisperTarget}: ${content}`
        );
        fb.api.helix.whisper(lastResortWhisperTarget, content);
        return;
      }
      console.log("Max retries reached, dropping message");
      fb.discord.log(`* Dropped message in #${channel}: ${content}`);
      return;
    }

    // Handle retryable errors
    const isRetryableError =
      err.message.includes("too quickly") ||
      err.message.includes("waiting for response");
    const errorType = err.message.includes("too quickly")
      ? "sending messages too quickly"
      : "waiting for response";

    if (isRetryableError) {
      console.log(`${errorType} error, retrying (${retryCount + 1}/3)`);
      setTimeout(() => {
        retryMethod(channel, content, retryCount + 1, lastResortWhisperTarget);
      }, 1500);
      return;
    }

    // Handle any other errors
    console.log("send error: ", err);
  }

  async createCommandLog(message, response, sentVia = null) {
    const insertDoc = {
      messageid: message.id,
      sentDate: message.serverTimestamp,
      channel: message.channelName,
      channelId: message.channelID || null,
      user: message.senderUsername,
      userId: message.senderUserID,
      command: message.command.commandName,
      aliasUsed: message.aliasUsed,
      custom: message.command?.custom ?? false,
      content: message.messageText,
      response: response,
      notes: message.notes || null,
    };

    console.log(
      `#${message.channelName}/${message.senderUsername} - ${message.command.commandName}`
    );
    fb.discord.logCommand(message, response, sentVia);
    if (!message.command.flags?.includes("dev") && process.env.ENV == "prod") {
      fb.db.insert("commandlog", insertDoc).catch((err) => {
        fb.discord.importantLog(
          `Failed to insert commandlog: ${message.command.commandName} (#${message.channelName}/${message.senderUsername}): ${err.message}`
        );
        console.error("commandlog insert error:", err);
      });
    }
  }

  async logAndReply(message, response, retryCount = 0) {
    response = fb.utils.checkRegex(response, message.channelName, message);

    let res;
    if (message.isWhisper || message.channelName == "whisper") {
      fb.api.helix.whisper(message.senderUserID, response);
    } else {
      await this.manageChannelMsgCooldown(message.channelID);
      res = await fb.twitch.client
        .say(message.channelName, message.channelID, response, message.id)
        .catch((err) =>
          this.handleSendError(
            err,
            message.channelName,
            response,
            (channel, content, retryCount, senderUsername) =>
              this.send(channel, content, retryCount, senderUsername),
            retryCount,
            message.senderUserID
          )
        );
    }
    // Log asynchronously (non-blocking) after sending response
    this.createCommandLog(message, response, res?.sentVia).catch((err) => {
      console.error("Failed to create command log:", err);
    });
  }

  async logAndSay(message, response, notes = null, retryCount = 0) {
    message.notes = notes;
    response = fb.utils.checkRegex(response, message.channelName, message);

    await this.manageChannelMsgCooldown(message.channelID);
    const res = await fb.twitch.client
      .say(message.channelName, message.channelID, response, null)
      .catch((err) =>
        this.handleSendError(
          err,
          message.channelName,
          response,
          (channel, content, retryCount, senderUsername) =>
            this.send(channel, content, retryCount, senderUsername),
          retryCount,
          message.senderUserID
        )
      );

    // Log asynchronously (non-blocking) after sending response
    this.createCommandLog(message, response, res.sentVia).catch((err) => {
      console.error("Failed to create command log:", err);
    });
  }

  async logAndMeAction(message, response, retryCount = 0) {
    response = fb.utils.checkRegex(response, message.channelName, message);

    await this.manageChannelMsgCooldown(message.channelID);
    const res = await fb.twitch.client
      .say(message.channelName, message.channelID, "/me " + response, null)
      .catch((err) =>
        this.handleSendError(
          err,
          message.channelName,
          response,
          (channel, content, retryCount, senderUsername) =>
            this.send(channel, content, retryCount, senderUsername),
          retryCount,
          message.senderUserID
        )
      );

    // Log asynchronously (non-blocking) after sending response
    this.createCommandLog(message, "/me " + response, res.sentVia).catch(
      (err) => {
        console.error("Failed to create command log:", err);
      }
    );
  }

  async logAndWhisper(message, response, notes = null) {
    message.notes = notes;
    response = fb.utils.checkRegex(response, message.senderUsername, message);

    fb.api.helix.whisper(message.senderUserID, response);
    fb.discord.logWhisper(message.senderUsername, response);
  }

  async send(channel, content, retryCount = 0, senderUsername = null) {
    content = fb.utils.checkRegex(content, channel);

    await this.manageChannelMsgCooldown(channel);
    const res = await fb.twitch.client
      .say(channel, null, content)
      .catch((err) =>
        this.handleSendError(
          err,
          channel,
          content,
          (channel, content, retryCount, senderUsername) =>
            this.send(channel, content, retryCount, senderUsername),
          retryCount,
          senderUsername
        )
      );

    fb.discord.logSend(channel, content, res.sentVia);
  }

  async reply(message, response, retryCount = 0) {
    response = fb.utils.checkRegex(response, message.channelName, message);

    await this.manageChannelMsgCooldown(message.channelID);
    const res = await fb.twitch.client
      .say(message.channelName, message.channelID, response, message.id)
      .catch((err) =>
        this.handleSendError(
          err,
          message.channelName,
          response,
          (channel, content, retryCount, senderUsername) =>
            this.send(channel, content, retryCount, senderUsername),
          retryCount,
          message.senderUserID
        )
      );

    fb.discord.logSend(message.channelName, response, res.sentVia);
  }

  async whisper(targetUserId, content, retryCount = 0) {
    content = fb.utils.checkRegex(content, targetUserId);

    fb.api.helix
      .whisper(targetUserId, content)
      .catch((err) =>
        this.handleSendError(
          err,
          targetUserId,
          content,
          this.whisper.bind(this),
          retryCount,
          null
        )
      );

    fb.discord.logWhisper(targetUserId, content);
  }
}

module.exports = Logger;
