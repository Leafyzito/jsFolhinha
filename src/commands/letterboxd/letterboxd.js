const path = require("path");
const Parser = require("rss-parser");

const LBdict = {
  watchedDate: "letterboxd:watchedDate",
  filmTitle: "letterboxd:filmTitle",
  filmYear: "letterboxd:filmYear",
  memberRating: "letterboxd:memberRating",
};

const rssParser = new Parser({
  customFields: {
    item: [
      LBdict.watchedDate,
      LBdict.filmTitle,
      LBdict.filmYear,
      LBdict.memberRating,
    ],
  },
});

function itemGuidString(item) {
  const g = item.guid;
  if (typeof g === "string") return g;
  if (g && typeof g === "object" && g._) return String(g._);
  return g ? String(g) : "";
}

function isWatchOrReviewItem(item) {
  return /^letterboxd-(watch|review)-/.test(itemGuidString(item));
}

function watchedSortKeyMs(item) {
  const wd = item[LBdict.watchedDate];
  if (wd && /^\d{4}-\d{2}-\d{2}$/.test(wd)) {
    return Date.parse(`${wd}T12:00:00.000Z`);
  }
  if (item.isoDate) return Date.parse(item.isoDate);
  if (item.pubDate) return Date.parse(item.pubDate);
  return 0;
}

function formatRatingStars(memberRating) {
  if (memberRating == null || memberRating === "") return null;
  const n = Number(memberRating);
  if (Number.isNaN(n) || n <= 0) return null;
  const full = Math.floor(n);
  const frac = n - full;
  let out = "★".repeat(full);
  if (frac >= 0.5) out += "½";
  return out || null;
}

async function fetchLetterboxdRssXml(lbxUser) {
  const slug = encodeURIComponent(lbxUser.toLowerCase().trim());
  const url = `https://letterboxd.com/${slug}/rss/`;
  return fb.got(url, {
    responseType: "text",
    forcedUserAgent: true,
    retry: { limit: 2 },
  });
}

async function getLatestDiaryFromRss(lbxUser) {
  const xml = await fetchLetterboxdRssXml(lbxUser);
  if (!xml) return null;

  let feed;
  try {
    feed = await rssParser.parseString(xml);
  } catch {
    return null;
  }

  const items = (feed.items || []).filter(isWatchOrReviewItem);
  if (items.length === 0) return false;

  items.sort((a, b) => watchedSortKeyMs(b) - watchedSortKeyMs(a));
  const item = items[0];

  const title =
    item[LBdict.filmTitle] ||
    (item.title ? item.title.split(",")[0].trim() : null);
  const year = item[LBdict.filmYear] || null;
  const link = item.link || null;
  const ratingStars = formatRatingStars(item[LBdict.memberRating]);
  const timeAgo = item.isoDate
    ? fb.utils.relativeTime(item.isoDate, true, true)
    : null;

  return { title, year, link, ratingStars, timeAgo };
}

async function validateLetterboxdUserExists(lbxUser) {
  const xml = await fetchLetterboxdRssXml(lbxUser);
  if (!xml) return false;
  try {
    await rssParser.parseString(xml);
    return true;
  } catch {
    return false;
  }
}

const letterboxdCommand = async (message) => {
  const lbTarget = message.args[1]?.replace(/^@/, "") || null;

  if (lbTarget && lbTarget.toLowerCase() === "set") {
    const userToSet = message.args[2]?.replace(/^@/, "").toLowerCase() || null;
    if (!userToSet) {
      return {
        reply: `Você precisa especificar o nome de usuário do Letterboxd. Use ${message.prefix}lbx set usuario_do_letterboxd`,
      };
    }

    const ok = await validateLetterboxdUserExists(userToSet);
    if (!ok) {
      return {
        reply: `Esse usuário Letterboxd não existe (se não for o caso, avise o dev)`,
      };
    }

    await fb.db.update(
      "users",
      { userid: message.senderUserID },
      { $set: { "connections.letterboxd.letterboxd_user": userToSet } }
    );

    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["joia", "jumilhao"],
      "👍"
    );
    return {
      reply: `Conta Letterboxd configurada com sucesso ${emote}`,
    };
  }

  let lbUser;
  let whoLabel;

  if (!lbTarget) {
    const userDoc = await fb.db.get("users", {
      userid: message.senderUserID,
    });
    const savedLetterboxd = userDoc?.connections?.letterboxd?.letterboxd_user;
    if (!savedLetterboxd) {
      return {
        reply: `Você ainda não configurou o Letterboxd no bot. Use ${message.prefix}lbx set usuario_do_letterboxd`,
      };
    }
    lbUser = savedLetterboxd;
    whoLabel = "Você";
  } else {
    const twitchUser = await fb.api.helix.getUserByUsername(lbTarget);
    let savedLetterboxd = null;
    if (twitchUser?.id) {
      const userDoc = await fb.db.get("users", { userid: twitchUser.id });
      savedLetterboxd = userDoc?.connections?.letterboxd?.letterboxd_user;
    }

    if (savedLetterboxd) {
      lbUser = savedLetterboxd;
      whoLabel = twitchUser?.displayName || lbTarget;
    } else {
      lbUser = lbTarget;
      whoLabel = lbTarget;
    }
  }

  const diary = await getLatestDiaryFromRss(lbUser);
  if (diary === null) {
    return {
      reply: `Não encontrei esse usuário no Letterboxd (se não for o caso, avise o dev)`,
    };
  }
  if (diary === false) {
    return {
      reply: `${whoLabel} ainda não tem entradas de diário públicas no Letterboxd`,
    };
  }

  const titleYear = diary.year ? `${diary.title} (${diary.year})` : diary.title;
  const parts = [`${whoLabel} assistiu por último ${titleYear}`];
  if (diary.ratingStars) parts.push(diary.ratingStars);
  if (diary.timeAgo) parts.push(`há ${diary.timeAgo}`);
  if (diary.link) parts.push(diary.link);

  return {
    reply: parts.join(" ● "),
  };
};

letterboxdCommand.commandName = "letterboxd";
letterboxdCommand.aliases = ["letterboxd", "lbxd", "lbx"];
letterboxdCommand.shortDescription =
  "Mostre o último filme visto registrado no Letterboxd";
letterboxdCommand.cooldown = 5000;
letterboxdCommand.cooldownType = "channel";
letterboxdCommand.whisperable = true;
letterboxdCommand.description = `Mostre o último filme visto registrado no Letterboxd.

Configure a sua conta com !letterboxd set usuario_do_letterboxd

!letterboxd - Caso tenha configurado uma conta, mostra o último filme visto registrado no Letterboxd da sua conta configurada
!letterboxd {usuario_do_letterboxd} - Mostra o último filme visto registrado no Letterboxd do usuário especificado`;
letterboxdCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  letterboxdCommand,
};
