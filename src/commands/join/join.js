const joinCommand = async (message) => {
  const channelToJoin = message.senderUsername;
  const alreadyJoinedChannels = fb.twitch.anonClient.currentChannels.map((c) =>
    c.replace("#", "")
  );

  if (alreadyJoinedChannels.includes(channelToJoin)) {
    const canReuseMessageConfig =
      message.channelConfig &&
      message.channelConfig.channel &&
      message.channelConfig.channel.toLowerCase() ===
        channelToJoin.toLowerCase();

    const channelConfig = canReuseMessageConfig
      ? message.channelConfig
      : await fb.db.get("config", {
          channel: channelToJoin,
        });
    const channelPrefixes =
      Array.isArray(channelConfig?.prefix) && channelConfig.prefix.length > 0
        ? channelConfig.prefix
        : ["!"];
    const prefixLabel =
      channelPrefixes.length > 1
        ? `os meus prefixos lá são ${channelPrefixes.join(" ")}`
        : `o meu prefixo lá é ${channelPrefixes[0]}`;
    return {
      reply: `Eu já estou no seu chat! ${prefixLabel}`,
    };
  }

  return {
    reply: `Para convidar o bot para o seu chat ou um que você modera, acesse https://folhinhabot.com e convide por lá!`,
  };

  // await fb.utils.createNewChannelConfig(message.senderUserID);
  // const joinResult = fb.twitch.join([channelToJoin]);
  // if (!joinResult) {
  //   return {
  //     reply: `Erro ao entrar no chat ${channelToJoin}. Contacte o @${process.env.DEV_NICK}`,
  //   };
  // }

  // const emote = await fb.emotes.getEmoteFromList(
  //   channelToJoin,
  //   ["peepohey", "heyge"],
  //   "KonCha"
  // );
  // fb.log.send(
  //   channelToJoin,
  //   `${emote} Oioi! Fui convidado para me juntar aqui! Para saber mais sobre mim, pode usar !ajuda ou !comandos`
  // );

  // const happyEmote = await fb.emotes.getEmoteFromList(
  //   message.channelName,
  //   fb.emotes.happyEmotes
  // );

  // const channelId = (await fb.api.helix.getUserByUsername(channelToJoin))?.id;
  // if (channelId) {
  //   fb.log.whisper(
  //     channelId,
  //     `Caso tenha follow-mode ativado no seu chat, me dê cargo de moderador para conseguir falar lá :D`
  //   );
  // }

  // return {
  //   reply: `Entrei no chat ${message.senderUsername} com sucesso! Tô lá te esperando! ${happyEmote} Caso tenha follow-mode ativado, me dê cargo de moderador no seu chat para conseguir falar lá`,
  // };
};

joinCommand.commandName = "join";
joinCommand.aliases = ["join", "entrar"];
joinCommand.shortDescription = "Convide o bot para entrar no seu chat";
joinCommand.cooldown = 5000;
joinCommand.cooldownType = "user";
joinCommand.whisperable = true;
joinCommand.description = `Comando para convidar o Folhinha para entrar no seu chat ou um que você modera. 

Nota: Se o chat tiver follow-mode ativado, o bot precisará de cargo de moderador ou VIP para falar.`;
joinCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/commands/${joinCommand.commandName}/${joinCommand.commandName}.js`;

module.exports = {
  joinCommand,
};
