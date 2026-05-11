const {
  replyMentionListener,
  notifyDevMentionListener,
} = require("./mention.js");
const { afkUserListener } = require("./afk.js");
const { reminderListener } = require("./reminder.js");
const { updateUserListener } = require("./update-user.js");
const { emoteStreakListener } = require("./emote-streak.js");

function listenerHandler(message) {
  notifyDevMentionListener(message).catch((err) => {
    console.error(`Error in notify dev mention listener: ${err}`);
    fb.discord.log(`* Error in notify dev mention listener: ${err}`);
  });

  if (message.senderUsername == process.env.BOT_USERNAME) {
    return;
  }

  replyMentionListener(message).catch((err) => {
    console.error(`Error in reply mention listener: ${err}`);
    fb.discord.log(`* Error in reply mention listener: ${err}`);
  });

  // if (process.env.NODE_ENV !== "prod") {
  //   return;
  // }

  emoteStreakListener(message).catch((err) => {
    console.error(`Error in emote streak listener: ${err}`);
    fb.discord.log(`* Error in emote streak listener: ${err}`);
  });

  afkUserListener(message).catch((err) => {
    console.error(`Error in afk listener: ${err}`);
    fb.discord.log(`* Error in afk listener: ${err}`);
  });

  reminderListener(message).catch((err) => {
    console.error(`Error in reminder listener: ${err}`);
    fb.discord.log(`* Error in reminder listener: ${err}`);
  });

  updateUserListener(message).catch((err) => {
    console.error(`Error in update user listener: ${err}`);
    fb.discord.log(`* Error in update user listener: ${err}`);
  });
}

module.exports = {
  listenerHandler,
};
