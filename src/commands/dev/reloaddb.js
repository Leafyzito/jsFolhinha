const reloadDbCommand = async () => {
  try {
    await fb.db.reloadCache();

    return {
      reply: `Base de dados recarregada 👍`,
    };
  } catch (err) {
    return {
      reply: `Erro ao recarregar base de dados: ${err.message}`,
    };
  }
};

// Command metadata
reloadDbCommand.commandName = "reloaddb";
reloadDbCommand.aliases = ["reloaddb", "reloadbd"];
reloadDbCommand.shortDescription = "[DEV] Recarrega a cache da base de dados";
reloadDbCommand.cooldown = 5_000;
reloadDbCommand.cooldownType = "user";
reloadDbCommand.permissions = ["admin"];
reloadDbCommand.whisperable = false;
reloadDbCommand.flags = ["dev"];
reloadDbCommand.description = `Recarrega as coleções guardadas em memória e limpa as restantes caches`;

module.exports = { reloadDbCommand };
