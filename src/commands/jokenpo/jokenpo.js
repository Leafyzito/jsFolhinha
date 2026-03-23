let pendingPlayers = [];

const jokenpoCommand = async (message) => {
  if (pendingPlayers.includes(message.senderUserID)) {
    return {
      reply: `Termine a sua partida atual antes de iniciar outra`,
    };
  }

  const gameTarget = message.args[1]?.replace(/^@/, "");
  if (!gameTarget) {
    return {
      reply: `Desafie alguém para jogar jokenpo com ${message.prefix}jokenpo <usuário>`,
    };
  }

  if (gameTarget.toLowerCase() === message.senderUsername.toLowerCase()) {
    return {
      reply: `Você não pode jogar com você mesmo Stare`,
    };
  }

  if (gameTarget.toLowerCase() === "folhinhabot") {
    return {
      reply: `Quero não Stare`,
    };
  }

  const targetUserId = (await fb.api.helix.getUserByUsername(gameTarget))?.id;
  if (!targetUserId) {
    return {
      reply: `Esse usuário não existe`,
    };
  }

  // Check if target user is already in a game
  if (pendingPlayers.includes(targetUserId)) {
    return {
      reply: `${gameTarget} já está numa partida. Deixe ele terminar para poder jogar outra partida`,
    };
  }

  // Add players to pending list
  pendingPlayers.push(message.senderUserID);
  pendingPlayers.push(targetUserId);

  // Send challenge message
  const challengeMessage = `Você desafiou ${gameTarget} para um jogo de jokenpô. Ambos têm 30 segundos para enviar no meu susurro as suas jogadas (pedra, papel ou tesoura)`;
  fb.log.send(message.channelName, challengeMessage);

  // Wait for both players to respond using whisper
  const answers = {};

  // Wait for both players to respond simultaneously
  const playerResponses = await fb.utils.waitForMultipleWhispers(
    [
      {
        senderUserID: message.senderUserID,
        content: ["pedra", "papel", "tesoura"],
      },
      {
        senderUserID: targetUserId,
        content: ["pedra", "papel", "tesoura"],
      },
    ],
    30_000
  );

  // Process responses
  if (playerResponses[message.senderUserID]) {
    answers[message.senderUserID] =
      playerResponses[message.senderUserID].messageText;
  }

  if (playerResponses[targetUserId]) {
    answers[targetUserId] = playerResponses[targetUserId].messageText;
  }

  // Remove players from pending list
  pendingPlayers = pendingPlayers.filter(
    (player) => player !== message.senderUserID && player !== targetUserId
  );

  if (Object.keys(answers).length !== 2) {
    // Check which player didn't answer
    const players = [message.senderUsername, gameTarget];
    const playerWhoDidntAnswer = players.find((player, index) => {
      const userId = index === 0 ? message.senderUserID : targetUserId;
      return !answers[userId];
    });
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["pfff", "pffff", "pfft", "porvalo", "mock", "pointandlaugh", "wajaja"],
      "🤭"
    );

    if (Object.keys(answers).length === 1 && playerWhoDidntAnswer) {
      return {
        reply: `${playerWhoDidntAnswer} não respondeu, ficou com medo ${emote}`,
      };
    } else {
      return {
        reply: `Nenhum dos jogadores respondeu, ficaram com medo ${emote}`,
      };
    }
  }

  const user1Answer = answers[message.senderUserID];
  const user2Answer = answers[targetUserId];

  let gameResult = "";

  // Determine winner based on game rules
  const gameRules = {
    pedra: { papel: -1, tesoura: 1, pedra: 0 },
    papel: { tesoura: -1, pedra: 1, papel: 0 },
    tesoura: { pedra: -1, papel: 1, tesoura: 0 },
  };

  const user1Choice = user1Answer.toLowerCase();
  const user2Choice = user2Answer.toLowerCase();

  if (!gameRules[user1Choice]) {
    return {
      reply: `Algo deu errado eu acho, tente novamente. Se o erro persistir, entre em contato com o @${process.env.DEV_NICK}`,
    };
  }

  const result = gameRules[user1Choice][user2Choice];
  const emojis = { pedra: "🪨", papel: "📄", tesoura: "✂️" };

  if (result === 1) {
    gameResult = `${message.displayName} ${emojis[user1Choice]} X ${emojis[user2Choice]} ${gameTarget} - ${message.displayName} venceu! 🏆`;
  } else if (result === -1) {
    gameResult = `${message.displayName} ${emojis[user1Choice]} X ${emojis[user2Choice]} ${gameTarget} - ${gameTarget} venceu! 🏆`;
  } else {
    gameResult = `${message.displayName} ${emojis[user1Choice]} X ${emojis[user2Choice]} ${gameTarget} - É um empate!`;
  }

  return {
    reply: gameResult,
  };
};

jokenpoCommand.commandName = "jokenpo";
jokenpoCommand.aliases = ["jokenpo", "jokenpô", "pedrapapeltesoura", "ppt"];
jokenpoCommand.shortDescription =
  "Escolha um adversário para um jogo de jokenpô";
jokenpoCommand.cooldown = 10_000;
jokenpoCommand.cooldownType = "channel";
jokenpoCommand.whisperable = false;
jokenpoCommand.description = `Jogue uma partida de jokenpô com alguém do chat
As jogadas devem ser enviadas para o susurro do bot dentro de 30 segundos - pedra, papel ou tesoura`;
jokenpoCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${jokenpoCommand.commandName}/${jokenpoCommand.commandName}.js`;

module.exports = {
  jokenpoCommand,
};
