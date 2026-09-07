const path = require("path");
// async function getFA(user, channel) {
//   const data = await fb.api.ivr.getFollowAge(user, channel);

//   if (!data) {
//     return `O canal ${channel} não existe`;
//   }

//   const followDate = data.followedAt;

//   if (followDate == null) {
//     return `${user} não segue ${channel}`;
//   }

//   const relativeTimeFollow = fb.utils.relativeTime(followDate, true, true);
//   const formattedFollowDate = new Date(followDate)
//     .toLocaleDateString("pt-BR", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//     })
//     .replace(/\//g, "-"); // replace / with -

//   return { relativeTimeFollow, formattedFollowDate };
// }

const followAgeCommand = async (message) => {
  const emote = await fb.emotes.getEmoteFromList(
    message.channelName,
    fb.emotes.sadEmotes,
    ":("
  );
  return {
    reply: `A Twitch desabilitou a habilidade de pegar o follow age ${emote}`,
  };

  // let faTarget = message.senderUsername;
  // let faChannelTarget = message.channelName;

  // if (message.args.length === 2) {
  //   faChannelTarget = message.args[1].replace(/^@/, "");
  // } else if (message.args.length === 3) {
  //   faTarget = message.args[1].replace(/^@/, "");
  //   faChannelTarget = message.args[2].replace(/^@/, "");
  // }

  // if (faTarget === faChannelTarget) {
  //   return {
  //     reply: "Stare ?",
  //   };
  // }

  // const faResult = await getFA(faTarget, faChannelTarget);

  // if (typeof faResult === "string" && faResult.includes("não existe")) {
  //   return {
  //     reply: faResult,
  //   };
  // }

  // if (typeof faResult === "string" && faResult.includes("não segue")) {
  //   return {
  //     reply: faResult,
  //   };
  // }

  // const faMessage = `${
  //   faTarget === message.senderUsername ? "Você" : `${faTarget}`
  // } segue ${faChannelTarget} há ${faResult.relativeTimeFollow} (${
  //   faResult.formattedFollowDate
  // })`;

  // return {
  //   reply: faMessage,
  // };
};

followAgeCommand.commandName = "followage";
followAgeCommand.aliases = ["followage", "fa"];
followAgeCommand.shortDescription =
  "Mostra há quanto tempo um usuário segue um canal";
followAgeCommand.cooldown = 5000;
followAgeCommand.cooldownType = "channel";
followAgeCommand.whisperable = false;
followAgeCommand.description = `Mostra há quanto tempo um usuário segue um canal, tendo várias formas de o fazer:

Apenas !followage: O bot vai responder com a quantidade de tempo que o usuário que executou o comando segue o canal no qual o comando foi executado

!followage @usuário: O bot vai responder com a quantidade de tempo que o usuário que executou o comando segue o canal que foi fornecido

!followage @usuário1 @usuário2: O bot vai responder com a quantidade de tempo que o @usuário1 segue @usuário2`;

followAgeCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  followAgeCommand,
};
