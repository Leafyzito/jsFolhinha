const devPartChannelCommand = async (message) => {
  const targetChannel = message.args[1];
  if (!targetChannel) {
    return {
      reply: `Use o formato ${message.prefix}devpart <canal>`,
    };
  }

  const targetChannelId = (await fb.api.helix.getUserByUsername(targetChannel))
    ?.id;
  if (!targetChannelId) {
    return {
      reply: `Esse canal não existe`,
    };
  }

  fb.twitch.part(targetChannel);
  await fb.db.delete("config", { channelId: targetChannelId });

  return {
    reply: `🤖 Apaguei config a saí do canal ${targetChannel}`,
  };
};

// Command metadata
devPartChannelCommand.commandName = "devpart";
devPartChannelCommand.aliases = ["devpart", "dpart"];
devPartChannelCommand.shortDescription =
  "[DEV] Faz o bot sair de um canal e apagar a configuração";
devPartChannelCommand.cooldown = 5_000;
devPartChannelCommand.cooldownType = "user";
devPartChannelCommand.permissions = ["admin"];
devPartChannelCommand.whisperable = false;
devPartChannelCommand.flags = ["dev"];
devPartChannelCommand.description = "Remove o bot de um canal específico e apaga a configuração";
devPartChannelCommand.examples = [
  {
    description: "Remover o bot de um canal e apagar a configuração",
    input: "!devpart canalexemplo",
    output: "Saí do canal canalexemplo e removi a configuração ✅",
  },
];

module.exports = { devPartChannelCommand };
