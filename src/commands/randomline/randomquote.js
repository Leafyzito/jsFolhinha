const path = require("path");
async function getRandomQuote(userid, channelid) {
  const response = await fb.api.rustlog.getRandomLine(channelid, userid);

  if (!response) {
    return null;
  }

  // Parse the log line into components
  const regex = /\[(.*?)\] #(.*?) (.*?): (.*)/;
  const match = response.match(regex);

  if (!match) {
    return null;
  }

  const [, timestamp, channelName, user, message] = match;

  // Convert timestamp to Unix time (assuming timestamp is in format "YYYY-MM-DD HH:mm:ss")
  const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);

  return {
    channel: channelName,
    user: user,
    message: message,
    timeSince: fb.utils.relativeTime(unixTimestamp, true, true),
  };
}

const randomQuoteCommand = async (message) => {
  const randomQuote = await getRandomQuote(
    message.senderUserID,
    message.channelID
  );
  if (!randomQuote) {
    return {
      reply: `Nunca loguei uma mensagem desse usuário neste chat (contando desde 06/03/2025)`,
    };
  }

  return {
    reply: `(há ${randomQuote.timeSince}) ${randomQuote.user}: ${randomQuote.message}`,
  };
};

randomQuoteCommand.commandName = "randomquote";
randomQuoteCommand.aliases = ["randomquote", "rq"];
randomQuoteCommand.shortDescription = "Veja uma mensagem aleatória sua";
randomQuoteCommand.cooldown = 5000;
randomQuoteCommand.cooldownType = "channel";
randomQuoteCommand.whisperable = false;
randomQuoteCommand.description = `Receba uma mensagem aleatória da pessoa que executou o comando

Contando desde 06/03/2025`;
randomQuoteCommand.examples = [
  {
    description: "Receber uma mensagem aleatória sua",
    input: "!randomquote",
    output: "(há 3 dias) EmbellishingGrandma: que jogo é esse?",
  },
];
randomQuoteCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  randomQuoteCommand,
};
