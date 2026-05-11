const { commandHandler } = require("../../../handlers");

module.exports = function onWhisper(message) {
  message.prefix = "!";
  message.prefixes = ["!"];
  message.internalTimestamp = performance.now();
  message.serverTimestamp = new Date();
  message.serverTimestampRaw = new Date().getTime();
  message.channelName = "whisper";
  message.isWhisper = true;
  message.args = message.messageText.split(" ");

  for (const prefix of fb.utils.validPrefixes()) {
    if (message.messageText.startsWith(prefix)) {
      message.messageText = message.messageText.replace(prefix, message.prefix);
    }
  }

  // Check if this whisper matches any waiting criteria first
  fb.utils.checkWhisperWaiters(message);

  if (process.env.ENV == "prod") {
    commandHandler(message);
  }
  if (!message.messageText.startsWith(message.prefix)) {
    fb.discord.logWhisperFrom(message);
  }
};
