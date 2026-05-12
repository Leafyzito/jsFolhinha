const allEmotesCommand = async (message) => {
  const targetChannel =
    message.messageText.split(" ")[1] || message.channelName;
  const channelEmotes = await fb.emotes.getChannelEmotes(targetChannel);
  fb.log.reply(message, `${channelEmotes.length} emotes no total`);

  // send all emotes in chunks of 490 characters
  let emoteMessage = "";
  for (let i = 0; i < channelEmotes.length; i++) {
    if ((emoteMessage + ` ${channelEmotes[i]} `).length > 490) {
      fb.log.send(message.channelName, emoteMessage);
      emoteMessage = "";
    }
    emoteMessage += ` ${channelEmotes[i]} `;
  }
  if (emoteMessage.length > 0) {
    fb.log.send(message.channelName, emoteMessage);
  }
};

// Command metadata
allEmotesCommand.commandName = "allemotes";
allEmotesCommand.aliases = ["allemotes"];
allEmotesCommand.shortDescription = "[DEV] Lista todos os emotes de um canal";
allEmotesCommand.cooldown = 5_000;
allEmotesCommand.cooldownType = "user";
allEmotesCommand.permissions = ["admin"];
allEmotesCommand.whisperable = false;
allEmotesCommand.flags = ["dev"];
allEmotesCommand.description = "Mostra todos os emotes (BTTV, FFZ, 7TV) do canal especificado. O comando envia a lista de emotes em partes, respeitando o limite de caracteres do chat.";
allEmotesCommand.examples = [
  {
    description: "Listar todos os emotes do canal atual",
    input: "!allemotes",
    output: "FeelsDankMan PepeLaugh peepoHappy monkaS Pog forsenE forsenCD ... (em várias mensagens)",
  },
  {
    description: "Listar todos os emotes de um canal específico",
    input: "!allemotes canalexemplo",
    output: "FeelsDankMan PepeLaugh peepoHappy ... (em várias mensagens, do canalexemplo)",
  },
];

module.exports = { allEmotesCommand };
