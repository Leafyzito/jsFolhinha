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
  const api_url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${lastfmUser}&limit=5&api_key=${process.env.LASTFM_API_KEY}${periodParam ? periodParam : ""}&format=json`;

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

  if (data.topartists.artist.length === 0) {
    return false; // for case of new accounts or idk
  }

  const top5Artists = data.topartists.artist.map((artist) => ({
    artistName: artist.name,
    playCount: artist.playcount,
  }));

  return top5Artists;
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

  const res = await statsfm.users.topArtists(statsfmUser, options);

  if (!res) {
    return null;
  }

  const top5Artists = res.map((a) => ({
    artistName: a.artist.name,
    playCount: a.streams,
  }));

  return top5Artists;
}

const topArtistsCommand = async (message) => {
  const rawArtistTarget = message.args[1]?.replace(/^@/, "");
  const artistTarget =
    rawArtistTarget && !rawArtistTarget.startsWith("-")
      ? rawArtistTarget
      : message.senderUsername;
  const periodFlag = message.args.find((arg) => arg.startsWith("-"));

  const artistTargetId =
    artistTarget.toLowerCase() != message.senderUsername
      ? (await fb.api.helix.getUserByUsername(artistTarget))?.id
      : message.senderUserID;

  let fmUser = artistTarget;
  let isStatsFm = false;
  if (artistTargetId) {
    const matchFromDb = await fb.db.get("lastfm", {
      twitch_uid: artistTargetId,
    });
    if (matchFromDb) {
      if (matchFromDb.use_statsfm) {
        fmUser = matchFromDb.statsfm_user;
        isStatsFm = true;
      } else {
        fmUser = matchFromDb.lastfm_user;
      }
    }
  }

  let top5Artists;
  if (isStatsFm) {
    top5Artists = await getStatsfmTop5(fmUser, periodFlag);
  } else {
    top5Artists = await getLastfmTop5(fmUser, periodFlag);
  }
  if (top5Artists === null) {
    return {
      reply: `O usuário ${artistTarget} não está registrado no ${
        isStatsFm ? "Stats.fm" : "Last.fm"
      }. Para entender como configurar a sua conta, acesse https://folhinhabot.com/comandos/song 😁`,
    };
  }

  if (top5Artists === false) {
    return {
      reply: `${
        artistTarget != message.senderUsername ? artistTarget : "Você"
      } ainda não escutou nenhum artista`,
    };
  }

  if (top5Artists === "private") {
    return {
      reply: `O usuário ${artistTarget} tem o perfil privado no Last.fm (se não for o caso, avise o dev)`,
    };
  }

  const top5String = top5Artists
    .map((artist) => `${artist.artistName} (${artist.playCount})`)
    .join(", ");
  return {
    reply: `Top 5 artistas mais ouvidos de ${artistTarget}: ${top5String}`,
  };
};

topArtistsCommand.commandName = "topartists";
topArtistsCommand.aliases = ["topartists", "topartist"];
topArtistsCommand.shortDescription =
  "Veja os 5 artistas mais ouvidos de alguém";
topArtistsCommand.cooldown = 5000;
topArtistsCommand.cooldownType = "channel";
topArtistsCommand.whisperable = true;
topArtistsCommand.description = `Mostre os 5 artistas mais ouvidos de alguém, de acordo com o Last.fm ou Stats.fm

Pode especificar um período de tempo usando as seguintes flags:
-semana/week - para limitar os resultados para a última semana
-mes/month - para limitar os resultados para o último mês
-ano/year - para limitar os resultados para o último ano

Para ver mais sobre como configurar a sua conta, acesse https://folhinhabot.com/comandos/song`;
topArtistsCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  topArtistsCommand,
};
