const path = require("path");
const { getTarget, profileSummary } = require("../watchtime/lurkr_utils.js");

const lurkrCommand = async (message) => {
  const target = await getTarget(message, message.args[1]);
  if (target.reply) return target;

  return profileSummary(message, target);
};

lurkrCommand.commandName = "lurkr";
lurkrCommand.aliases = ["lurkr"];
lurkrCommand.shortDescription = "Mostra o resumo do perfil de alguém no Lurkr";
lurkrCommand.cooldown = 5000;
lurkrCommand.cooldownType = "channel";
lurkrCommand.whisperable = true;
lurkrCommand.optoutable = true;
lurkrCommand.description = `Mostra o resumo do perfil de alguém no Lurkr (https://lurkr.leafyzito.dev): tempo total, deste mês e deste ano, streak e canais mais assistidos. Só funciona com perfis públicos do Lurkr

!lurkr - Mostra o resumo do seu perfil
!lurkr {usuário} - Mostra o resumo do perfil do usuário

Para o tempo num canal específico, use !watchtime

Se quiser desabilitar a função de outras pessoas usarem este comando em você, use !optout lurkr`;
lurkrCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  lurkrCommand,
};
