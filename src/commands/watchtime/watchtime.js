const path = require("path");
const {
  formatSeconds,
  resolveUser,
  errorReply,
  profileSummary,
  getTarget,
} = require("./lurkr_utils.js");

function formatDate(date) {
  return new Date(date).toLocaleDateString("pt-BR").replace(/\//g, "-");
}

async function channelWatchtime(message, target, channel) {
  const data = await fb.api.lurkr.getChannelWatchtime(target.id, channel.id);
  const error = errorReply(data, target.login);
  if (error) return { reply: error };

  const channelLogin = data.login ?? channel.login;
  if (data.seconds === 0) {
    return {
      reply: `${target.login} nunca assistiu ${channelLogin} ● ${data.profileUrl}`,
    };
  }

  const parts = [
    `${target.login} assistiu ${channelLogin} por ${formatSeconds(data.seconds)}`,
  ];
  if (data.firstWatched) {
    parts.push(`Desde: ${formatDate(data.firstWatched)}`);
  }
  parts.push(`Últimos 30 dias: ${formatSeconds(data.last30DaysSeconds)}`);
  parts.push(data.url ?? data.profileUrl);

  return { reply: parts.join(" ● ") };
}

const watchtimeCommand = async (message) => {
  const [, userArg, channelArg] = message.args;

  const target = await getTarget(message, userArg);
  if (target.reply) return target;

  // whispers have no channel to default to, so they get the profile summary
  if (!channelArg && message.isWhisper) {
    return profileSummary(message, target);
  }

  let channel = { id: message.channelID, login: message.channelName };
  if (channelArg) {
    channel = await resolveUser(channelArg.toLowerCase().replace(/^@/, ""));
    if (!channel) {
      return { reply: "Esse canal não existe" };
    }
  }

  return channelWatchtime(message, target, channel);
};

watchtimeCommand.commandName = "watchtime";
watchtimeCommand.aliases = ["watchtime", "wt"];
watchtimeCommand.shortDescription =
  "Mostra quanto tempo alguém assistiu um canal, pelo Lurkr";
watchtimeCommand.cooldown = 5000;
watchtimeCommand.cooldownType = "channel";
watchtimeCommand.whisperable = true;
watchtimeCommand.optoutable = true;
watchtimeCommand.description = `Mostra quanto tempo alguém assistiu um canal, contado pela extensão do Lurkr (https://lurkr.leafyzito.dev). Só funciona com perfis públicos do Lurkr

!watchtime - Mostra quanto tempo você assistiu o canal onde o comando foi usado
!watchtime {usuário} - Mostra quanto tempo o usuário assistiu o canal onde o comando foi usado
!watchtime {usuário} {canal} - Mostra quanto tempo o usuário assistiu o canal escolhido

No whisper, sem canal, mostra o resumo do perfil, como o !lurkr

Se quiser desabilitar a função de outras pessoas usarem este comando em você, use !optout watchtime`;
watchtimeCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  watchtimeCommand,
};
