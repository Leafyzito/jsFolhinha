const fs = require("fs");
const path = require("path");

const dungeonFilePath = path.join(__dirname, "dungeons.json");
const dungeonData = (() => {
  try {
    return JSON.parse(fs.readFileSync(dungeonFilePath, "utf8"));
  } catch (err) {
    console.error("Error reading dungeons.json:", err);
    return null;
  }
})();

async function loadUserDungeonStats(message) {
  const userDungeonStats = await fb.db.get("dungeon", {
    userId: message.senderUserID,
  });
  if (!userDungeonStats) {
    return await fb.db.insertTemplate("dungeon", { message });
  }

  return userDungeonStats;
}

function getFormattedRemainingTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const secondsLeft = seconds % 60;
    return `${minutes}m ${secondsLeft}s`;
  }

  const hours = Math.floor(minutes / 60);
  const minutesLeft = minutes % 60;
  const secondsLeft = seconds % 60;

  return `${hours}h ${minutesLeft}m ${secondsLeft}s`;
}

async function checkDungeonCooldown(userDungeonStats) {
  const currentTime = Math.floor(Date.now() / 1000);
  const cooldownEndTime =
    userDungeonStats.lastDungeon + userDungeonStats.cooldown;

  if (cooldownEndTime > currentTime) {
    const remainingTime = getFormattedRemainingTime(
      cooldownEndTime - currentTime
    );
    return [false, remainingTime];
  }

  return [true, ""];
}

async function setNewCooldown(message, winOrLose) {
  const currentTime = Math.floor(Date.now() / 1000);
  let newCooldown;
  if (winOrLose === "win") {
    newCooldown = Math.floor(Math.random() * (2 * 60 * 60) + 30 * 60); // 30 minutes to 2 hours
  } else if (winOrLose === "lose") {
    newCooldown = Math.floor(Math.random() * (10 * 60) + 20 * 60); // 20 to 30 minutes
  }
  await fb.db.update(
    "dungeon",
    { userId: message.senderUserID },
    { $set: { lastDungeon: currentTime, cooldown: newCooldown } }
  );

  return getFormattedRemainingTime(newCooldown);
}

