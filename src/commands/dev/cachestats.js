const cacheStatsCommand = async () => {
  try {
    const cacheStats = fb.db.cacheStats();

    // Calculate summary stats
    let totalCached = 0;
    let totalHits = 0;
    let totalMisses = 0;

    for (const stats of Object.values(cacheStats)) {
      totalCached += stats.size;
      totalHits += stats.hits;
      totalMisses += stats.misses;
    }

    const total = totalHits + totalMisses;
    const hitRatio =
      total > 0 ? `${((totalHits / total) * 100).toFixed(2)}%` : "0%";

    let reply = `📊 Cache: ${totalCached} entries ● Hits/Misses: ${totalHits}/${totalMisses} ● Hit Ratio: ${hitRatio}`;

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
