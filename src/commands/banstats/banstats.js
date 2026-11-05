const path = require("path");

async function getBanStats(userid) {
  // Query for total timeout duration (sum of all extra_tags['ban-duration']) for the user
  const timeoutsSumRes = await fb.clickhouse.query(
    `
      SELECT 
        SUM(CAST(extra_tags['ban-duration'], 'Int64')) AS total_duration, 
        COUNT(*) AS count 
      FROM message_structured 
      WHERE user_id = {userId:String}
        AND has(extra_tags, 'target-user-id')
        AND has(extra_tags, 'ban-duration')
    `,
    { userId: userid }
  );

  // Query for number of bans for the user (without ban-duration)
  const bansCountRes = await fb.clickhouse.query(
    `
      SELECT COUNT(*) AS count FROM message_structured 
      WHERE user_id = {userId:String}
      AND has(extra_tags, 'target-user-id')
      AND NOT has(extra_tags, 'ban-duration')
    `,
    { userId: userid }
  );

  const bans = parseInt(
    (bansCountRes.data && bansCountRes.data[0]?.count) || 0
  );
  const timeouts = parseInt(
    (timeoutsSumRes.data && timeoutsSumRes.data[0]?.count) || 0
  );
  const timeoutsDuration = parseInt(
    (timeoutsSumRes.data && timeoutsSumRes.data[0]?.total_duration) || 0
  );

  return {
    bans,
    timeouts,
    timeoutsDuration, // total seconds of timeout
  };
}

function humanizedTime(seconds) {
  seconds = Number(seconds);
  if (isNaN(seconds) || seconds < 1) return "0s";

  const units = [
    { label: "d", secs: 86400 },
    { label: "h", secs: 3600 },
    { label: "m", secs: 60 },
    { label: "s", secs: 1 },
  ];

  const result = [];

  for (const { label, secs } of units) {
    if (seconds >= secs) {
      const val = Math.floor(seconds / secs);
      result.push(`${val}${label}`);
      seconds -= val * secs;
    }
  }

  // If for some reason nothing collected (0s)
  if (result.length === 0) return "0s";
  return result.join(" ");
}

const banStatsCommand = async (message) => {
  const bansTarget =
    message.args[1]?.replace(/^@/, "") || message.senderUsername;
  const bansTargetId = (await fb.api.helix.getUserByUsername(bansTarget))?.id;
  if (!bansTargetId) {
    return {
      reply: "Esse usuário não existe",
    };
  }

  if (await fb.utils.isOptedOut(bansTargetId, "banstats", message.senderUserID)) {
    return {
      reply: fb.utils.optoutReply,
    };
  }

  const banStats = await getBanStats(bansTargetId);

  return {
    reply: `🔨 ${bansTarget} foi banido ${
      banStats.bans
    } vezes e levou timeout ${banStats.timeouts} vezes ${
      banStats.timeouts > 0
        ? `(somando ${humanizedTime(banStats.timeoutsDuration)})`
        : ""
    } em todos os canais logados`,
  };
};

banStatsCommand.commandName = "banstats";
banStatsCommand.aliases = ["banstats", "bans"];
banStatsCommand.shortDescription =
  "Veja quantos bans/timeouts registrados você tem nos canais com o bot";
banStatsCommand.cooldown = 5000;
banStatsCommand.cooldownType = "channel";
banStatsCommand.whisperable = true;
banStatsCommand.optoutable = true;
banStatsCommand.description = `Veja quantos bans e/ou timeouts você (ou um usuário fornecido) tem registrados em todos os canais onde o bot está`;
banStatsCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  banStatsCommand,
  getBanStats,
  humanizedTime,
};
