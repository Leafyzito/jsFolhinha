const DRESSA_UID = "138244632";

const proximoCommand = async (message) => {
  if (message.senderUserID !== DRESSA_UID) return;

  const results = await fb.db.aggregate("remind", [
    { $match: { receiverId: DRESSA_UID, beenRead: false } },
    { $sort: { _id: 1 } },
    { $limit: 1 },
  ]);

  if (!results?.length) {
    return {
      reply: "Cabou.",
    };
  }

  // set the reminder we just got as read
  await fb.db.update(
    "remind",
    { _id: results[0]._id },
    { $set: { beenRead: true } }
  );

  const reminder = results[0];
  const reminderSender = await fb.api.helix.getUserByID(reminder.senderId);
  let reply = `ID ${reminder._id} ● Lembrete de @${
    reminderSender?.displayName || reminderSender?.login || "Usuário deletado"
  } há ${fb.utils.relativeTime(reminder.remindTime, true)}: ${
    reminder.remindMessage
  }`;

  if (reply.length > 490) {
    reply = await fb.utils.manageLongResponse(reply);
  }

  return { reply };
};

proximoCommand.commandName = "proximo";
proximoCommand.aliases = ["proximo", "prox", "próximo"];
proximoCommand.cooldown = 0;
proximoCommand.cooldownType = "channel";
proximoCommand.whisperable = false;

module.exports = {
  proximoCommand,
};
