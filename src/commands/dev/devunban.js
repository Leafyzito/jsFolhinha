function getCommandObjectByAlias(alias) {
  return (
    Object.values(fb.commandsList)
      .flatMap((command) => [command, ...command.aliases])
      .find(
        (item) => item.aliases?.includes(alias) || item.commandName === alias
      ) || null
  );
}

const unbanDevCommand = async (message) => {
  const targetUser = message.args[1];
  if (!targetUser) {
    return {
      reply: `Use o formato: ${message.prefix}devunban <usuário> <all/comando>`,
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
  let commandToUnban = targetCommand;
  if (targetCommand.toLowerCase() !== "all") {
    const command = getCommandObjectByAlias(targetCommand.toLowerCase());
    if (!command) {
      return {
        reply: `O comando ${targetCommand} não é válido`,
      };
    }
    // Use commandName for the database
    commandToUnban = command.commandName;
  }

  // Check if user has ban record
  const banRecord = await fb.db.get("bans", { userId: targetUserId });
  if (!banRecord) {
    return {
      reply: `Usuário não está banido de nenhum comando`,
    };
  }

  // Remove command from banned commands
  await fb.db.update(
    "bans",
    { userId: targetUserId },
    { $pull: { bannedCommands: commandToUnban } }
  );

  // If no more banned commands, remove the entire ban record
  const updatedBanRecord = await fb.db.get("bans", { userId: targetUserId });
  if (
    updatedBanRecord.length > 0 &&
    updatedBanRecord[0].bannedCommands.length === 0
  ) {
    await fb.db.delete("bans", { userId: targetUserId });
  }

  return {
    reply: `👍`,
  };
};

// Command metadata
unbanDevCommand.commandName = "devunban";
unbanDevCommand.aliases = ["devunban", "dunban"];
unbanDevCommand.shortDescription =
  "[DEV] Remove o banimento de um usuário em comandos específicos do bot";
unbanDevCommand.cooldown = 5_000;
unbanDevCommand.cooldownType = "user";
unbanDevCommand.permissions = ["admin"];
unbanDevCommand.whisperable = false;
unbanDevCommand.flags = ["dev"];
unbanDevCommand.description = `Remove o banimento de um usuário do uso de um comando específico, ou de todos os comandos, no bot.
Para remover o banimento de todos os comandos, utilize "all" no lugar do nome do comando.`;
unbanDevCommand.examples = [
  {
    description: "Permitir que um usuário volte a usar um comando específico",
    input: "!devunban usuario123 piada",
    output: "Usuário 'usuario123' desbanido do comando 'piada' ✅",
  },
  {
    description: "Permitir que um usuário volte a usar todos os comandos",
    input: "!devunban usuario123 all",
    output: "Usuário 'usuario123' desbanido de todos os comandos ✅",
  },
];

module.exports = { unbanDevCommand };
