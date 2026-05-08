const path = require("path");
const { loadUserCookieStats, getTimeUntilNext9AM } = require("./cookie");

const cookieDiarioCommand = async (message) => {
  const isUserPlus =
    (await fb.db.get("users", { userid: message.senderUserID }))?.isPlus ==
    true;
  const userCookieStats = await loadUserCookieStats(message.senderUserID);
  if (!userCookieStats) {
    await fb.db.insertTemplate("cookie", { message, isUserPlus });
    return {
      reply: `Você ${
        isUserPlus
          ? "resgatou seus 2 cookies diários"
          : "resgatou seu 1 cookie diário"
      } e agora tem ${isUserPlus ? 2 : 1} cookies! ${
        isUserPlus ? "(Plus ⭐)" : ""
      } 🍪`,
    };
  }

  if (userCookieStats.claimedToday) {
    return {
      reply: `Você já resgatou o seu cookie diário hoje. Volte em ${getTimeUntilNext9AM()} para resgatar o seu cookie diário novamente ⌛`,
    };
  }

  // check if got stolen
  let stolenExtraString = "";
  if (userCookieStats.gotStolenBy != null) {
    const stealerUsername = (
      await fb.api.helix.getUserByID(userCookieStats.gotStolenBy)
    )?.displayName;
    if (userCookieStats.gotStolen == 0) {
      stolenExtraString += ` ${stealerUsername} tentou roubar você mas não sucedeu ⚠️`;
    } else {
      stolenExtraString += ` Durante a noite, ${stealerUsername} roubou ${userCookieStats.gotStolen} cookies seus! ⚠️`;
    }
  }

  await fb.db.update(
    "cookie",
    { userId: message.senderUserID },
    {
      $set: {
        total: userCookieStats.total + (isUserPlus ? 2 : 1),
        claimedToday: true,
      },
    }
  );
  return {
    reply: `Você ${
      isUserPlus
        ? "resgatou seus 2 cookies diários"
        : "resgatou seu 1 cookie diário"
    } e agora tem ${(
      userCookieStats.total + (isUserPlus ? 2 : 1)
    ).toLocaleString("fr-FR")} cookies! ${
      isUserPlus ? "(Plus ⭐)" : ""
    } 🍪 ${stolenExtraString}`,
  };
};

cookieDiarioCommand.commandName = "cd";
cookieDiarioCommand.aliases = ["cd"];
cookieDiarioCommand.shortDescription = "Resgate o seu cookie diário";
cookieDiarioCommand.cooldown = 5000;
cookieDiarioCommand.cooldownType = "user";
cookieDiarioCommand.whisperable = true;
cookieDiarioCommand.description =
  "Uso: !cd; Resposta esperada: Você resgatou seu cookie diário e agora tem {cookies}";
cookieDiarioCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  cookieDiarioCommand,
};
