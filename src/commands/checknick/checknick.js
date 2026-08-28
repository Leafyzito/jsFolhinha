// const path = require("path");
// async function checkNick(nick) {
//   const api_url = `https://api.fuchsty.de/twitch/checkname?username=${nick}`;
//   const response = await fb.got(api_url);

//   if (!response) {
//     return "invalid";
//   }

//   const data = response;

//   const isInvalid = data[0].invalid;
//   if (isInvalid) {
//     return "invalid";
//   }

//   const isAvailable = data[0].available;
//   if (isAvailable) {
//     return true;
//   }

//   return false;
// }

// const checkNickCommand = async (message) => {
//   if (message.args.length < 2) {
//     return {
//       reply: `Use o formato: ${message.prefix}checknick <nick>`,
//     };
//   }

//   const nick = message.args[1].replace(/^@/, "");

//   const checkNickRes = await checkNick(nick);

//   if (checkNickRes === "invalid") {
//     return {
//       reply: `O nick ${nick} é inválido`,
//     };
//   }

//   if (!checkNickRes) {
//     const emote = await fb.emotes.getEmoteFromList(
//       message.channelName,
//       ["paia"],
//       "👎"
//     );
//     return {
//       reply: `O nick ${nick} não está disponível ${emote}`,
//     };
//   }

//   const emote = await fb.emotes.getEmoteFromList(
//     message.channelName,
//     ["joia", "jumilhao"],
//     "👍"
//   );
//   return {
//     reply: `O nick ${nick} está disponível ${emote}`,
//   };
// };

// checkNickCommand.commandName = "checknick";
// checkNickCommand.aliases = ["checknick", "nickcheck", "namecheck", "checkname"];
// checkNickCommand.shortDescription =
//   "Verifica se um nick específico está disponível";
// checkNickCommand.cooldown = 5000;
// checkNickCommand.cooldownType = "channel";
// checkNickCommand.whisperable = true;
// checkNickCommand.description = `Use este comando para ver se um nick específico é válido e está disponível ou não
// • Exemplo: !checknick leafyzito - Verifica se o nick "leafyzito" está disponível`;
// checkNickCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

// module.exports = {
//   checkNickCommand,
// };
