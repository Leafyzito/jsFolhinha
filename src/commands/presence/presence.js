const path = require("path");
async function get7tvUserId(twitchUid) {
  const data = await fb.got(`https://7tv.io/v3/users/twitch/${twitchUid}`);
  if (data && data.user && data.user.id) {
    return data.user.id;
  }
  return null;
}

const presenceCommand = async (message) => {
  const presenceTarget =
    message.args[1]?.replace(/^@/, "") || message.senderUsername;
  const presenceTargetId =
    presenceTarget.toLowerCase() !== message.senderUsername.toLowerCase()
      ? (await fb.api.helix.getUserByUsername(presenceTarget))?.id
      : message.senderUserID;

  if (!presenceTargetId) {
    return {
      reply: `Esse usuário não existe`,
    };
  }

  const sevenTvUserId = await get7tvUserId(presenceTargetId);
  if (!sevenTvUserId) {
    return {
      reply: `Esse usuário não está registado no 7TV`,
    };
  }

  fb.api.stv.updatePresence(sevenTvUserId, message.channelID, true);

  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["joia", "jumilhao"],
    "FeelsOkayMan 👍"
  );

  return {
    reply: `(7TV) Presence ${
      presenceTarget !== message.senderUsername ? `de ${presenceTarget}` : ""
    } atualizada ${emote}`,
  };
};

presenceCommand.commandName = "presence";
presenceCommand.aliases = ["presence"];
presenceCommand.shortDescription = "Atualiza a sua presença no 7tv";
presenceCommand.cooldown = 5000;
presenceCommand.cooldownType = "user";
presenceCommand.whisperable = false;
presenceCommand.description = `Use este comando para atualizar a sua presença no 7tv, ou seja, atualizar a sua paint ou badge caso não tenha atualizado automaticamente corretamente

Pode também fornecer um usuário para atualizar a sua presença, caso queira atualizar a presença de outro usuário

Se você não sabe o que isso significa, este comando provavelmente não é útil para você`;
presenceCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  presenceCommand,
};
