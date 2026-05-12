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

  const boundedSeconds = Math.max(1, Math.min(seconds, 3600));
  return {
    cooldownMs: boundedSeconds * 1000,
    args: args.filter((_, i) => i !== idx),
  };
}

const editcmdCommand = async (message) => {
  if (!message.isMod && !message.isAdmin) {
    return { reply: `⚠️ Este comando é reservado para mod, admin` };
  }

  const name = message.args?.[1]?.toLowerCase();
  const rawResponseArgs = message.args?.slice(2) || [];
  const { cooldownMs, args: responseArgs } = parseCooldownFlag(rawResponseArgs);
  const response = responseArgs.join(" ").trim();

  if (!isValidName(name) || !response) {
    return {
      reply: `Use o formato: ${message.prefix}editcmd <nome> <nova resposta...>`,
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

  const updatePayload = { response, updatedAt: new Date() };
  if (cooldownMs) {
    updatePayload.cooldownMs = cooldownMs;
  }

  await fb.db.update(
    "customcommands",
    { channelId: message.channelID, name },
    { $set: updatePayload }
  );

  return { reply: `Comando customizado '${name}' atualizado ✅` };
};

editcmdCommand.commandName = "editcmd";
editcmdCommand.aliases = ["editcmd", "editcommand"];
editcmdCommand.shortDescription = "Edita um comando customizado no canal";
editcmdCommand.cooldown = 1000;
editcmdCommand.cooldownType = "channel";
editcmdCommand.permissions = ["mod", "admin"];
editcmdCommand.whisperable = false;
editcmdCommand.description = `Edita um comando customizado no canal atual

• Opcional: -cooldown:N altera o cooldown em segundos (1-3600). 5 segundos é o padrão.
• Na resposta você pode usar: {user}, {channel}, {1}/{2}/… (palavras após o comando), {args} (tudo após o comando), ou {{ e }} para chave literal.`;
editcmdCommand.examples = [
  {
    description: "Editar a resposta de um comando customizado",
    input: "!editcmd discord Meu discord novo é: discord.gg/yyyy",
    output: "Comando customizado 'discord' atualizado ✅",
  },
  {
    description: "Editar um comando customizado e o seu cooldown",
    input: "!editcmd discord -cooldown:60 Meu discord novo é: discord.gg/yyyy",
    output: "Comando customizado 'discord' atualizado ✅",
  },
];
editcmdCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  editcmdCommand,
};
