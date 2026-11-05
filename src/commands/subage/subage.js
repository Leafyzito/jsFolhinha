const path = require("path");
async function getSubAge(user, channel) {
  const data = await fb.api.ivr.getSubAge(user, channel);

  if (!data) {
    return `Um dos usuários inseridos não existe`;
  }

  let output = "";

  if (!data.isActiveSub) {
    output = `${user} não é sub de ${channel}`;
  } else {
    const months = data.monthsActive;
    let subType = "";

    if (data.subscriptionType === "paid") {
      const subTier = data.subscriptionTier;
      subType = `Tier ${subTier}`;
    } else if (data.subscriptionType === "prime") {
      subType = "Prime";
    } else if (data.subscriptionType === "gift") {
      const subTier = data.subscriptionTier;
      const subGifterPart = data.subscriptionGifter
        ? `oferecido por ${data.subscriptionGifter}`
        : "";
      subType = `de Presente Tier ${subTier} ${subGifterPart}`;
    }

    // if has streak, add it to the output
    let streakPart = "";
    if (data.streakMonths > 0) {
      if (data.streakMonths > 1) {
        streakPart = `(Streak de ${data.streakMonths} meses)`;
      }
    }

    let endsAtPart = "";
    if (data.endsAt !== null) {
      endsAtPart = ` - Termina em ${fb.utils.relativeTime(
        data.endsAt,
        true
      )} (${new Date(data.endsAt)
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-")})`;
    }

    output = `${user} é sub de ${channel} há ${months} meses ${streakPart} com Subscrição ${subType} ${endsAtPart}`;
  }

  if (!data.hasSubbed) {
    output += " e nunca foi antes";
  }

  if (!data.isActiveSub && data.hasSubbed) {
    const oldMonths = data.monthsActive;
    output += `, mas já foi por ${oldMonths} meses`;
  }

  return output;
}

const subAgeCommand = async (message) => {
  let saTarget = message.senderUsername;
  let saChannelTarget = message.channelName;

  const args = message.args;

  if (args.length === 2) {
    saChannelTarget = args[1].replace(/^@/, "");
  } else if (args.length === 3) {
    saTarget = args[1].replace(/^@/, "");
    saChannelTarget = args[2].replace(/^@/, "");

    const saTargetId = (await fb.api.helix.getUserByUsername(saTarget))?.id;
    if (await fb.utils.isOptedOut(saTargetId, "subage", message.senderUserID)) {
      return {
        reply: fb.utils.optoutReply,
      };
    }
  }

  const saResult = await getSubAge(saTarget, saChannelTarget);

  if (saResult.includes("não existe")) {
    return {
      reply: saResult,
    };
  }

  return {
    reply: saResult,
  };
};

subAgeCommand.commandName = "subage";
subAgeCommand.aliases = ["subage", "sa"];
subAgeCommand.shortDescription =
  "Mostra há quanto tempo um usuário é sub de algum canal";
subAgeCommand.cooldown = 5000;
subAgeCommand.cooldownType = "channel";
subAgeCommand.whisperable = false;
subAgeCommand.optoutable = true;
subAgeCommand.description = `Mostra há quanto tempo um usuário é sub de um canal, tendo várias formas de o fazer:

Apenas !subage: O bot vai responder com a quantidade de tempo que o usuário que executou o comando é sub do canal no qual o comando foi executado

!subage @usuário: O bot vai responder com a quantidade de tempo que o usuário que executou o comando é sub do canal que foi fornecido

!subage @usuário1 @usuário2: O bot vai responder com a quantidade de tempo que o @usuário1 é sub do @usuário2`;
subAgeCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  subAgeCommand,
};
