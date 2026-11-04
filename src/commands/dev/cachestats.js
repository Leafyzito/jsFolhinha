const cacheStatsCommand = async () => {
  try {
    const cacheStats = fb.db.cacheStats();

    // Calculate summary stats
    let totalHits = 0;
    let totalMisses = 0;
    const perCollection = [];

    for (const [name, stats] of Object.entries(cacheStats)) {
      totalHits += stats.hits;
      totalMisses += stats.misses;
      perCollection.push(`${name} ${stats.size}`);
    }

    const total = totalHits + totalMisses;
    const hitRatio =
      total > 0 ? `${((totalHits / total) * 100).toFixed(2)}%` : "0%";

    let reply = `📊 Cache ● Hits/Misses: ${totalHits}/${totalMisses} ● Hit Ratio: ${hitRatio} ● ${perCollection.join(", ")}`;

    // Truncate if over 500 characters
    if (reply.length > 500) {
      reply = reply.substring(0, 490) + "...";
    }

    return {
      reply: reply,
    };
  } catch (err) {
    return {
      reply: `Erro ao obter estatísticas do cache: ${err.message}`,
    };
  }
};

// Command metadata
cacheStatsCommand.commandName = "cachestats";
cacheStatsCommand.aliases = ["cachestats", "cstats"];
cacheStatsCommand.shortDescription =
  "[DEV] Mostra estatísticas do cache do bot";
cacheStatsCommand.cooldown = 5_000;
cacheStatsCommand.cooldownType = "user";
cacheStatsCommand.permissions = ["admin"];
cacheStatsCommand.whisperable = false;
cacheStatsCommand.flags = ["dev"];
cacheStatsCommand.description = `Exibe informações detalhadas sobre o uso do cache do bot
Útil apenas para administradores e para diagnóstico de performance`;

module.exports = { cacheStatsCommand };
