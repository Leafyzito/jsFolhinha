const revivePetCommand = async (message) => {
  const targetChannel = message.args[1];
  if (!targetChannel) {
    return {
      reply: `Use o formato ${message.prefix}petrevive <canal para reviver pet>`,
    };
  }

  const targetChannelId = (await fb.api.helix.getUserByUsername(targetChannel))
    ?.id;

  if (!targetChannelId) {
    return {
      reply: `Esse canal não existe`,
    };
  }

  try {
    await fb.db.update(
      "pet",
      { channelId: targetChannelId },
      {
        $set: {
          is_alive: true,
          last_interaction: Math.floor(Date.now() / 1000),
        },
      }
    );
    return {
      reply: `Pet revivido para ${targetChannel}`,
    };
  } catch (err) {
    return {
      reply: `Erro ao reviver pet: ${err.message}`,
    };
  }
};

// Command metadata
revivePetCommand.commandName = "petrevive";
revivePetCommand.aliases = ["petrevive", "revivepet"];
revivePetCommand.shortDescription = "[DEV] Revive o pet de um canal";
revivePetCommand.cooldown = 5_000;
revivePetCommand.cooldownType = "user";
revivePetCommand.permissions = ["admin"];
revivePetCommand.whisperable = false;
revivePetCommand.flags = ["dev"];
revivePetCommand.description = "Revive o pet de um canal específico";
revivePetCommand.examples = [
  {
    description: "Reviver o pet de um canal específico",
    input: "!petrevive canal123",
    output: "Pet do canal canal123 revivido ✅",
  },
];

module.exports = { revivePetCommand };
