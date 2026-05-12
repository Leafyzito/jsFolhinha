const rustlogRemoveCommand = async (message) => {
  const targetUser = message.args[1];
  if (!targetUser) {
    return {
      reply: `Use o formato ${message.prefix}rustlogremove <username>`,
    };
  }

  try {
    const userData = await fb.api.helix.getUserByUsername(targetUser);
    if (!userData) {
      return {
        reply: `Esse usuário não existe`,
      };
    }
    const userId = userData.id;
    await fb.api.rustlog.removeChannel(userId);
    return {
      reply: `🤖 Canal removido do rustlog: ${targetUser}`,
    };
  } catch (err) {
    return {
      reply: `Erro ao remover do rustlog: ${err.message}`,
    };
  }
};

// Command metadata
rustlogRemoveCommand.commandName = "rustlogremove";
rustlogRemoveCommand.aliases = [
  "rustlogremove",
  "rlremove",
  "rldelete",
  "rldel",
];
rustlogRemoveCommand.shortDescription = "[DEV] Remove um canal do rustlog";
rustlogRemoveCommand.cooldown = 5_000;
rustlogRemoveCommand.cooldownType = "user";
rustlogRemoveCommand.permissions = ["admin"];
rustlogRemoveCommand.whisperable = false;
rustlogRemoveCommand.flags = ["dev"];
rustlogRemoveCommand.description = "Remove um canal da lista do rustlog.";
rustlogRemoveCommand.examples = [
  {
    description: "Remover um canal do rustlog",
    input: "!rustlogremove usuario123",
    output: "Canal usuario123 removido do rustlog ✅",
  },
];

module.exports = { rustlogRemoveCommand };
