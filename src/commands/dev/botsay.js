const botSayCommand = async (message) => {
  const args = message.messageText.split(" ");
  const targetChannel = args[1];
  const msgContent = args.slice(2).join(" ");

  if (targetChannel == "all") {
    const joinedChannels = fb.twitch.anonClient.currentChannels.map((c) =>
      c.replace("#", "")
    );
    for (let i = 0; i < joinedChannels.length; i++) {
      const channel = joinedChannels[i];
      await new Promise((resolve) => setTimeout(resolve, 5_000)); // 5 second interval between each message

      // console.log(`sending to ${channel}`);
      fb.log.send(channel, msgContent);
    }
    return {
      reply: `foi`,
    };
  }

  fb.log.send(targetChannel, msgContent);
  return {
    reply: `foi`,
  };
};

// Command metadata
botSayCommand.commandName = "botsay";
botSayCommand.aliases = ["botsay", "bsay"];
botSayCommand.shortDescription =
  "[DEV] Faz o bot enviar uma mensagem em um canal";
botSayCommand.cooldown = 5_000;
botSayCommand.cooldownType = "user";
botSayCommand.permissions = ["admin"];
botSayCommand.whisperable = false;
botSayCommand.flags = ["dev"];
botSayCommand.description = "Envie uma mensagem personalizada como o bot em um canal específico ou em todos os canais onde o bot está presente";
botSayCommand.examples = [
  {
    description: "Enviar uma mensagem em um canal específico",
    input: "!botsay canalexemplo Olá",
    output: "(O bot envia \"Olá\" em #canalexemplo)",
  },
  {
    description: "Enviar uma mensagem em todos os canais",
    input: "!botsay all Mensagem global",
    output: "(O bot envia \"Mensagem global\" em todos os canais)",
  },
];

module.exports = { botSayCommand };
