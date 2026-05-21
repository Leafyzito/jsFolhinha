const fs = require("fs");
const path = require("path");

function getTimeUntilNext9AM() {
  const now = new Date();
  let next9AM = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    9,
    0,
    0
  );

  // If it's already past 9 AM today, calculate time until 9 AM tomorrow
  if (now >= next9AM) {
    next9AM = new Date(next9AM.getTime() + 24 * 60 * 60 * 1000);
  }

  return fb.utils.relativeTime(next9AM, true, true);
}

const cookieFrases = fs.readFileSync(
  path.join(__dirname, "cookie_frases.txt"),
  "utf8"
);

async function loadUserCookieStats(targetId) {
  const findFilter = { userId: targetId };
  const userCookieStats = await fb.db.get("cookie", findFilter);
  if (!userCookieStats) {
    return null;
  }
  return userCookieStats;
}

async function buildCookieLeaderboardReply(
  message,
  sortField,
  intro,
  youAreSuffix,
  trailingEmoji
) {
  const pipeline = [
    { $match: { userId: { $ne: process.env.BOT_USERID } } },
    {
      $setWindowFields: {
        sortBy: { [sortField]: -1 },
        output: { leaderboardRank: { $documentNumber: {} } },
      },
    },
    {
      $facet: {
        top5: [
          { $match: { leaderboardRank: { $lte: 5 } } },
          { $sort: { leaderboardRank: 1 } },
        ],
        sender: [
          { $match: { userId: message.senderUserID } },
          { $limit: 1 },
          {
            $project: {
              leaderboardRank: 1,
              userId: 1,
              [sortField]: 1,
            },
          },
        ],
      },
    },
  ];

  const [facetResult] = await fb.db.aggregate("cookie", pipeline);
  const top5 = facetResult?.top5 ?? [];
  const senderRows = facetResult?.sender ?? [];

  if (top5.length === 0) {
    return {
      reply: `Algo deu errado. Tente novamente ou contate o dev`,
    };
  }

  let reply = intro;
  for (let i = 0; i < top5.length; i++) {
    const user = top5[i];
    const username = (await fb.api.helix.getUserByID(user.userId))?.displayName;
    reply += `${i + 1}º ${username}: (${user[sortField]})`;
    if (i !== top5.length - 1) {
      reply += ", ";
    }
  }

  const inTop5 = top5.some((u) => u.userId === message.senderUserID);
  const senderRow = senderRows[0];
  if (!inTop5 && senderRow && senderRow.leaderboardRank != null) {
    reply += `. Você está em ${senderRow.leaderboardRank}º com ${
      senderRow[sortField]
    } ${youAreSuffix}`;
  }

  return { reply: `${reply} ${trailingEmoji}` };
}

