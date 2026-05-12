const reloadEmotesCommand = async (message) => {
  const targetChannel =
    message.args[1]?.toLowerCase() || message.channelName.toLowerCase();

  if (targetChannel === "all") {
    const channelsToReload = Object.keys(fb.emotes.cachedEmotes);
    for (const channel of channelsToReload) {
      fb.emotes.cachedEmotes[channel] = null;
      await fb.emotes.getChannelEmotes(channel);
    }

    return {
      reply: `Emotes recarregados em ${channelsToReload.length} canais 👍`,
    };
  }

  if (targetChannel === "clear") {
    fb.emotes.cachedEmotes = {};
    return {
      reply: `Emotes limpos 👍`,
    };
  }
  fb.emotes.cachedEmotes[targetChannel] = null;
  await fb.emotes.getChannelEmotes(targetChannel);

  return {
    reply: `Emotes recarregados 👍`,
  };
};

// Command metadata
reloadEmotesCommand.commandName = "reloademotes";
reloadEmotesCommand.aliases = ["reloademotes"];
reloadEmotesCommand.shortDescription = "[DEV] Recarrega os emotes dos canais";
reloadEmotesCommand.cooldown = 5_000;
reloadEmotesCommand.cooldownType = "user";
reloadEmotesCommand.permissions = ["admin"];
reloadEmotesCommand.whisperable = false;
reloadEmotesCommand.flags = ["dev"];
reloadEmotesCommand.description = "Recarrega a lista de emotes para um canal específico, para todos os canais em cache, ou limpa toda a cache de emotes";
reloadEmotesCommand.examples = [
  {
    description: "Recarregar os emotes do canal atual",
    input: "!reloademotes",
    output: "Emotes do canal atual recarregados ✅",
  },
  {
    description: "Recarregar os emotes de um canal específico",
    input: "!reloademotes canal123",
    output: "Emotes do canal canal123 recarregados ✅",
  },
  {
    description: "Recarregar os emotes de todos os canais em cache",
    input: "!reloademotes all",
    output: "Emotes de todos os canais em cache recarregados ✅",
  },
  {
    description: "Limpar toda a cache de emotes",
    input: "!reloademotes clear",
    output: "Cache de emotes limpa ✅",
  },
];

module.exports = { reloadEmotesCommand };
