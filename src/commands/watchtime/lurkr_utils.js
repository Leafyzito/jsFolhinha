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

module.exports = {
  formatSeconds,
  resolveUser,
  errorReply,
  profileSummary,
  getTarget,
};
