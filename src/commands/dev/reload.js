const { exec } = require("child_process");
const { loadCommands } = require("../commandsList");

// Helper function to pull git changes
const pullGitChanges = () => {
  return new Promise((resolve, reject) => {
    exec("git pull", { cwd: process.cwd() }, (err, stdout, stderr) => {
      if (err) {
        console.error(`* Erro ao puxar mudanças do Git: ${err}`);
        reject(new Error(`Git pull failed: ${err}`));
        return;
      }

      if (stderr && !stderr.includes("Already up to date")) {
        console.warn(`* Git stderr: ${stderr}`);
        resolve({ stdout, stderr, warning: true });
        return;
      }

      console.info(`* Mudanças puxadas do Git: ${stdout}`);
      resolve({ stdout, stderr: null, warning: false });
    });
  });
};

// Helper function to clear require cache and reload commands
const reloadCommands = () => {
  try {
    // Clear require cache for all command files
    Object.keys(require.cache).forEach((key) => {
      if (key.includes("\\commands\\") || key.includes("/commands/")) {
        console.debug(`deleting ${key} `);
        delete require.cache[key];
      }
    });

    // Reload the commands
    fb.commandsList = loadCommands();
    return true;
  } catch (error) {
    console.error("Error reloading commands:", error);
    throw error;
  }
};

const reloadCommand = async () => {
  try {
    // Pull git changes first
    const gitResult = await pullGitChanges();

    // Reload commands
    reloadCommands();

    // Prepare response based on git result
    if (gitResult.warning) {
      return {
        reply: `Comandos recarregados 👍`,
        notes: `Git pull success with warning: ${gitResult.stderr}`,
      };
    }

    return {
      reply: `Comandos recarregados 👍`,
      notes: `Git pull success: ${gitResult.stdout}`,
    };
  } catch (error) {
    if (error.message.includes("Git pull failed")) {
      return {
        reply: `Deu não, check logs`,
        notes: error.message,
      };
    }

    return {
      reply: `Erro ao recarregar comandos: ${error.message}`,
      notes: `Command reload failed: ${error}`,
    };
  }
};

// Command metadata
reloadCommand.commandName = "reload";
reloadCommand.aliases = ["reload"];
reloadCommand.shortDescription = "[DEV] Recarrega os comandos do bot";
reloadCommand.cooldown = 5_000;
reloadCommand.cooldownType = "user";
reloadCommand.permissions = ["admin"];
reloadCommand.whisperable = false;
reloadCommand.flags = ["dev"];
reloadCommand.description = `Atualiza os arquivos do bot a partir do GitHub e recarrega todos os comandos carregados em tempo real, sem precisar reiniciar o bot

• Exemplo: !reload - Atualiza os comandos do bot com as últimas alterações`;

module.exports = { reloadCommand };
