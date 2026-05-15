const { exec } = require("child_process");

function formatGitPullReply(stdout, stderr) {
  const output = [stdout, stderr].filter(Boolean).join("\n").trim();
  if (!output) return "Atualizado 👍";
  if (/already up to date/i.test(output)) return "Já está atualizado 👍";

  const range = output.match(/Updating ([a-f0-9]+)\.\.([a-f0-9]+)/i);
  if (range) {
    const from = range[1].slice(0, 7);
    const to = range[2].slice(0, 7);
    const files = output.match(/(\d+) files? changed/i);
    const insertions = output.match(/(\d+) insertions?\(\+\)/i);
    const deletions = output.match(/(\d+) deletions?\(-\)/i);
    const stats = [];
    if (files) stats.push(`${files[1]} arquivo${files[1] === "1" ? "" : "s"}`);
    const diff = [
      insertions ? `+${insertions[1]}` : null,
      deletions ? `-${deletions[1]}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    if (diff) stats.push(diff);
    const statsPart = stats.length ? ` (${stats.join(", ")})` : "";
    return `Atualizado ${from} → ${to}${statsPart} 👍`;
  }

  const firstLine =
    output
      .split("\n")
      .find((l) => l.trim())
      ?.trim() ?? "";
  if (!firstLine || firstLine.length > 120) return "Atualizado 👍";
  return `${firstLine} 👍`;
}

const gitPullCommand = async () => {
  return new Promise((resolve) => {
    exec("git pull", { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          reply: "Deu não, check logs",
          notes: `Git pull failed: ${error}`,
        });
        return;
      }
      const fullOutput = [stdout, stderr].filter(Boolean).join("\n");
      resolve({
        reply: formatGitPullReply(stdout, stderr),
        notes: `Git pull success:\n${fullOutput}`,
      });
    });
  });
};

// Command metadata
gitPullCommand.commandName = "gitpull";
gitPullCommand.aliases = ["gitpull", "gpull"];
gitPullCommand.shortDescription =
  "[DEV] Atualiza o bot com as últimas mudanças";
gitPullCommand.cooldown = 5_000;
gitPullCommand.cooldownType = "user";
gitPullCommand.permissions = ["admin"];
gitPullCommand.whisperable = false;
gitPullCommand.flags = ["dev"];
gitPullCommand.description = `Busca as atualizações mais recentes do bot, mas não as aplica`;

module.exports = { gitPullCommand };