const cookieCommand = async (message) => {
  if (message.args.length < 2) {
    return {
      reply: `Está com dúvidas sobre os comandos de cookie? Acesse https://folhinhabot.com/comandos/cookie 😁`,
    };
  }

  const isUserPlus =
    (await fb.db.get("users", { userid: message.senderUserID }))?.isPlus ==
    true;

  const targetCommand = message.args[1].toLowerCase();

  // MARKER: cd
  if (["diario", "diário", "daily"].includes(targetCommand)) {
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
        reply: `Você já resgatou o seu cookie diário hoje. Espere ${getTimeUntilNext9AM()} para resgatar o seu cookie diário novamente ⌛`,
      };
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
      } e agora tem ${userCookieStats.total + (isUserPlus ? 2 : 1)} cookies! ${
        isUserPlus ? "(Plus ⭐)" : ""
      } 🍪`,
    };
  }

  // MARKER: abrir
  if (["abrir", "open"].includes(targetCommand)) {
    const userCookieStats = await loadUserCookieStats(message.senderUserID);

    if (!userCookieStats || userCookieStats.total <= 0) {
      return {
        reply: `Você não tem cookies para abrir. Use ${message.prefix}cd para resgatar o cookie diário`,
      };
    }

    await fb.db.update(
      "cookie",
      { userId: message.senderUserID },
      {
        $set: {
          total: userCookieStats.total - 1,
          opened: userCookieStats.opened + 1,
        },
      }
    );
    const randomFrase = fb.utils
      .randomChoice(cookieFrases.split("\n"))
      .replace(/[\n\r]/g, " ");
    return {
      reply: `${randomFrase} 🥠`,
    };
  }

  // MARKER: comer
  if (["comer", "eat"].includes(targetCommand)) {
    const userCookieStats = await loadUserCookieStats(message.senderUserID);

    if (!userCookieStats || userCookieStats.total <= 0) {
      return {
        reply: `Você não tem cookies para comer. Use ${message.prefix}cd para resgatar o cookie diário`,
      };
    }

    await fb.db.update(
      "cookie",
      { userId: message.senderUserID },
      {
        $set: {
          total: userCookieStats.total - 1,
          eaten: userCookieStats.eaten + 1,
        },
      }
    );

    const cookieFlavors = [
      "cera de ouvido",
      "milkshake de pizza",
      "madeira",
      "grama",
      "preço do medo abundante de todas as verdades",
      "labubu",
      "chocolate",
      "pistache",
      "morango",
      "uva",
      "leite condensado",
      "calzone",
      "strogonoff",
      "limão",
      "cebola",
      "pasta do núcleo de estrela de neutron",
      "urânio",
      "azeitona",
    ];
    const randomFlavor = fb.utils.randomChoice(cookieFlavors);
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["tasty, bussing", "bussin"],
      "🍪"
    );

    return {
      reply: `Você comeu um cookie e ele tinha sabor de ${randomFlavor} ${emote}`,
    };
  }

  // MARKER: gift
  if (["oferecer", "gift", "give", "oferta", "offer"].includes(targetCommand)) {
    const userCookieStats = await loadUserCookieStats(message.senderUserID);

    if (!userCookieStats) {
      return {
        reply: `Você não tem cookies para oferecer. Use ${message.prefix}cd para resgatar o seu cookie diário`,
      };
    }
    if (userCookieStats.total <= 0) {
      return {
        reply: `Você não tem cookies para oferecer. Use ${message.prefix}cd para resgatar o seu cookie diário`,
      };
    }

    if (userCookieStats.giftedToday) {
      return {
        reply: `Você já ofereceu um cookie hoje. Espere ${getTimeUntilNext9AM()} para oferecer novamente ⌛`,
      };
    }

    let giftTarget = message.args[2]?.replace(/^@/, "");
    let targetUserID;

    if (!giftTarget) {
      return {
        reply: `Use o formato: ${message.prefix}cookie gift <usuário>`,
      };
    }

    if (giftTarget.toLowerCase() === message.senderUsername.toLowerCase()) {
      return {
        reply: `Você não pode oferecer cookies para si mesmo Stare`,
      };
    }

    // Apply "random" selection logic, like in steal
    if (giftTarget.toLowerCase() == "random") {
      const [randomUser] = await fb.db.aggregate("cookie", [
        {
          $match: {
            userId: {
              $nin: [message.senderUserID, process.env.BOT_USERID],
            },
          },
        },
        { $sample: { size: 1 } },
      ]);

      if (!randomUser) {
        return {
          reply: `Não existe ninguém para oferecer? @${process.env.DEV_NICK}`,
        };
      }

      const giftTargetUserInfo = await fb.api.helix.getUserByID(
        randomUser.userId
      );
      if (!giftTargetUserInfo) {
        return {
          reply: `Erro ao escolher um usuário aleatório para presentear, tente novamente.`,
        };
      }

      targetUserID = giftTargetUserInfo.id;
      giftTarget = giftTargetUserInfo.displayName;
    }

    if (!targetUserID) {
      targetUserID = (await fb.api.helix.getUserByUsername(giftTarget))?.id;
      if (!targetUserID) {
        return {
          reply: `Esse usuário não existe`,
        };
      }
    }

    const targetUserCookieStats = await loadUserCookieStats(targetUserID);
    if (!targetUserCookieStats) {
      return {
        reply: `${giftTarget} ainda não foi registrado (nunca usou ${message.prefix}cd)`,
      };
    }

    await fb.db.update(
      "cookie",
      { userId: message.senderUserID },
      {
        $set: {
          total: userCookieStats.total - 1,
          gifted: userCookieStats.gifted + 1,
          giftedToday: true,
        },
      }
    );
    await fb.db.update(
      "cookie",
      { userId: targetUserID },
      {
        $set: {
          beenGifted: targetUserCookieStats.beenGifted + 1,
          total: targetUserCookieStats.total + 1,
        },
      }
    );
    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["peepoCookie"],
      "🎁🍪"
    );
    return {
      reply: `Você ofereceu um cookie para ${giftTarget} ${emote}`,
    };
  }

  // MARKER: show
  if (["stats", "mostrar", "show"].includes(targetCommand)) {
    const targetUser = message.args[2]
      ? message.args[2].replace(/^@/, "")
      : message.senderUsername;
    const targetUserID =
      targetUser !== message.senderUsername
        ? (await fb.api.helix.getUserByUsername(targetUser))?.id
        : message.senderUserID;
    if (!targetUserID) {
      return {
        reply: `Esse usuário não existe`,
      };
    }

    const userCookieStats = await loadUserCookieStats(targetUserID);
    if (!userCookieStats) {
      return {
        reply: `${targetUser} ainda não foi registrado (nunca usou ${message.prefix}cd)`,
      };
    }

    const total = userCookieStats.total || 0;
    const opened = userCookieStats.opened || 0;
    const eaten = userCookieStats.eaten || 0;
    const gifted = userCookieStats.gifted || 0;
    const beenGifted = userCookieStats.beenGifted || 0;
    const sloted = userCookieStats.sloted || 0;
    const totalStolen = userCookieStats.totalStolen || 0;
    const totalGotStolen = userCookieStats.totalGotStolen || 0;
    return {
      reply: `${targetUser} tem ${total} cookies, 🥠 abriu ${opened}, 🍽️ comeu ${eaten}, 🎁 ofereceu ${gifted}, 🎁 foi presenteado com ${beenGifted}, 🎰 apostou ${sloted}, 💰 roubou ${totalStolen} e 🏚️ foi roubado ${totalGotStolen} vezes`,
    };
  }

  // MARKER: top
  if (["top", "ranking", "rank", "leaderboard", "lb"].includes(targetCommand)) {
    // MARKER: top gift
    if (["gift", "gifts", "oferta", "gifted"].includes(message.args[2])) {
      return await buildCookieLeaderboardReply(
        message,
        "gifted",
        `Top 5 mais cookies oferecidos: `,
        "cookies oferecidos",
        "🎁"
      );
    }

    // MARKER: top slot
    if (["aposta", "apostas", "slot", "slots"].includes(message.args[2])) {
      return await buildCookieLeaderboardReply(
        message,
        "sloted",
        `Top 5 cookies apostados: `,
        "cookies apostados",
        "🍪"
      );
    }

    // MARKER: top cookies
    return await buildCookieLeaderboardReply(
      message,
      "total",
      `Top 5 quantidade de cookies: `,
      "cookies",
      "🍪"
    );
  }

  // MARKER: slot
  if (["apostar", "slot", "slotmachine"].includes(targetCommand)) {
    const userCookieStats = await loadUserCookieStats(message.senderUserID);
    if (!userCookieStats || userCookieStats.total <= 0) {
      return {
        reply: `Você não tem cookies para apostar. Use ${message.prefix}cd para resgatar o seu cookie diário`,
      };
    }

    if (userCookieStats.usedSlot) {
      return {
        reply: `Você já apostou hoje. Espere ${getTimeUntilNext9AM()} para apostar novamente ⌛`,
      };
    }

    // Current chances: https://f.feridinha.com/Hk1Am.png
    // TODO: add joker card 🃏 with 1% chance of appearing
    // - if 2 jokers, add 5% of current jackpot to jackpot
    // - if 3 jokers, give 5% of current jackpot to user

    // const getSlotSymbol = () => {
    //   // 1% chance for joker, 99% chance for regular symbols
    //   const isJoker = Math.random() < 0.01;
    //   if (isJoker) {
    //     return "🃏";
    //   }
    //   return fb.utils.randomChoice(["🍒", "🍊", "🍋", "🍇", "🍉", "🍓"]);
    // };
    // const slotResults2 = [getSlotSymbol(), getSlotSymbol(), getSlotSymbol()];

    // const currentJackpot = await fb.db.get("cookie", {
    //   userId: process.env.BOT_USERID,
    // });

    const slotResults = [
      fb.utils.randomChoice(["🍒", "🍊", "🍋", "🍇", "🍉", "🍓"]),
      fb.utils.randomChoice(["🍒", "🍊", "🍋", "🍇", "🍉", "🍓"]),
      fb.utils.randomChoice(["🍒", "🍊", "🍋", "🍇", "🍉", "🍓"]),
    ];
    let reply = `[${slotResults[0]}${slotResults[1]}${slotResults[2]}] `;

    if (
      slotResults[0] === slotResults[1] &&
      slotResults[0] === slotResults[2]
    ) {
      const emote = await fb.emotes.getEmoteFromList(
        message.channelName,
        fb.emotes.pogEmotes,
        "PogChamp"
      );
      reply += `você apostou 1 cookie e ganhou 10 cookies! ${emote}`;
      reply += ` [+9 ⇒ ${userCookieStats.total + 9}]`;

      await fb.db.update(
        "cookie",
        { userId: message.senderUserID },
        {
          $set: {
            total: userCookieStats.total + 9,
            sloted: userCookieStats.sloted + 1,
            usedSlot: true,
          },
        }
      );
    } else if (
      slotResults[0] === slotResults[1] ||
      slotResults[0] === slotResults[2] ||
      slotResults[1] === slotResults[2]
    ) {
      reply += `você apostou 1 cookie e ganhou 3 cookies!`;
      reply += ` [+2 ⇒ ${userCookieStats.total + 2}]`;

      await fb.db.update(
        "cookie",
        { userId: message.senderUserID },
        {
          $set: {
            total: userCookieStats.total + 2,
            sloted: userCookieStats.sloted + 1,
            usedSlot: true,
          },
        }
      );
    } else {
      const emote = await fb.emotes.getEmoteFromList(
        message.channelName,
        fb.emotes.sadEmotes,
        ":("
      );
      // reply += `você apostou 1 cookie e ficou sem ele... (adicionado ao jackpot ⇒ ${currentJackpot[0].total + 1}) ${emote}`;
      reply += `você apostou 1 cookie e ficou sem ele... ${emote}`;
      reply += ` [-1 ⇒ ${userCookieStats.total - 1}]`;

      await fb.db.update(
        "cookie",
        { userId: message.senderUserID },
        {
          $set: {
            total: userCookieStats.total - 1,
            sloted: userCookieStats.sloted + 1,
            usedSlot: true,
          },
        }
      );

      // increase jackpot by adding 1 cookie to folhinhabot
      // await client.db.update('cookie', { userId: process.env.BOT_USERID }, { $inc: { total: 1 } });
    }

    return {
      reply: reply,
    };
  }

  // MARKER: steal
  if (["roubar", "steal"].includes(targetCommand)) {
    let stealTarget = message.args[2]?.replace(/^@/, "") || null;
    let stealTargetUserID;
    if (!stealTarget) {
      stealTarget = "random";
    }

    if (stealTarget.toLowerCase() === message.senderUsername.toLowerCase()) {
      return {
        reply: `Você não pode roubar cookies de si mesmo Stare`,
      };
    }

    if (stealTarget.toLowerCase() === process.env.BOT_USERNAME.toLowerCase()) {
      return {
        reply: `Para ow Stare`,
      };
    }

    if (stealTarget.toLowerCase() == "random") {
      const [randomUser] = await fb.db.aggregate("cookie", [
        {
          $match: {
            userId: {
              $nin: [message.senderUserID, process.env.BOT_USERID],
            },
          },
        },
        { $sample: { size: 1 } },
      ]);

      if (!randomUser) {
        return {
          reply: `Não existe ninguém com cookies? @${process.env.DEV_NICK}`,
        };
      }

      const stealTargetUserInfo = await fb.api.helix.getUserByID(
        randomUser.userId
      );
      if (!stealTargetUserInfo) {
        return {
          reply: `Erro ao escolher um usuário aleatório para roubar, tente novamente.`,
        };
      }

      stealTargetUserID = stealTargetUserInfo.id;
      stealTarget = stealTargetUserInfo.displayName;
    }

    if (!stealTargetUserID) {
      stealTargetUserID = (await fb.api.helix.getUserByUsername(stealTarget))
        ?.id;
      if (!stealTargetUserID) {
        return {
          reply: `Esse usuário não existe`,
        };
      }
    }

    const userCookieStats = await loadUserCookieStats(message.senderUserID);
    if (!userCookieStats) {
      return {
        reply: `Você ainda não iniciou a sua coleção de cookies. Use ${message.prefix}cd para resgatar o seu cookie diário`,
      };
    }

    if (userCookieStats.stolenToday) {
      return {
        reply: `Você já roubou alguém hoje. Espere ${getTimeUntilNext9AM()} para poder roubar alguém novamente ⌛`,
      };
    }

    const targetCookieStats = await loadUserCookieStats(stealTargetUserID);
    if (!targetCookieStats) {
      const emote = await fb.emotes.getEmoteFromList(
        message.channelName,
        fb.emotes.sadEmotes,
        ":("
      );
      return {
        reply: `${stealTarget} nunca começou uma coleção de cookies ${emote}`,
      };
    }

    if (targetCookieStats.gotStolenBy != null) {
      const emote = await fb.emotes.getEmoteFromList(
        message.channelName,
        fb.emotes.sadEmotes,
        ":("
      );
      return {
        reply: `${stealTarget} já foi roubado hoje, então não tem mais o que roubar por hoje ${emote}`,
      };
    }

    // Probabilidades (em 100):
    //  criticalSuccess: 0-4: 5% (stealer: +2 / target: -2)
    //  sucess: 5-39: 35% (stealer: +1 / target: -1)
    //  fail: 40-69: 30% (stealer: +0)
    //  criticalFail: 70-84: 15% (stealer: -2)
    //  bothLose: 85-94: 10% (stealer: -1 / target: -1)
    //  ambush: 95-99: 5% (stealer: -1 / target +1)
    const roll = fb.utils.randomInt(0, 100);
    let resultType = "";
    if (roll < 5) {
      resultType = "criticalSuccess";
    } else if (roll < 40) {
      resultType = "success";
    } else if (roll < 70) {
      resultType = "fail";
    } else if (roll < 85) {
      resultType = "criticalFailure";
    } else if (roll < 95) {
      resultType = "bothLose";
    } else {
      resultType = "ambush";
    }

    const spookyAnimals = ["panda vermelho", "gambá", "tamanduá"]; // sarcastic spooky animals
    const COOKIE_STEAL_POSSIBILITIES = {
      criticalSuccess: [
        `Você ia roubar um cookie de ${stealTarget} e acabou encontrando outro pelo caminho! [+2 ⇒ ${(
          userCookieStats.total + 2
        ).toLocaleString("fr-FR")}] 🍪`,
      ],
      success: [
        `Você roubou 1 cookie de ${stealTarget} [+1 ⇒ ${(
          userCookieStats.total + 1
        ).toLocaleString("fr-FR")}] 🍪`,
      ],
      fail: [
        `Você roubou um cookie de ${stealTarget} mas acabou perdendo ele pelo caminho [+0 ⇒ ${userCookieStats.total.toLocaleString(
          "fr-FR"
        )}] 🍪`,
      ],
      criticalFailure: [
        `Você quase roubou um cookie de ${stealTarget} mas se assustou com um ${fb.utils.randomChoice(
          spookyAnimals
        )} e perdeu 2 cookies [-2 ⇒ ${(
          userCookieStats.total - 2
        ).toLocaleString("fr-FR")}] 🍪`,
      ],
      bothLose: [
        `Você ia roubar um cookie de ${stealTarget} mas acabou chocando contra ele e os cookies dos dois se quebraram [-1 pra ambos ⇒ ${(
          userCookieStats.total - 1
        ).toLocaleString("fr-FR")} | ${(
          targetCookieStats.total - 1
        ).toLocaleString("fr-FR")}] 🍪`,
      ],
      ambush: [
        `Você ia roubar um cookie de ${stealTarget} mas ele estava preparado para emboscar você e lhe roubou 1 cookie [-1, +1 para o alvo ⇒ ${(
          userCookieStats.total - 1
        ).toLocaleString("fr-FR")} | ${(
          targetCookieStats.total + 1
        ).toLocaleString("fr-FR")}] 🍪`,
      ],
    };

    const replyMsg = COOKIE_STEAL_POSSIBILITIES[resultType][0];

    // Track amounts stolen and per outcome for updating db fields
    let cookiesStolen = 0;
    let cookiesLost = 0;

    if (resultType === "criticalSuccess") {
      // Rouba 2 do target
      cookiesStolen = 2;
      await fb.db.update(
        "cookie",
        { userId: message.senderUserID },
        {
          $set: {
            total: userCookieStats.total + cookiesStolen,
            stolenToday: true,
          },
          $inc: {
            totalStolen: cookiesStolen,
          },
        }
      );
      await fb.db.update(
        "cookie",
        { userId: stealTargetUserID },
        {
          $set: {
            total: targetCookieStats.total - cookiesStolen,
            gotStolen: cookiesStolen,
            gotStolenBy: message.senderUserID,
          },
          $inc: {
            totalGotStolen: cookiesStolen,
          },
        }
      );
    } else if (resultType === "success") {
      // Rouba 1 cookie
      cookiesStolen = 1;
      await fb.db.update(
        "cookie",
        { userId: message.senderUserID },
        {
          $set: {
            total: userCookieStats.total + cookiesStolen,
            stolenToday: true,
          },
          $inc: {
            totalStolen: cookiesStolen,
          },
        }
      );
      await fb.db.update(
        "cookie",
        { userId: stealTargetUserID },
        {
          $set: {
            total: targetCookieStats.total - cookiesStolen,
            gotStolen: cookiesStolen,
            gotStolenBy: message.senderUserID,
          },
          $inc: {
            totalGotStolen: cookiesStolen,
          },
        }
      );
    } else if (resultType === "fail") {
      // Nada acontece, mas update user stolenToday and target gotStolenBy
      await fb.db.update(
        "cookie",
        { userId: message.senderUserID },
        {
          $set: {
            stolenToday: true,
          },
        }
      );
      await fb.db.update(
        "cookie",
        { userId: stealTargetUserID },
        {
          $set: {
            gotStolen: 0,
            gotStolenBy: message.senderUserID,
          },
        }
      );
    } else if (resultType === "criticalFailure") {
      // Perde 2 cookies
      cookiesLost = 2;
      await fb.db.update(
        "cookie",
        { userId: message.senderUserID },
        {
          $set: {
            total: userCookieStats.total - cookiesLost,
            stolenToday: true,
          },
        }
      );
    } else if (resultType === "bothLose") {
      // Ambos perdem 1
      cookiesLost = 1;
      await fb.db.update(
        "cookie",
        { userId: message.senderUserID },
        {
          $set: {
            total: userCookieStats.total - cookiesLost,
            stolenToday: true,
          },
        }
      );
      await fb.db.update(
        "cookie",
        { userId: stealTargetUserID },
        {
          $set: {
            total: targetCookieStats.total - cookiesLost,
            gotStolen: cookiesLost,
            gotStolenBy: message.senderUserID,
          },
          $inc: {
            totalGotStolen: cookiesLost,
          },
        }
      );
    } else if (resultType === "ambush") {
      // Emboscado pelo target: perde 1, target ganha 1
      cookiesStolen = 1;
      await fb.db.update(
        "cookie",
        { userId: message.senderUserID },
        {
          $set: {
            total: userCookieStats.total - cookiesStolen,
            stolenToday: true,
          },
        }
      );
      await fb.db.update(
        "cookie",
        { userId: stealTargetUserID },
        {
          $set: {
            total: targetCookieStats.total + cookiesStolen,
            gotStolen: 0,
            gotStolenBy: message.senderUserID,
          },
        }
      );
    }

    return {
      reply: replyMsg,
    };
  }

  return {
    reply: `Está com dúvidas sobre os comandos de cookie? Acesse https://folhinhabot.com/comandos/cookie 😁`,
  };
};

