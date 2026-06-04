const setPlusCommand = async (message) => {
  const userToSet = message.args[1]?.replace(/^@/, "").toLowerCase() || null;
  const amount = message.args[2]?.replace(/^@/, "").toLowerCase() || null;
  if (!userToSet) {
    return {
      reply: `Use o formato ${message.prefix}setplus <usuário> [amount]`,
    };
  }

  const userInfo = await fb.api.helix.getUserByUsername(userToSet);
  if (!userInfo) {
    return {
      reply: `Esse usuário não existe`,
    };
  }

  const update = {
    isSupporter: true,
    isPlus: true,
    lastSupportDate: Math.floor(Date.now() / 1000),
  };
  if (amount) {
    update.totalDonated = amount;
  }

  await fb.db.update("users", { userid: userInfo.id }, { $set: update });

  return {
    reply: `${userToSet} agora é Plus! ⭐`,
  };
};

// Command metadata
setPlusCommand.commandName = "setplus";
setPlusCommand.aliases = ["setplus"];
setPlusCommand.shortDescription = "[DEV] Colocar status Plus em um usuário";
setPlusCommand.cooldown = 5_000;
setPlusCommand.cooldownType = "user";
setPlusCommand.permissions = ["admin"];
setPlusCommand.whisperable = true;
setPlusCommand.flags = ["dev"];
setPlusCommand.description = `Coloca o status Plus em um usuário (que apoiou o projeto com mais de R$10). Opcionalmente define o valor do apoio`;

module.exports = { setPlusCommand };
