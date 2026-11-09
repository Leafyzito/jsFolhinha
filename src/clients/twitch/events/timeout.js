module.exports = function onTimeout(channel, user, duration) {
  const type = duration != null ? "timeout" : "ban";
  fb.metrics.chatModeration.inc({ channel: channel.toLowerCase(), type });

  if (user === process.env.BOT_USERNAME) {
    fb.metrics.botModerated.inc({ type });
    fb.discord.importantLog(
      `* ${
        duration != null
          ? `Tomei timeout em #${channel} por ${duration} segundos`
          : `Fui banido em #${channel}`
      }`,
    );
  }
};
