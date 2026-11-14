const path = require("path");
const durationRegex =
  /P((?<days>\d+)D)?(T((?<hours>\d+)H)?((?<minutes>\d+)M)?((?<seconds>\d+)S)?)?/;

function parseVideoDuration(string) {
  const match = string.match(durationRegex);
  if (!match || !match.groups) {
    return "";
  }

  const { days, hours, minutes, seconds } = match.groups;
  const totalSeconds =
    Number(days ?? 0) * 86400 +
    Number(hours ?? 0) * 3600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0);

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatVideoDetails(video) {
  return {
    id: video.id,
    title: video.snippet.title,
    link: `https://youtu.be/${video.id}`,
    author: video.snippet.channelTitle,
    publishedAt: new Date(video.snippet.publishedAt).toLocaleDateString(
      "en-GB"
    ),
    duration:
      video.contentDetails.duration == "P0D"
        ? ""
        : parseVideoDuration(video.contentDetails.duration),
    views: Number(video.statistics.viewCount).toLocaleString("fr-FR"),
  };
}

async function getVideo(query) {
  const video = await fb.api.google.searchYoutubeVideo(query);
  if (video === null) {
    return null;
  }
  const videoDetails = await fb.api.google.getYoutubeVideo(video.id);
  if (videoDetails === null) {
    return null;
  }
  return formatVideoDetails(videoDetails);
}

const youtubeSearchCommand = async (message) => {
  const query = message.args.slice(1).join(" ").trim();
  if (query === "" || query === null) {
    return {
      reply: `Use o formato: ${message.prefix}youtubesearch <qualquer coisa>`,
    };
  }

  const ytVideo = await getVideo(query);
  if (ytVideo === null) {
    return {
      reply: `Não encontrei nenhum vídeo sobre essa pesquisa`,
    };
  }

  const durationPart =
    ytVideo.duration === "" ? "" : ` ● duração: ${ytVideo.duration}`;
  const reply = `"${ytVideo.title}" de ${ytVideo.author} ● ${ytVideo.views} views ● publicado em ${ytVideo.publishedAt}${durationPart} ● ${ytVideo.link}`;

  return {
    reply: reply,
  };
};

youtubeSearchCommand.commandName = "youtubesearch";
youtubeSearchCommand.aliases = ["youtubesearch", "ytsearch", "yts", "ys"];
youtubeSearchCommand.shortDescription = "Pesquise vídeos no YouTube";
youtubeSearchCommand.cooldown = 5000;
youtubeSearchCommand.cooldownType = "channel";
youtubeSearchCommand.whisperable = true;
youtubeSearchCommand.description = `Pesquise vídeos no YouTube e veja detalhes sobre eles, como título, autor, views, data de publicação e duração`;
youtubeSearchCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  youtubeSearchCommand,
};
