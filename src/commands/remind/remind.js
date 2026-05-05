const schedule = require("node-schedule");
const path = require("path");
const {
  clearNotifiedCacheForUser,
} = require("../../handlers/listener/reminder");

async function newRemind(
  message,
  targetId,
  targetUser,
  remindMessage,
  remindAt
) {
  const newRemindId = (await fb.db.count("remind", {}, true)) + 1;
  const remindInfo = {
    _id: newRemindId,
    senderId: message.senderUserID,
    receiverId: targetId,
    fromChannelId: message.channelID,
    remindMessage: remindMessage,
    remindTime: Math.floor(Date.now() / 1000),
    remindAt: remindAt,
    beenRead: false,
  };

  await fb.db.insert("remind", remindInfo);

  if (remindAt) {
    const job = createScheduledReminderJob(
      remindAt,
      newRemindId,
      message,
      targetUser,
      targetId,
      remindMessage
    );
    if (!fb.reminderJobs) {
      fb.reminderJobs = {};
    }
    fb.reminderJobs[newRemindId] = job;
  }

  return newRemindId;
}

// Helper function to format time parts for display
const formatTimeParts = (totalSeconds) => {
  const timeParts = [];
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) timeParts.push(`${days}d`);
  if (hours > 0) timeParts.push(`${hours}h`);
  if (minutes > 0) timeParts.push(`${minutes}m`);
  if (seconds > 0) timeParts.push(`${seconds}s`);

  return timeParts.join(" ");
};

// Helper function to check if user can receive reminders
const canUserReceiveReminders = async (targetUserId, senderUserID) => {
  const targetUserInfo = await fb.db.get("users", { userid: targetUserId });
  if (!targetUserInfo) return { canReceive: true }; // Default to true if user not found

  if (targetUserInfo.optoutRemind) {
    return { canReceive: false, reason: "optout" };
  }

  if (targetUserInfo.blocks && targetUserInfo.blocks.remind) {
    if (targetUserInfo.blocks.remind.includes(senderUserID)) {
      return { canReceive: false, reason: "blocked" };
    }
  }

  return { canReceive: true };
};

// Helper function to create scheduled reminder job
const createScheduledReminderJob = (
  remindAt,
  newRemindId,
  message,
  targetUser,
  targetUserId,
  remindMessage
) => {
  return schedule.scheduleJob(new Date(remindAt * 1000), async function () {
    // Verify the reminder has not been deleted externally
    const remindCheck = await fb.db.get("remind", { _id: newRemindId }, true);
    if (!remindCheck || remindCheck.beenRead) {
      return;
    }

    const reminderSender = await fb.api.helix.getUserByID(message.senderUserID);
    const reminderTime = fb.utils.relativeTime(remindCheck.remindTime, true);

    // Check for banned content in reminder message
    const channelData =
      message.channelConfig ||
      (await fb.db.get("config", {
        channelId: message.channelID,
      }));
    const channelName = channelData?.channel || message.channelName;
    const checkedMessage = fb.utils.checkRegex(remindMessage, channelName);
    const isBannedContent = checkedMessage.includes(
      "⚠️ Mensagem retida por conter conteúdo banido"
    );

    let finalRes;
    if (isBannedContent) {
      // Replace with banned content message format
      const senderName = reminderSender?.login || "Usuário deletado";
      finalRes = `${targetUser}, você tem um remind de ${senderName} que contém conteúdo banido. Veja o remind em https://folhinhabot.com/lembretes (ID ${newRemindId})`;
    } else {
      finalRes =
        reminderSender?.login === targetUser
          ? `@${targetUser}, lembrete de você mesmo há ${reminderTime}: ${remindMessage}`
          : `@${targetUser}, lembrete de @${
              reminderSender?.login || "Usuário deletado"
            } há ${reminderTime}: ${remindMessage}`;
    }

    if (finalRes.length > 480) {
      finalRes = await fb.utils.manageLongResponse(finalRes);
    }

    // Check channel configuration and send appropriately
    if (channelData) {
      const shouldSendViaWhisper =
        channelData.isPaused ||
        (channelData.disabledCommands &&
          channelData.disabledCommands.includes("remind")) ||
        (channelData.offlineOnly &&
          (await fb.api.helix.isStreamOnline(channelName)));

      if (shouldSendViaWhisper) {
        await fb.log.whisper(targetUserId, finalRes);
      } else {
        fb.log.send(channelName, finalRes);
      }
    } else {
      // Fallback to whisper if no channel config
      await fb.log.whisper(targetUserId, finalRes);
    }

    await fb.db.update(
      "remind",
      { _id: newRemindId },
      { $set: { beenRead: true } }
    );

    // Clear the user from notified cache since scheduled reminder was delivered
    clearNotifiedCacheForUser(targetUserId);
  });
};

const remindCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Use o formato: ${message.prefix}remind <usuário> <mensagem>`,
    };
  }

  let targetUser = message.args[1]?.replace(/^@/, "").toLowerCase();

  // MARKER: delete
  if (["del", "delete", "apagar"].includes(targetUser)) {
    const reminderId = message.args[2];

    if (isNaN(reminderId)) {
      return {
        reply: `Use o formato: ${message.prefix}remind delete <ID do lembrete>`,
      };
    }

    const remindInfo = await fb.db.get("remind", { _id: parseInt(reminderId) });
    if (!remindInfo) {
      return {
        reply: `Não existe nenhum lembrete com esse ID`,
      };
    }

    const reminder = remindInfo;
    if (reminder.beenRead) {
      return {
        reply: `Esse lembrete já foi aberto`,
      };
    }

    if (reminder.senderId !== message.senderUserID) {
      return {
        reply: `Você não é o criador desse lembrete`,
      };
    }

    const emote = await fb.emotes.getEmoteFromList(
      message.channelName,
      ["joia", "jumilhao"],
      "👍"
    );

    await fb.db.update(
      "remind",
      { _id: parseInt(reminderId) },
      { $set: { beenRead: true } }
    );

    // Cancel the scheduled job if it exists
    if (fb.reminderJobs && fb.reminderJobs[reminderId]) {
      fb.reminderJobs[reminderId].cancel();
      delete fb.reminderJobs[reminderId];
    }

    // Clear the user from notified cache since reminder was deleted
    clearNotifiedCacheForUser(message.senderUserID);

    return {
      reply: `Lembrete apagado ${emote}`,
    };
  }

  // MARKER: show
  if (["show", "open"].includes(targetUser)) {
    if (message.args.length === 2) {
      const remindInfo = await fb.db.get("remind", {
        receiverId: message.senderUserID,
        beenRead: false,
        remindAt: null,
      });

      if (!remindInfo || remindInfo.length === 0) {
        return {
          reply: `Você não tem lembretes pendentes`,
        };
      }

      const pendingReminders = remindInfo.map((reminder) => reminder._id);
      const finalRes = `Você tem estes lembretes: ${pendingReminders.join(
        ", "
      )}`;

      return {
        reply: finalRes,
      };
    }

    const reminderId = message.args[2];

    // MARKER: show all
    if (reminderId === "all") {
      const remindInfo = await fb.db.get("remind", {
        receiverId: message.senderUserID,
        beenRead: false,
      });

      if (!remindInfo || remindInfo.length === 0) {
        return {
          reply: `Você não tem lembretes pendentes`,
        };
      }

      let pendingReminders = "";
      const reminderSenders = {};

      for (const reminder of remindInfo) {
        if (!reminderSenders[reminder.senderId]) {
          const reminderSender = await fb.api.helix.getUserByID(
            reminder.senderId
          );
          reminderSenders[reminder.senderId] =
            reminderSender?.login || "Usuário deletado";
        }

        pendingReminders += `ID: ${reminder._id} de @${
          reminderSenders[reminder.senderId]
        } há ${fb.utils.relativeTime(reminder.remindTime, true)}:\n${
          reminder.remindMessage
        }\n\n`;
      }

      const gistUrl = await fb.api.github.createGist(pendingReminders);

      // Mark all reminders as read
      await fb.db.updateMany(
        "remind",
        { receiverId: message.senderUserID },
        { $set: { beenRead: true } }
      );

      // Clear the user from notified cache since all reminders were read
      clearNotifiedCacheForUser(message.senderUserID);

      return {
        reply: `Para ver todos os seus lembretes, acesse: ${gistUrl}`,
      };
    }

    // MARKER: show specific
    if (isNaN(reminderId)) {
      return {
        reply: `Use o formato: ${message.prefix}remind show <ID do lembrete>`,
      };
    }

    const remindInfo = await fb.db.get("remind", {
      _id: parseInt(reminderId),
      beenRead: false,
    });

    if (!remindInfo) {
      return {
        reply: `Não existe nenhum lembrete pendente com esse ID`,
      };
    }

    const reminder = remindInfo;
    if (
      reminder.receiverId !== message.senderUserID &&
      reminder.senderId !== message.senderUserID
    ) {
      return {
        reply: `Você não é o criador nem o destinatário desse lembrete`,
      };
    }

    const reminderSender = await fb.api.helix.getUserByID(reminder.senderId);
    const finalRes = `Lembrete de @${
      reminderSender?.login || "Usuário deletado"
    } há ${fb.utils.relativeTime(reminder.remindTime, true)}: ${
      reminder.remindMessage
    }`;

    await fb.db.update(
      "remind",
      { _id: parseInt(reminderId) },
      { $set: { beenRead: true } }
    );

    // Clear the user from notified cache since reminder was read
    clearNotifiedCacheForUser(message.senderUserID);

    return {
      reply: finalRes,
    };
  }

  // MARKER: block
  if (["block", "bloquear"].includes(targetUser)) {
    const targetUsername = message.args[2]?.replace(/^@/, "");
    if (!targetUsername) {
      return {
        reply: `Use o formato: ${message.prefix}remind block <usuário>`,
      };
    }

    const targetUserId = (await fb.api.helix.getUserByUsername(targetUsername))
      ?.id;
    if (!targetUserId) {
      return {
        reply: `Esse usuário não existe`,
      };
    }

    if (targetUserId === message.senderUserID) {
      return {
        reply: `Você não pode se bloquear a você mesmo Stare`,
      };
    }

    await fb.db.update(
      "users",
      { userid: message.senderUserID },
      { $push: { "blocks.remind": targetUserId } }
    );

    return {
      reply: `Você bloqueou ${targetUsername} de usar comandos remind para você`,
    };
  }

  // MARKER: unblock
  if (["unblock", "desbloquear"].includes(targetUser)) {
    const targetUsername = message.args[2]?.replace(/^@/, "");
    if (!targetUsername) {
      return {
        reply: `Use o formato: ${message.prefix}remind unblock <usuário>`,
      };
    }

    const targetUserId = (await fb.api.helix.getUserByUsername(targetUsername))
      ?.id;
    if (!targetUserId) {
      return {
        reply: `Esse usuário não existe`,
      };
    }

    if (targetUserId === message.senderUserID) {
      return {
        reply: `Você não pode se desbloquear a você mesmo Stare`,
      };
    }

    await fb.db.updateMany(
      "users",
      { userid: message.senderUserID },
      { $pull: { "blocks.remind": targetUserId } }
    );

    return {
      reply: `Você desbloqueou ${targetUsername} de usar comandos remind para você`,
    };
  }

  if (["folhinha", "folhinhabot"].includes(targetUser)) {
    return {
      reply: `Stare que foi ow`,
    };
  }

  if (targetUser.toLowerCase() == "in") {
    return {
      reply: `Use o formato: ${message.prefix}remind <usuário> in <tempo> <mensagem> (ex: in 10s/10m/10h/10d)`,
    };
  }

  // MARKER: main reminder logic
  // Handle "me" or self-reminder
  if (["me", message.senderUsername].includes(targetUser)) {
    targetUser = message.senderUsername;
  }

  // Check if it's a timed reminder
  let totalSeconds = 0;
  let remindMessage = "";
  let remindAt = null;

  // Look for "in" keyword and parse time
  const inIndex = message.args.findIndex((arg) => arg.toLowerCase() === "in");
  if (inIndex !== -1 && inIndex + 1 < message.args.length) {
    const timeParts = message.args.slice(inIndex + 1);
    let timeIndex = 0;
    let days = null;
    let hours = null;
    let minutes = null;
    let seconds = null;

    // Parse time units by checking each part and incrementing index
    if (
      timeParts[timeIndex] &&
      ["d", "day", "days", "dia", "dias"].some((suffix) =>
        timeParts[timeIndex].toLowerCase().endsWith(suffix)
      )
    ) {
      days = timeParts[timeIndex];
      if (!isNaN(parseInt(days))) timeIndex++;
    }

    if (
      timeParts[timeIndex] &&
      ["h", "hrs", "hour", "hours", "hora", "horas"].some((suffix) =>
        timeParts[timeIndex].toLowerCase().endsWith(suffix)
      )
    ) {
      hours = timeParts[timeIndex];
      if (!isNaN(parseInt(hours))) timeIndex++;
    }

    if (
      timeParts[timeIndex] &&
      ["m", "min", "mins", "minute", "minutes", "minuto", "minutos"].some(
        (suffix) => timeParts[timeIndex].toLowerCase().endsWith(suffix)
      )
    ) {
      minutes = timeParts[timeIndex];
      if (!isNaN(parseInt(minutes))) timeIndex++;
    }

    if (
      timeParts[timeIndex] &&
      ["s", "sec", "secs", "second", "seconds", "segundo", "segundos"].some(
        (suffix) => timeParts[timeIndex].toLowerCase().endsWith(suffix)
      )
    ) {
      seconds = timeParts[timeIndex];
      if (!isNaN(parseInt(seconds))) timeIndex++;
    }

    // Calculate total seconds using the original parseTime function logic
    if (days && !isNaN(parseInt(days)))
      totalSeconds += parseInt(days) * 24 * 60 * 60;
    if (hours && !isNaN(parseInt(hours)))
      totalSeconds += parseInt(hours) * 60 * 60;
    if (minutes && !isNaN(parseInt(minutes)))
      totalSeconds += parseInt(minutes) * 60;
    if (seconds && !isNaN(parseInt(seconds))) totalSeconds += parseInt(seconds);

    if (totalSeconds === 0) {
      return {
        reply: `Use o formato: ${message.prefix}remind <usuário> in <tempo> <mensagem> (ex: in 10s/10m/10h/10d)`,
      };
    }

    if (totalSeconds < 60) {
      return {
        reply: `O tempo mínimo para lembretes cronometrados é de 1 minuto`,
      };
    }

    if (totalSeconds > 157_784_630) {
      // 5 years
      return {
        reply: `O tempo máximo para lembretes cronometrados é de 5 anos`,
      };
    }

    remindAt = Math.floor(Date.now() / 1000) + totalSeconds;
    remindMessage = message.args
      .slice(inIndex + 1 + timeIndex)
      .join(" ")
      .trim();
  } else {
    // Regular reminder (no time specified)
    remindMessage = message.args.slice(2).join(" ").trim();
  }

  if (!remindMessage) {
    remindMessage = "(sem mensagem)";
  }

  // Parse comma-separated recipients (format: user1,user2 — no spaces)
  const rawTargets = targetUser
    .split(",")
    .map((u) => u.replace(/^@/, "").trim().toLowerCase())
    .filter(Boolean);

  const MAX_RECIPIENTS = 5;
  if (rawTargets.length > MAX_RECIPIENTS) {
    return {
      reply: `Máximo de ${MAX_RECIPIENTS} usuários por comando. Use o formato: user1,user2 (sem espaços).`,
    };
  }

  const created = [];
  const failures = [];
  const seenUserIds = new Set();

  for (const raw of rawTargets) {
    const normalizedName = ["me", message.senderUsername].includes(raw)
      ? message.senderUsername
      : raw;
    const targetUserId = (await fb.api.helix.getUserByUsername(normalizedName))
      ?.id;
    if (!targetUserId) {
      failures.push({ user: raw, reason: "não existe" });
      continue;
    }
    if (seenUserIds.has(targetUserId)) continue;
    seenUserIds.add(targetUserId);

    const userCheck = await canUserReceiveReminders(
      targetUserId,
      message.senderUserID
    );
    if (!userCheck.canReceive) {
      if (userCheck.reason === "optout") {
        failures.push({ user: raw, reason: "optout" });
      } else if (userCheck.reason === "blocked") {
        failures.push({ user: raw, reason: "blocked" });
      }
      continue;
    }

    const newRemindId = await newRemind(
      message,
      targetUserId,
      normalizedName,
      remindMessage,
      remindAt
    );
    created.push({ targetUser: normalizedName, targetUserId, newRemindId });
  }

  if (created.length === 0) {
    const failLines = failures
      .map((f) => {
        if (f.reason === "não existe") return `${f.user} não existe`;
        if (f.reason === "optout")
          return `${f.user} optou por não ser alvo de comandos remind`;
        if (f.reason === "blocked")
          return `Você foi bloqueado por ${f.user} para usar comandos remind`;
        return "";
      })
      .filter(Boolean);
    return {
      reply:
        failLines.length > 0
          ? failLines.join(". ") + " 🚫"
          : "Nenhum lembrete criado.",
    };
  }

  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    ["noted"],
    "📝"
  );

  for (const { targetUserId } of created) {
    clearNotifiedCacheForUser(targetUserId);
  }

  let replyMessage;
  if (created.length === 1) {
    const { targetUser: u, newRemindId } = created[0];
    replyMessage = `Vou lembrar ${
      u !== message.senderUsername ? `@${u}` : "você"
    } disso `;
    if (remindAt) {
      replyMessage += `em ${formatTimeParts(totalSeconds)} `;
    } else {
      replyMessage += "assim que falar no chat ";
    }
    replyMessage += `${emote} (ID ${newRemindId})`;
  } else {
    const names = created.map(({ targetUser: u }) =>
      u !== message.senderUsername ? `@${u}` : "você"
    );
    replyMessage = `Vou lembrar ${names.join(" e ")} disso `;
    if (remindAt) {
      replyMessage += `em ${formatTimeParts(totalSeconds)} `;
    } else {
      replyMessage += "assim que falarem no chat ";
    }
    replyMessage += `${emote} (IDs ${created.map((c) => c.newRemindId).join(", ")})`;
  }

  if (failures.length > 0) {
    const failLines = failures
      .map((f) => {
        if (f.reason === "não existe") return `${f.user} não existe`;
        if (f.reason === "optout") return `${f.user} optou por não receber`;
        if (f.reason === "blocked") return `${f.user} bloqueou você`;
        return "";
      })
      .filter(Boolean);
    replyMessage += ". " + failLines.join(". ");
  }

  return {
    reply: replyMessage,
    notes: remindAt
      ? new Date(remindAt * 1000).toLocaleString("pt-PT", {
          timeZone: "Europe/Lisbon",
        })
      : null,
  };
};

remindCommand.commandName = "remind";
remindCommand.aliases = ["remind", "lembrar"];
remindCommand.shortDescription = "Deixe um lembrete para algum usuário do chat";
remindCommand.cooldown = 5000;
remindCommand.cooldownType = "user";
remindCommand.whisperable = false;
remindCommand.description = `Use este comando para deixar um lembrete para a próxima vez que um usuário falar no chat

Pode deixar um lembrete para si mesmo ou para outra pessoa
Este comando funciona independentemente do chat em que esteja

• Exemplo: !remind me Faz aquilo lá - O bot irá lembrar de "Fazer aquilo lá" a pessoa que executou o comando assim que voltar a falar em qualquer chat

• Exemplo: !remind @leafyzito Faz aquilo lá - O bot irá lembrar @leafyzito de "Fazer aquilo lá" assim que @leafyzito falar no chat

• Vários usuários: !remind user1,user2 mensagem - Cria o mesmo lembrete para todos (formato sem espaços: user1,user2). Máximo 5 por comando.

Pode também deixar lembretes cronometrados:
• Exemplo: !remind me in 10m Faz aquilo lá - O bot irá lembrar quem executou o comando de "Fazer aquilo lá" 10 minutos depois

• Exemplo: !remind @leafyzito in 15d 10h - @leafyzito será lembrado passado 15 dias e 10 horas

Para ver seus lembretes pendentes: !remind show
Para ver um lembrete específico: !remind show {ID do lembrete}
Para ver todos os lembretes: !remind show all
Para apagar um lembrete: !remind delete {ID do lembrete}
Para bloquear usuários: !remind block/unblock {usuário}`;
remindCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  remindCommand,
};