cookieCommand.commandName = "cookie";
cookieCommand.aliases = ["cookie", "cookies", "c"];
cookieCommand.shortDescription =
  "Faça várias coisas relacionadas com os cookies";
cookieCommand.cooldown = 5000;
cookieCommand.cooldownType = "user";
cookieCommand.whisperable = true;
cookieCommand.description = `!Cookie diario/daily: Receba um cookie. O comando poderá ser reutilizado todo dia a partir das cinco horas da manhã (horário de Brasília). Há de aliase o comando "cd" de mesma funcionalidade

!Cookie abrir: Abra um dos seus cookies para receber uma poderosa mensagem de reflexão

!Cookie comer: Coma um dos seus cookies deliciosos

!Cookie gift/give: Ofereça um dos seus cookies a outro usuário (ou "random"). Uma vez presenteado, poderá presentear novamente no próximo ciclo do cookie diário

!Cookie slot: Aposte um dos seus cookies e tenha a chance de ganhar 3 ou 10 cookies. Poderá apostar novamente no próximo ciclo do cookie diário

!Cookie roubar: Roube cookies de um usuário (ou "random"). Pode apenas roubar e ser roubado 1 vez por ciclo de cookie diário

!Cookie show: Exibe estatísticas de cookies. Quando não mencionado um usuário, exibirá as estatísticas de quem realizou o comando.

!Cookie top: Exiba os cinco usuários com mais cookies e a sua posição no ranking global. Use "!cookie top gift" e "!cookie top slot" para exibir os maiores presenteadores e apostadores, respectivamente, e a sua posição no ranking específico`;
cookieCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  cookieCommand,
  loadUserCookieStats,
  getTimeUntilNext9AM,
};
