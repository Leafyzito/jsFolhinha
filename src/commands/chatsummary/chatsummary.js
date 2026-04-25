const path = require("path");
const { callGemini } = require("../gpt/gpt");

const DEFAULT_LOG_AMOUNT = 50;

const CHAT_SUMMARY_SYSTEM = `Sê breve e claro.
Resume o conteúdo essencial do chat. Ignora spam e respostas automáticas de bots a comandos.
Trata palavras desconhecidas como possíveis emotes, mas não os menciones. Não uses markdown.`;

const buildUserContent = (channelName, linesText) =>
  `Resuma as mensagens seguintes do chat #${channelName} (Twitch).\n\n${linesText}`;

const chatSummaryCommand = async (message) => {
  let logAmount = DEFAULT_LOG_AMOUNT;
  if (message.args.length > 1) {
    const parsed = parseInt(message.args[1]);
    if (!isNaN(parsed)) {
      logAmount = parsed;
    }
  }

  const logsResult = await fb.api.rustlog.getRecentLines(
    message.channelID,
    logAmount
  );

  if (!logsResult.ok) {
    if (logsResult.reason === "empty_log") {
      return {
        reply: `Não há mensagens no log de hoje (UTC) para resumir, ou ainda não foi possível processar o registo deste chat.`,
      };
    }
    return {
      reply: `Não foi possível obter o log do chat. Tente novamente mais tarde.`,
    };
  }

  const userContent = buildUserContent(message.channelName, logsResult.text);

  const summary = await callGemini(CHAT_SUMMARY_SYSTEM, userContent);

  if (summary.length > 490) {
    const longResponse = await fb.utils.manageLongResponse(summary);
    return {
      reply: `🤖 ${longResponse}`,
    };
  }

  return {
    reply: `🤖 ${summary}`,
  };
};

chatSummaryCommand.commandName = "chatsummary";
chatSummaryCommand.aliases = ["chatsummary", "csum", "resumo"];
chatSummaryCommand.shortDescription = "Resuma as últimas mensagens do chat";
chatSummaryCommand.cooldown = 15_000;
chatSummaryCommand.cooldownType = "channel";
chatSummaryCommand.whisperable = false;
chatSummaryCommand.description = `Obtém as últimas mensagens disponíveis no registo (rustlog) do atual e pede ao Gemini um resumo curto.`;
chatSummaryCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  chatSummaryCommand,
};
