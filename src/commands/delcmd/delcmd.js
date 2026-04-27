const path = require("path");
const { commandsList } = require("../commandsList");

function isValidName(name) {
  return typeof name === "string" && /^[a-z0-9_]+$/.test(name);
}

const delcmdCommand = async (message) => {
  if (!message.isMod && !message.isAdmin) {
    return { reply: `⚠️ Este comando é reservado para mod, admin` };
  }

  const name = message.args?.[1]?.toLowerCase();
  if (!isValidName(name)) {
    return {
      reply: `Use o formato: ${message.prefix}delcmd <nome> (nome: a-z, 0-9, _)`,
    };
  }

  // Disallow conflicts with any built-in alias
  if (name in commandsList) {
    return {
      reply: `⚠️ O comando '${name}' já existe como comando built-in.`,
    };
  }

  const existing = await fb.db.get("customcommands", {
    channelId: message.channelID,
    name,
  });
  if (!existing) {
    return {
      reply: `⚠️ Não existe um comando customizado chamado '${name}' neste canal.`,
    };
  }

  await fb.db.delete("customcommands", { channelId: message.channelID, name });
  return { reply: `Comando customizado '${name}' removido ✅` };
};

delcmdCommand.commandName = "delcmd";
delcmdCommand.aliases = ["delcmd", "deletecommand"];
delcmdCommand.shortDescription = "Remove um comando customizado do canal";
delcmdCommand.cooldown = 1000;
delcmdCommand.cooldownType = "channel";
delcmdCommand.permissions = ["mod", "admin"];
delcmdCommand.whisperable = false;
delcmdCommand.description = `Remove um comando customizado do canal atual

• Exemplo: !delcmd discord`;
delcmdCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  delcmdCommand,
};
