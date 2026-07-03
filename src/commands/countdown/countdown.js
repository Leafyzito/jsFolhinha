const path = require("path");
const countdownCommand = async (message) => {
  let time = message.args[1] || 10;
  if (!isNaN(parseInt(time))) {
    time = parseInt(time);
  }

  if (time < 3) {
    return {
      reply: `O limite mínimo de segundos para a contagem regressiva é 3`,
    };
  }

  if (time > 30) {
    return {
      reply: `O limite máximo de segundos para a contagem regressiva é 30`,
    };
  }

  await fb.log.reply(
    message,
    `Iniciando contagem regressiva de ${time} segundos`
  );
  for (let i = time; i > 0; i--) {
    fb.log.send(message.channelName, `⏲️ ${i}`, 0, null, true);
    await fb.utils.sleep(1000);
  }

  return;
};

countdownCommand.commandName = "countdown";
countdownCommand.aliases = ["countdown", "contagemregressiva"];
countdownCommand.shortDescription =
  "Faz o bot fazer uma contagem regressiva no chat";
countdownCommand.cooldown = 15_000;
countdownCommand.cooldownType = "channel";
countdownCommand.whisperable = false;
countdownCommand.flags = ["modBot", "vipBot"];
countdownCommand.description = `Faz o bot fazer uma contagem regressiva no chat com o tempo em segundos que você desejar

• Exemplo: !countdown - O bot irá fazer uma contagem regressiva de 10 segundos no chat
• Exemplo: !countdown 15 - O bot irá fazer uma contagem regressiva de 15 segundos no chat`;
countdownCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  countdownCommand,
};
