const path = require("path");
const { petEmojis } = require("./emojis");

async function updatePetCreation(message, petEmoji, petName) {
  const update_doc = {
    $set: {
      pet_emoji: petEmoji,
      pet_name: petName,
      is_alive: true,
      warns: 0,
      total_plays: 0,
      total_pats: 0,
      last_play: 0,
      last_pat: 0,
      last_interaction: Math.floor(Date.now() / 1000),
      alive_since: Math.floor(Date.now() / 1000),
    },
  };

  await fb.db.update("pet", { channelId: message.channelID }, update_doc);
}

const petCommand = async (message) => {
  if (message.args.length === 1) {
    return {
      reply: `Para saber mais sobre os comandos de pet, acesse https://folhinhabot.com/comandos/pet 😁`,
    };
  }

  const args = message.args.slice(1);

  const petStats = await fb.db.get("pet", { channelId: message.channelID });

  // MARKER: create
  if (["criar", "create"].includes(args[0].toLowerCase())) {
    if (!message.isMod) {
      return {
        reply: `Apenas o streamer e os mods podem criar um pet para o chat`,
      };
    }

    if (petStats && petStats.is_alive) {
      return {
        reply: `Já existe um pet para este chat. Se quiser matar (deletar) ele, digite ${message.prefix}pet kill`,
      };
    }

    const petEmoji = args[1];
    const petName = args.slice(2).join(" ");

    if (!petEmoji || !petName) {
      return {
        reply: `Para criar um pet, use ${message.prefix}pet criar <emoji> <nome>`,
      };
    }

    if (!petEmojis.includes(petEmoji)) {
      return {
        reply: `Esse emoji não é válido. Para uma lista de emojis válidos, acesse https://folhinhabot.com/emojis`,
      };
    }

    if (!petStats) {
      await fb.db.insertTemplate("pet", { message });
    }

    await updatePetCreation(message, petEmoji, petName);

    return {
      reply: `Novo pet criado! Oioi ${petEmoji} ${petName}`,
    };
  }

  // MARKER: kill
  if (["kill", "matar"].includes(args[0].toLowerCase())) {
    if (!message.isMod) {
      return {
        reply: `Apenas o streamer e os mods podem matar um pet`,
      };
    }

    if (!petStats || !petStats.is_alive) {
      return {
        reply: `Não existe um pet para este chat. Para criar um pet, use ${message.prefix}pet criar`,
      };
    }

    const update_doc = {
      $set: {
        is_alive: false,
        time_of_death: 0,
      },
    };

    await fb.db.update("pet", { channelId: message.channelID }, update_doc);

    return {
      reply: `${petStats.pet_emoji} ${petStats.pet_name} foi morto`,
    };
  }

  // MARKER: stats
  if (["stats", "status"].includes(args[0].toLowerCase())) {
    if (!petStats || !petStats.is_alive) {
      return {
        reply: `Não existe um pet para este chat. Para criar um pet, use ${message.prefix}pet criar`,
      };
    }

    let pet_mood;
    if (petStats.warns === 0) {
      pet_mood = "feliz";
    } else if (petStats.warns === 1) {
      pet_mood = "pedindo atenção";
    } else {
      pet_mood = "rabugento por falta de atenção";
    }

    const pet_alive_since = petStats.alive_since;
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsedDays = Math.floor(
      (currentTime - pet_alive_since) / (24 * 60 * 60)
    );

    return {
      reply: `${petStats.pet_emoji} ${petStats.pet_name} está ${pet_mood}! Ele já recebeu ${petStats.total_pats} carinhos e ${petStats.total_plays} brincadeiras num total de ${elapsedDays} dias`,
    };
  }
};

petCommand.commandName = "pet";
petCommand.aliases = ["pet"];
petCommand.shortDescription = "Faça várias coisas relacionadas ao pet do chat";
petCommand.cooldown = 5000;
petCommand.cooldownType = "channel";
petCommand.whisperable = false;
petCommand.description = `Com este comando, você por ter um pet único no seu chat e poderá fazer algumas coisas com ele, como:

Para criar um pet, use o comando !pet criar {emoji} {nome do pet}

Para ver algumas informações sobre o pet, use o comando !pet stats
Este comando mostra quantos carinhos o pet já recebeu, quantas vezes ele brincou e o total de dias desde que ele foi criado

Se quiser sacrificar o seu pet, para talvez criar um outro com nome diferente, use o comando !pet matar`;
petCommand.examples = [
  {
    description: "Criar um pet para o canal",
    input: "!pet criar 🐶 Max",
    output: "🐶 Max foi criado no canal! 🎉",
  },
  {
    description: "Ver as estatísticas do pet",
    input: "!pet stats",
    output: "🐶 Max está feliz! Ele já recebeu 312 carinhos e 87 brincadeiras num total de 42 dias",
  },
];
petCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname.split(path.sep).pop()}/${__filename.split(path.sep).pop()}`;

petCommand.emojis = petEmojis;

module.exports = { petCommand };
