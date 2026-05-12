function getCommandObjectByAlias(alias) {
  return (
    Object.values(fb.commandsList)
      .flatMap((command) => [command, ...command.aliases])
      .find(
        (item) => item.aliases?.includes(alias) || item.commandName === alias
      ) || null
  );
}

const devBanCommand = async (message) => {
  const targetUser = message.args[1];
  if (!targetUser) {
    return {
      reply: `Use o formato: ${message.prefix}devban <usuário> <all/comando>`,
    };
  }

  const targetUserId = (await fb.api.helix.getUserByUsername(targetUser))?.id;

  if (!targetUserId) {
    return {
      reply: `Esse usuário não existe`,
    };
  }

  const targetCommand = message.args[2];

  if (!targetCommand) {
    return {
      reply: `Comando não especificado`,
    };
  }

  // Check if targetCommand is "all" or a valid command
  let commandToBan = targetCommand;
  if (targetCommand.toLowerCase() !== "all") {
    const command = getCommandObjectByAlias(targetCommand.toLowerCase());
    if (!command) {
      return {
        reply: `O comando ${targetCommand} não é válido`,
      };
    }
    // Use commandName for the database
    commandToBan = command.commandName;
  }

  // Check if user already has ban record, create if not
  const hasBanRecord = await fb.db.get("bans", { userId: targetUserId });
  if (!hasBanRecord) {
    await fb.db.insertTemplate("bans", { userId: targetUserId });
  }

  // Add command to banned commands
  await fb.db.update(
    "bans",
    { userId: targetUserId },
    { $push: { bannedCommands: commandToBan } }
  );

  return {
    reply: `👍`,
  };
};

// Command metadata
devBanCommand.commandName = "devban";
devBanCommand.aliases = ["devban", "dban"];
devBanCommand.shortDescription = "[DEV] Banir usuário de usar comandos";
devBanCommand.cooldown = 5_000;
devBanCommand.cooldownType = "user";
devBanCommand.permissions = ["admin"];
devBanCommand.whisperable = false;
devBanCommand.flags = ["dev"];
devBanCommand.description = `Bane um usuário específico de usar um comando específico, ou todos os comandos, no bot
 Para banir o uso de todos os comandos, utilize "all" no lugar do nome do comando`;
devBanCommand.examples = [
  {
    description: "Banir um usuário de um comando específico",
    input: "!devban usuario123 piada",
    output: "Usuário 'usuario123' banido do comando 'piada' ✅",
  },
  {
    description: "Banir um usuário de todos os comandos",
    input: "!devban usuario123 all",
    output: "Usuário 'usuario123' banido de todos os comandos ✅",
  },
];

module.exports = { devBanCommand };
