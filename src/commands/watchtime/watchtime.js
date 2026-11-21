const path = require("path");

const OPTOUT_NAMES = ["watchtime", "lurkr"];

function formatSeconds(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatHours(seconds) {
  return seconds < 3600
    ? formatSeconds(seconds)
    : `${Math.floor(seconds / 3600)}h`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("pt-BR").replace(/\//g, "-");
}

async function resolveUser(login) {
  const user = await fb.api.helix.getUserByUsername(login);
  return user ? { id: user.id, login: user.login } : null;
}

// a reply for a 400/403/404 or a failed request, null when there's data
function errorReply(data, login) {
  if (!data) {
    return "Não consegui falar com o Lurkr, tente novamente mais tarde";
  }
  if (data.error === "not found") {
    return `${login} não usa o Lurkr ● ${fb.api.lurkr.siteUrl}`;
  }
  if (data.error === "private") {
    return `O perfil de ${login} no Lurkr é privado`;
  }
  if (data.error) {
    return "Não consegui falar com o Lurkr, tente novamente mais tarde";
  }
  return null;
}

async function profileSummary(message, target) {
  const data = await fb.api.lurkr.getWatchtime(target.id);
  const error = errorReply(data, target.login);
  if (error) return { reply: error };

  const parts = [
    `${target.login} no Lurkr: ${formatSeconds(data.allTimeSeconds)} no total`,
    `Este mês: ${formatSeconds(data.monthSeconds)}`,
    `Este ano: ${formatSeconds(data.yearSeconds)}`,
  ];
  if (data.streakDays > 0) {
    parts.push(
      `Streak: ${data.streakDays} ${data.streakDays === 1 ? "dia" : "dias"}`,
    );
  }
  if (data.topChannels.length > 0) {
    const top = data.topChannels
      .map((c) => `${c.login} (${formatHours(c.seconds)})`)
      .join(", ");
    parts.push(`Top: ${top}`);
  }
  parts.push(data.profileUrl);

  return { reply: parts.join(" ● ") };
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

// the target from an argument, or the sender; a reply instead when it can't be used
async function getTarget(message, arg) {
  if (!arg) {
    return { id: message.senderUserID, login: message.senderUsername };
  }

  const target = await resolveUser(arg.toLowerCase().replace(/^@/, ""));
  if (!target) {
    return { reply: "Esse usuário não existe" };
  }

  const optedOut = await fb.utils.isOptedOut(
    target.id,
    OPTOUT_NAMES,
    message.senderUserID,
  );
  if (optedOut) {
    return { reply: fb.utils.optoutReply };
  }

  return target;
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

const lurkrCommand = async (message) => {
  const target = await getTarget(message, message.args[1]);
  if (target.reply) return target;

  return profileSummary(message, target);
};

lurkrCommand.commandName = "lurkr";
lurkrCommand.aliases = ["lurkr"];
lurkrCommand.shortDescription = "Mostra o resumo do perfil de alguém no Lurkr";
lurkrCommand.cooldown = 5000;
lurkrCommand.cooldownType = "channel";
lurkrCommand.whisperable = true;
lurkrCommand.optoutable = true;
lurkrCommand.description = `Mostra o resumo do perfil de alguém no Lurkr (https://lurkr.leafyzito.dev): tempo total, deste mês e deste ano, streak e canais mais assistidos. Só funciona com perfis públicos do Lurkr

!lurkr - Mostra o resumo do seu perfil
!lurkr {usuário} - Mostra o resumo do perfil do usuário

Para o tempo num canal específico, use !watchtime

Se quiser desabilitar a função de outras pessoas usarem este comando em você, use !optout lurkr`;
lurkrCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  watchtimeCommand,
  lurkrCommand,
};
