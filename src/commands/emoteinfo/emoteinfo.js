const path = require("path");

async function getEmoteData(emote) {
  const api_url = `https://api.potat.app/twitch/emotes?name=${emote}&fallback=true`;
  const response = await fb.got(api_url, { timeout: 10000 });

  if (!response) return null;

  let channel = null;
  if (Array.isArray(response.data)) {
    const activeEmote = response.data.find(
      (emote) => emote.emoteState === "ACTIVE",
    );
    if (activeEmote) {
      channel = activeEmote.channelName;
    }
  } else {
    channel = response.data.channelName;
  }
  return { channel };
}

const emoteInfoCommand = async (message) => {
  const targetEmote = message.args[1] || null;

  if (!targetEmote) {
    return {
      reply: `Use o formato: ${message.prefix}emote <emote>`,
    };
  }

  const emoteData = await getEmoteData(targetEmote);

  if (!emoteData || !emoteData.channel) {
    return {
      reply: `Não encontrei a origem desse emote`,
    };
  }

  return {
    reply: `O emote ${targetEmote} é do canal ${emoteData.channel}`,
  };
};

emoteInfoCommand.commandName = "emoteinfo";
emoteInfoCommand.aliases = ["emoteinfo"];
emoteInfoCommand.shortDescription = "Comando para saber a origem de um emote";
emoteInfoCommand.cooldown = 5000;
emoteInfoCommand.cooldownType = "channel";
emoteInfoCommand.whisperable = true;
emoteInfoCommand.description = `Use para saber a origem de um emote da Twitch`;
emoteInfoCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  emoteInfoCommand,
};
