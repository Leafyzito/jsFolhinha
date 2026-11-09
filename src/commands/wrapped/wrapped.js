const path = require("path");
const { getWrappedDoc, YEAR } = require("../../utils/wrapped");

// short summary before the link, empty until scripts/compute-wrapped.js runs
async function wrappedTeaser(userId) {
  const stats = await getWrappedDoc(userId);
  if (!stats) return "";
  const parts = [
    `${stats.commands.total.toLocaleString("fr-FR")} comandos (top ${stats.commands.topPercent}%)`,
  ];
  if (stats.archetype) {
    parts.push(`${stats.archetype.label} ${stats.archetype.emoji}`);
  }
  return `${parts.join(", ")} → `;
}

const wrappedCommand = async (message) => {
  const wrappedTarget =
    message.args[1]?.replace(/^@/, "") || message.senderUsername;
  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    fb.emotes.pogEmotes,
    "PogChamp"
  );
  if (wrappedTarget.toLowerCase() != message.senderUsername) {
    const wrappedTargetId = (
      await fb.api.helix.getUserByUsername(wrappedTarget)
    )?.id;
    if (await fb.utils.isOptedOut(wrappedTargetId, "wrapped", message.senderUserID)) {
      return {
        reply: fb.utils.optoutReply,
      };
    }

    const teaser = wrappedTargetId ? await wrappedTeaser(wrappedTargetId) : "";
    return {
      reply: `${emote} Wrapped ${YEAR} de ${wrappedTarget}: ${teaser}https://folhinhabot.com/wrapped/${wrappedTarget}`,
    };
  }

  const teaser = await wrappedTeaser(message.senderUserID);
  return {
    reply: `${emote} Seu Wrapped ${YEAR}: ${teaser}https://folhinhabot.com/wrapped/${wrappedTarget}`,
  };
};

wrappedCommand.commandName = "wrapped";
wrappedCommand.aliases = ["wrapped"];
wrappedCommand.shortDescription = "Veja o seu Wrapped do Folhinha";
wrappedCommand.cooldown = 5000;
wrappedCommand.cooldownType = "user";
wrappedCommand.whisperable = true;
wrappedCommand.optoutable = true;
wrappedCommand.description = `Veja algumas estatísticas sobre você e o bot durante ${YEAR}`;
wrappedCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  wrappedCommand,
};
