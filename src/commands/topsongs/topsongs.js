const { Api } = require("@statsfm/statsfm.js");
const statsfm = new Api();

const path = require("path");
async function getLastfmTop5(lastfmUser, periodFlag) {
  let periodParam = null;
  if (periodFlag && periodFlag.startsWith("-")) {
    periodFlag = periodFlag.replace("-", "").toLowerCase();
    if (periodFlag == "semana" || periodFlag == "week") {
      periodParam = `&period=7day`;
    } else if (
      periodFlag == "mes" ||
      periodFlag == "mês" ||
      periodFlag == "month"
    ) {
      periodParam = `&period=1month`;
    } else if (periodFlag == "ano" || periodFlag == "year") {
      periodParam = `&period=12month`;
    }
  }
  const api_url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${lastfmUser}&limit=5&api_key=${process.env.LASTFM_API_KEY}${periodParam ? periodParam : ""}&format=json`;

  const data = await fb.got(api_url, { retry: { limit: 3 } });
  if (!data) {
    return null;
  }

  if (data.error) {
    if (data.error === 6) {
      return null;
    }
    if (data.error === 17) {
      return "private";
    }
  }

  if (data.toptracks.track.length === 0) {
    return false; // for case of new accounts or idk
  }

  const top5Songs = data.toptracks.track.map((track) => ({
    songArtist: track.artist.name,
    songName: track.name,
    playCount: track.playcount,
  }));

  return top5Songs;
}

async function getStatsfmTop5(statsfmUser, periodFlag) {
  const options = { limit: 5 };
  if (periodFlag && periodFlag.startsWith("-")) {
    periodFlag = periodFlag.replace("-", "").toLowerCase();
    if (periodFlag === "semana" || periodFlag === "week") {
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      options.after = now - oneWeekMs;
      options.before = now;
    } else if (
      periodFlag === "mes" ||
      periodFlag === "mês" ||
      periodFlag === "month"
    ) {
      const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      options.after = now - oneMonthMs;
      options.before = now;
    } else if (periodFlag === "ano" || periodFlag === "year") {
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      options.after = now - oneYearMs;
      options.before = now;
    }
  }

  const res = await statsfm.users.topTracks(statsfmUser, options);

  if (!res) {
    return null;
  }

  const top5Songs = res.map((t) => ({
    songArtist: t.track.artists[0].name,
    songName: t.track.name,
    playCount: t.streams,
  }));

  return top5Songs;
}

const topSongsCommand = async (message) => {
  const rawSongTarget = message.args[1]?.replace(/^@/, "");
  const songTarget =
    rawSongTarget && !rawSongTarget.startsWith("-")
      ? rawSongTarget
      : message.senderUsername;
  const periodFlag = message.args.find((arg) => arg.startsWith("-"));

  const songTargetId =
    songTarget.toLowerCase() != message.senderUsername
      ? (await fb.api.helix.getUserByUsername(songTarget))?.id
      : message.senderUserID;

  let fmUser = songTarget;
  let isStatsFm = false;
  if (songTargetId) {
    const matchFromDb = await fb.db.get("lastfm", { twitch_uid: songTargetId });
    if (matchFromDb) {
      if (matchFromDb.use_statsfm) {
        fmUser = matchFromDb.statsfm_user;
        isStatsFm = true;
      } else {
        fmUser = matchFromDb.lastfm_user;
      }
    }
  }

  let top5Tracks;
  if (isStatsFm) {
    top5Tracks = await getStatsfmTop5(fmUser, periodFlag);
  } else {
    top5Tracks = await getLastfmTop5(fmUser, periodFlag);
  }
  if (top5Tracks === null) {
    return {
      reply: `O usuário ${songTarget} não está registrado no ${
        isStatsFm ? "Stats.fm" : "Last.fm"
      }. Para entender como configurar a sua conta, acesse https://folhinhabot.com/comandos/song 😁`,
    };
  }

  if (top5Tracks === false) {
    return {
      reply: `${
        songTarget != message.senderUsername ? songTarget : "Você"
      } ainda não escutou nenhuma música`,
    };
  }

  if (top5Tracks === "private") {
    return {
      reply: `O usuário ${songTarget} tem o perfil privado no Last.fm (se não for o caso, avise o dev)`,
    };
  }

  const top5String = top5Tracks
    .map(
      (track) => `${track.songName} - ${track.songArtist} (${track.playCount})`,
    )
    .join(", ");
  return {
    reply: `Top 5 músicas mais ouvidas de ${songTarget}: ${top5String}`,
  };
};

topSongsCommand.commandName = "topsongs";
topSongsCommand.aliases = ["topsongs", "topsong"];
topSongsCommand.shortDescription = "Veja as 5 músicas mais ouvidas de alguém";
topSongsCommand.cooldown = 5000;
topSongsCommand.cooldownType = "channel";
topSongsCommand.whisperable = true;
topSongsCommand.description = `Mostre as 5 músicas mais ouvidas de alguém, de acordo com o Last.fm ou Stats.fm

Pode especificar um período de tempo usando as seguintes flags:
-semana/week - para limitar os resultados para a última semana
-mes/month - para limitar os resultados para o último mês
-ano/year - para limitar os resultados para o último ano

Para ver mais sobre como configurar a sua conta, acesse https://folhinhabot.com/comandos/song`;
topSongsCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  topSongsCommand,
};
