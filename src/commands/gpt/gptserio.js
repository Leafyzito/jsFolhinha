const path = require("path");
const { callGemini } = require("./gpt");

const SERIO_SYSTEM_INSTRUCTION =
  "Sem personalidade. Apenas factos, dados, insights e críticas construtivas. Respostas curtas, concisas e densas. Se uma pergunta for contra os Termos de Serviço do Twitch, recuse-se a responder. NUNCA USE MARKDOWN NA SUA RESPOSTA. ISTO É MUITO IMPORTANTE.";

async function askGeminiSerio(message, prompt) {
  return callGemini(SERIO_SYSTEM_INSTRUCTION, prompt);
}

const gptSerioCommand = async (message) => {
  const prompt = message.args.slice(1).join(" ");

  if (!prompt) {
    return {
      reply: `Use o formato: ${message.prefix}gptserio <qualquer coisa>`,
    };
  }

  try {
    const gptRes = await askGeminiSerio(message, prompt);

    if (gptRes.length > 490) {
      const longResponse = await fb.utils.manageLongResponse(gptRes);
      return {
        reply: `🤖 ${longResponse}`,
      };
    }

    return {
      reply: `🤖 ${gptRes.replace(/(\r\n|\n|\r)/gm, " ")}`,
    };
  } catch (error) {
    console.error("GPT Serio command error:", error);
    return {
      reply: `Desculpe ${message.displayName}, ocorreu um erro ao processar sua pergunta. Tente novamente em alguns instantes.`,
    };
  }
};

gptSerioCommand.commandName = "gpt";
gptSerioCommand.aliases = [
  "gptserio",
  "gptsério",
  "chatgptserio",
  "chatgptsério",
  "geminisério",
  "geminiserio",
];
gptSerioCommand.shortDescription = "Faça uma pergunta para o Gemini sério";
gptSerioCommand.cooldown = 15000;
gptSerioCommand.cooldownType = "channel";
gptSerioCommand.whisperable = true;
gptSerioCommand.description = `Envie uma mensagem para o Gemini com uma personalidade mais séria e sem teor humorístico`;
gptSerioCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  gptSerioCommand,
};
