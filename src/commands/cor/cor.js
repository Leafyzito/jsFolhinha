const path = require("path");
async function getColorName(hexCode) {
  hexCode = hexCode.replace("#", "");
  const res = await fb.got(`https://www.thecolorapi.com/id?hex=${hexCode}`);
  return res.name.value;
}

const corCommand = async (message) => {
  const colorTarget =
    message.messageText.split(" ")[1]?.replace(/^@/, "") ||
    message.senderUserID;
  const colorTargetID =
    colorTarget !== message.senderUserID
      ? (await fb.api.helix.getUserByUsername(colorTarget))?.id
      : message.senderUserID;

  if (!colorTargetID) {
    return {
      reply: `O usuário ${colorTarget} não existe`,
    };
  }

  const color = (await fb.api.helix.getColor(colorTargetID))?.color;
  if (!color) {
    return {
      reply: `O usuário ${colorTarget} não tem uma cor definida`,
    };
  }

  const colorName = await getColorName(color);

  return {
    reply: `${
      colorTarget == message.senderUserID
        ? `A sua cor é: ${color} - ${colorName}`
        : `A cor de ${colorTarget} é: ${color} - ${colorName}`
    }`,
  };
};

corCommand.commandName = "cor";
corCommand.aliases = ["cor", "color"];
corCommand.shortDescription = "Mostra a cor de algum usuário";
corCommand.cooldown = 5000;
corCommand.cooldownType = "channel";
corCommand.whisperable = true;
corCommand.description = "Veja a cor de algum usuário. O bot responderá com o código hexadecimal da cor juntamente com o nome da mesma. Caso nenhum usuário tenha sido marcado, exibirá a cor de quem realizou o comando";
corCommand.examples = [
  {
    description: "Ver a sua própria cor no chat",
    input: "!cor",
    output: "A sua cor é: #1E90FF - Dodger Blue",
  },
  {
    description: "Ver a cor de outro usuário",
    input: "!cor @leafyzito",
    output: "A cor de leafyzito é: #FF4500 - Orange Red",
  },
];
corCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  corCommand,
};
