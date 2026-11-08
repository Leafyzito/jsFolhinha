const { chatModeration, botModerated } = require("../../../metrics");

module.exports = function onTimeout(channel, user, duration) {
  const type = duration != null ? "timeout" : "ban";
  chatModeration.inc({ channel: channel.toLowerCase(), type });

  if (user === process.env.BOT_USERNAME) {
    botModerated.inc({ type });
    fb.discord.importantLog(
      `* ${
        duration != null
          ? `Tomei timeout em #${channel} por ${duration} segundos`
          : `Fui banido em #${channel}`
      }`
    );
  }
};
