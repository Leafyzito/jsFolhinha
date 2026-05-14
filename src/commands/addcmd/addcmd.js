const path = require("path");
const { commandsList } = require("../commandsList");

function isValidName(name) {
  return typeof name === "string" && /^[a-z0-9_]+$/.test(name);
}

function parseCooldownFlag(args) {
  const idx = args.findIndex((a) => /^-cooldown:\d+$/.test(a));
  if (idx === -1) return { cooldownMs: null, args };

  const token = args[idx];
  const seconds = Number(token.split(":")[1]);
  if (!Number.isFinite(seconds)) {
    return { cooldownMs: null, args: args.filter((_, i) => i !== idx) };
  }

  const boundedSeconds = Math.max(1, Math.min(seconds, 3600)); // min 1s, max 1h
  return {
    cooldownMs: boundedSeconds * 1000,
    args: args.filter((_, i) => i !== idx),
  };
}

const addcmdCommand = async (message) => {
  const name = message.args?.[1]?.toLowerCase();
  const rawResponseArgs = message.args?.slice(2) || [];
  const { cooldownMs, args: responseArgs } = parseCooldownFlag(rawResponseArgs);
  const response = responseArgs.join(" ").trim();

  if (!isValidName(name) || !response) {
    return {
      reply: `Use o formato: ${message.prefix}addcmd <nome> <resposta...>`,
    };
  }

  // Disallow conflicts with any built-in alias
  if (name in commandsList) {
    return {
      reply: `⚠️ O comando '${name}' já existe como comando built-in`,
    };
  }

  // Ensure uniqueness per channel
  const existing = await fb.db.get("customcommands", {
    channelId: message.channelID,
    name,
  });
  if (existing) {
    return {
      reply: `⚠️ Já existe um comando customizado chamado '${name}' neste canal`,
    };
  }

  await fb.db.insert("customcommands", {
    channelId: message.channelID,
    name,
    response,
    cooldownMs: cooldownMs ?? 5000,
    createdByUserId: message.senderUserID,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { reply: `Comando customizado '${name}' criado ✅` };
};

addcmdCommand.commandName = "addcmd";
addcmdCommand.aliases = ["addcmd", "addcommand", "cmdadd", "commandadd"];
addcmdCommand.shortDescription = "Cria um comando customizado no canal";
addcmdCommand.cooldown = 1000;
addcmdCommand.cooldownType = "channel";
addcmdCommand.permissions = ["mod", "admin"];
addcmdCommand.whisperable = false;
addcmdCommand.description = `Cria um comando customizado no canal atual

• Opcional: -cooldown:N define o cooldown em segundos (1-3600). 5 segundos é o padrão.
• Na resposta você pode usar: {user}, {channel}, {1}/{2}/… (palavras após o comando), {args} (tudo após o comando), ou {{ e }} para chave literal.
• Exemplo: !addcmd discord Meu discord é: discord.gg/xxxx
• Exemplo com cooldown: !addcmd discord -cooldown:30 Meu discord é: discord.gg/xxxx`;
addcmdCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  addcmdCommand,
};
