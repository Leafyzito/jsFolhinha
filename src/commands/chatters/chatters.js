const path = require("path");
async function getChatters(channel) {
  const api_url = "https://api.fuchsty.de/twitch/chatters/" + channel;
  const response = await fb.got(api_url);

  if (!response) {
    return "erro";
  }

  const data = response;

  if ("error" in data) {
    return "erro";
  }

  const count = data.count;
  if (count === 0) {
    return null;
  }

  const broadcaster = data.chatters.broadcasters || [];
  const mods = data.chatters.moderators || [];
  const vips = data.chatters.vips || [];
  const viewers = data.chatters.viewers || [];

  return [broadcaster, mods, vips, viewers, count];
}

const chattersCommand = async (message) => {
  const targetChannel =
    message.args[1]?.replace(/^@/, "") || message.channelName;
  const chattersRes = await getChatters(targetChannel);

  if (chattersRes === "erro") {
    return {
      reply: `Esse usuário não existe`,
    };
  }

  if (!chattersRes) {
    return {
      reply: `Não há chatters em ${targetChannel}`,
    };
  }

  let streamer = chattersRes[0];
  let mods = chattersRes[1];
  let vips = chattersRes[2];
  let viewers = chattersRes[3];
  const count = chattersRes[4];

  streamer = streamer.join("\n");
  mods = mods.sort().join("\n");
  vips = vips.sort().join("\n");
  viewers = viewers.sort().join("\n");

  const finalList = `Total de chatters em #${targetChannel}: ${count}\n\nStreamer:\n${streamer}\n\nModeradores: (${mods.length})\n${mods}\n\nVips: (${vips.length})\n${vips}\n\nChatters: (${viewers.length})\n${viewers}`;

  const gistUrl = await fb.api.github.createGist(finalList);

  if (count > 99) {
    return {
      reply: `Existem ${count} chatters em #${targetChannel}: ${gistUrl} (devido a limitações da Twitch, esta lista contém apenas 100 chatters)`,
    };
  }

  return {
    reply: `Existem ${count} chatters em #${targetChannel}: ${gistUrl}`,
  };
};

chattersCommand.commandName = "chatters";
chattersCommand.aliases = ["chatters"];
chattersCommand.shortDescription = "Mostra a lista de chatters de algum canal";
chattersCommand.cooldown = 5000;
chattersCommand.cooldownType = "channel";
chattersCommand.whisperable = false;
chattersCommand.description = `Exibe uma lista de usuários totais online no canal e suas devidas categorias (Streamer, Moderadores, VIPs, Chatters)
O comando funcionará mesmo em canais que o Folhinha não esteja presente`;
chattersCommand.examples = [
  {
    description: "Ver a lista de chatters do canal atual",
    input: "!chatters",
    output: "Existem 1234 chatters em #canalatual: https://gist.github.com/xxxxx",
  },
  {
    description: "Ver a lista de chatters de um canal específico",
    input: "!chatters xqc",
    output: "Existem 89512 chatters em #xqc: https://gist.github.com/xxxxx (devido a limitações da Twitch, esta lista contém apenas 100 chatters)",
  },
];
chattersCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  chattersCommand,
};