const dungeonCommand = async (message) => {
  if (message.args.length !== 1) {
    const userOption = message.args[1].toLowerCase();
    const targetUser =
      message.args[2]?.replace(/^@/, "") || message.senderUsername;
    const targetId =
      targetUser.toLowerCase() === message.senderUsername
        ? message.senderUserID
        : (await fb.api.helix.getUserByUsername(targetUser))?.id;

    // MARKER: show
    if (["show", "stats", "mostrar", "level", "lvl"].includes(userOption)) {
      const userDungeonStats = await fb.db.get("dungeon", { userId: targetId });
      if (!userDungeonStats) {
        return {
          reply: `${targetUser} ainda não explorou nenhuma dungeon`,
        };
      }

      const winrate =
        (userDungeonStats.wins /
          (userDungeonStats.wins + userDungeonStats.losses)) *
        100;
      return {
        reply: `${targetUser} tem ${Math.round(
          userDungeonStats.xp
        ).toLocaleString("fr-FR")} XP 🌟 está no nível ${
          userDungeonStats.level
        } com ${userDungeonStats.wins + userDungeonStats.losses} dungeons ⚔️ (${
          userDungeonStats.wins
        } vitórias e ${userDungeonStats.losses} derrotas - ${winrate.toFixed(
          2
        )}% winrate)`,
      };
    }

    // MARKER: top
    if (["top", "ranking", "rank", "leaderboard", "lb"].includes(userOption)) {
      let rankOption = message.args[2]?.toLowerCase() || "xp";
      if (
        !["xp", "level", "lvl", "win", "wins", "loss", "losses"].includes(
          rankOption
        )
      ) {
        rankOption = "xp";
      }

      let sortField;
      if (["level", "lvl"].includes(rankOption)) {
        sortField = "level";
      } else if (["win", "wins"].includes(rankOption)) {
        sortField = "wins";
      } else if (["loss", "losses"].includes(rankOption)) {
        sortField = "losses";
      } else {
        sortField = "xp";
      }

      const top5 = await fb.db.aggregate("dungeon", [
        { $sort: { [sortField]: -1 } },
        { $limit: 5 },
      ]);

      if (!top5.length) {
        return {
          reply: "Algo deu errado. Tente novamente ou contate o dev",
        };
      }

      let reply = `Top 5 ${sortField}: `;
      for (let i = 0; i < top5.length; i++) {
        const username =
          (await fb.api.helix.getUserByID(top5[i].userId))?.displayName ||
          `id: ${top5[i].userId}`;
        reply += `${i + 1}º ${username}: (${Math.round(
          top5[i][sortField]
        ).toLocaleString("fr-FR")})`;

        if (i !== top5.length - 1) {
          reply += ", ";
        }
      }
      return {
        reply: reply + "⚔️",
      };
    }
  }

  // MARKER: main dungeon logic
  const userDungeonStats = await loadUserDungeonStats(message);
  const [canDungeon, remainingTime] =
    await checkDungeonCooldown(userDungeonStats);
  if (!canDungeon) {
    return {
      reply: `Você se sente cansado... Só vai se sentir capaz de explorar novamente em ${remainingTime} ⏰`,
    };
  }

  const check = {
    senderUserID: message.senderUserID,
    senderUsername: message.senderUsername,
    channelName: message.channelName,
    content: [
      "1",
      "2",
      `${message.prefix}1`,
      `${message.prefix}2`,
      `${message.prefix}d 1`,
      `${message.prefix}d 2`,
      `${message.prefix}dungeon 1`,
      `${message.prefix}dungeon 2`,
    ],
  };

  const dungeon = dungeonData[Math.floor(Math.random() * dungeonData.length)];
  fb.log.reply(
    message,
    `${fb.utils.capitalize(dungeon.quote)} você quer ${
      dungeon["1"].option
    } ou ${dungeon["2"].option}? Tem 10 segundos para responder (1 ou 2)`
  );

  const userResponse = await fb.utils.waitForMessage(check, 10_000);
  if (!userResponse) {
    // if user level is 0, delete the dungeon stats
    if (userDungeonStats.level === 0) {
      await fb.db.delete("dungeon", { userId: message.senderUserID });
    }
    // end it here if no response from user
    return;
  }

  const resMessage = userResponse.messageText.replace(message.prefix, "");
  let userOption;
  if (resMessage.startsWith("dungeon")) {
    userOption = resMessage.replace("dungeon", "").trim();
  } else if (resMessage.startsWith("d")) {
    userOption = resMessage.replace("d", "").trim();
  } else {
    userOption = resMessage.trim();
  }

  let result = fb.utils.randomInt(1, 3) <= 2 ? "win" : "lose"; // 2/3 chance of winning
  if (userDungeonStats.level <= 1) {
    // if user level is 1, force win
    result = "win";
  }

  let responseMessage = `${fb.utils.capitalize(dungeon.quote)} Você decide ${
    dungeon[userOption].option
  } e `;

  if (result === "win") {
    const experienceGain =
      fb.utils.randomInt(50, 75) + 3 * userDungeonStats.level;
    const experienceNeededForLvlUp =
      100 * userDungeonStats.level +
      25 * ((userDungeonStats.level * (userDungeonStats.level + 1)) / 2);

    if (userDungeonStats.xp + experienceGain >= experienceNeededForLvlUp) {
      const emote = await fb.emotes.getEmoteFromList(
        message.channelName,
        fb.emotes.pogEmotes,
        "PogChamp"
      );

      await fb.db.update(
        "dungeon",
        { userId: message.senderUserID },
        { $inc: { xp: experienceGain, wins: 1, level: 1 } }
      );

      const timeToWait = await setNewCooldown(message, result);
      responseMessage += `${dungeon[userOption][result]}! [+${Math.round(
        experienceGain
      ).toLocaleString("fr-FR")} ⇒ ${Math.round(
        userDungeonStats.xp + experienceGain
      ).toLocaleString("fr-FR")} XP] ⬆ subiu para o nível ${
        userDungeonStats.level + 1
      }! ${emote} (descanse por ${timeToWait} ⏰)`;
    } else {
      await fb.db.update(
        "dungeon",
        { userId: message.senderUserID },
        { $inc: { xp: experienceGain, wins: 1 } }
      );

      const timeToWait = await setNewCooldown(message, result);
      responseMessage += `${dungeon[userOption][result]}! [+${Math.round(
        experienceGain
      ).toLocaleString("fr-FR")} ⇒ ${Math.round(
        userDungeonStats.xp + experienceGain
      ).toLocaleString("fr-FR")} XP] (descanse por ${timeToWait} ⏰)`;
    }
  } else {
    await fb.db.update(
      "dungeon",
      { userId: message.senderUserID },
      { $inc: { losses: 1 } }
    );
    const timeToWait = await setNewCooldown(message, result);
    responseMessage += `${
      dungeon[userOption][result]
    }! [+0 ⇒ ${userDungeonStats.xp.toLocaleString(
      "fr-FR"
    )} XP] (descanse por ${timeToWait} ⏰)`;
  }

  return {
    reply: responseMessage,
  };
};

dungeonCommand.commandName = "dungeon";
dungeonCommand.aliases = ["dungeon", "d"];
dungeonCommand.shortDescription =
  "Entre em uma dungeon e escolha o seu destino";
dungeonCommand.cooldown = 30_000;
dungeonCommand.cooldownType = "user";
dungeonCommand.whisperable = true;
dungeonCommand.description = `Você entrará em uma dungeon aleatória e poderá escolher entre 2 destinos, sendo que apenas 1 deles lhe dará XP

A sua escolha é feita ao mandar "1" ou "2" no chat quando o bot lhe apresentar a dungeon
Após cada dungeon, o usuário entrará em um cooldown aleatório de 30 minutos a 2 horas e 30 minutos

!Dungeon show: Exibe estatísticas de dungeon. Quando não mencionado um usuário, exibirá as estatísticas de quem realizou o comando.

!Dungeon top: Exibe os 5 usuários com mais XP, nível, vitórias ou derrotas. Use "!dungeon top xp/level/win/loss" para escolher o que será usado para classificar os usuários

O XP ganho depende do nível que você atingiu, e é calculado assim:
XP = 50~75 + 3 * Nível do player

O XP necessário para subir de nível é calculado assim:
XP necessário para subir de nível = 100 * Nível do player + 25 * (Nível do player * (Nível do player + 1) / 2)`;
dungeonCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  dungeonCommand,
  dungeonData,
  loadUserDungeonStats,
  getFormattedRemainingTime,
  checkDungeonCooldown,
  setNewCooldown,
};
