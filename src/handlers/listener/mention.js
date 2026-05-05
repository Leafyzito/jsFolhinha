const { shouldSkipMessage } = require("./middleware");
const lastReplyTime = {};

// Bot name constants
const BOT_NAMES = ["folhinha", "folhinhabot", "@folhinhabot", "@folhinhabot,"];
const GREETINGS = ["oi", "ola", "olá", "opa", "oioi"];
const GREETING_EMOTES = ["peepohey", "peeposhy", "eba", "ola"];

// Helper functions
const isBotMention = (word) =>
  BOT_NAMES.some((name) => word.toLowerCase() === name.toLowerCase());

const containsBotMention = (words) => words.some((word) => isBotMention(word));

const findNonBotWord = (words) => words.find((word) => !isBotMention(word));

const isGreeting = (word) => GREETINGS.includes(word.toLowerCase());

const updateLastReplyTime = (channelName, currentTime) => {
  lastReplyTime[channelName] = currentTime;
};

const replyMentionListener = async (message) => {
  if (await shouldSkipMessage(message)) {
    return;
  }

  if (message.prefixes?.some((p) => message.messageText.startsWith(p))) {
    return;
  }

  // Check if the last reply was less than 15 seconds ago to avoid spam
  const currentTime = Date.now();
  const timeDifference = currentTime - lastReplyTime[message.channelName];
  if (timeDifference < 15_000) {
    return;
  }

  const msgContent = message.messageText.split(" ");

  // Skip if this is a reply to another message
  if (message.isReply) {
    return;
  }

  // Handle single word mentions (just bot name)
  if (msgContent.length === 1 && isBotMention(msgContent[0])) {
    const channelEmotes =
      (await fb.emotes.getChannelEmotes(message.channelName)) || [];
    const emote =
      channelEmotes.length > 0
        ? fb.utils.randomChoice(channelEmotes)
        : "KonCha";

    fb.log.send(message.channelName, `${message.displayName} ${emote}`);
    updateLastReplyTime(message.channelName, currentTime);
    return;
  }

  // Handle two word mentions
  if (msgContent.length === 2 && containsBotMention(msgContent)) {
    const otherWord = findNonBotWord(msgContent);

    // Handle greetings
    if (isGreeting(otherWord)) {
      const emote = await fb.emotes.getEmoteFromList(
        message.channelName,
        GREETING_EMOTES,
        "KonCha"
      );

      fb.log.send(message.channelName, `Oioi ${message.displayName} ${emote}`);
      updateLastReplyTime(message.channelName, currentTime);
      return;
    }

    // Handle emotes or random emotes
    const channelEmotes = await fb.emotes.getChannelEmotes(message.channelName);
    const finalWord = channelEmotes?.some((emote) => emote === otherWord)
      ? otherWord
      : channelEmotes?.length > 0
        ? fb.utils.randomChoice(channelEmotes)
        : "KonCha";

    fb.log.send(message.channelName, `${message.displayName} ${finalWord}`);
    updateLastReplyTime(message.channelName, currentTime);
    return;
  }
};

const notifyDevMentionListener = async (message) => {
  const possibleDevMentions = process.env.DEV_POSSIBLE_MENTIONS.split(",");
  if (
    message?.replyParentUserID == process.env.DEV_USERID ||
    message.originalMessageText
      .toLowerCase()
      .split(" ")
      .some((word) =>
        possibleDevMentions.some((mention) => {
          // Remove any non-alphanumeric characters from both the word and mention
          const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
          return cleanWord === mention.toLowerCase();
        })
      )
  ) {
    fb.discord.notifyDevMention(message);
  }
};

module.exports = {
  replyMentionListener,
  notifyDevMentionListener,
};
