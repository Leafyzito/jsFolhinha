async function petAttentionTask() {
  const pets = await fb.db.get("pet", { is_alive: true }, true);
  for (const pet of pets) {
    const channelName = (await fb.api.helix.getUserByID(pet.channelId))?.login;
    if (!channelName) {
      continue;
    }
    const channelConfig = await fb.db.get("config", {
      channelId: pet.channelId,
    });
    if (
      ![
        ...new Set([
          ...fb.twitch.anonClient.currentChannels,
          ...fb.twitch.anonClient.channelsToJoin,
        ]),
      ].includes(channelName)
    ) {
      continue;
    }

    const lastInteraction = pet.last_interaction;
    const warns = pet.warns;
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsedTime = currentTime - lastInteraction;

    if (elapsedTime > 54_000 && warns === 0) {
      console.info(`* 1st warning for ${channelName}`);

      if (await fb.api.helix.isStreamOnline(channelName)) {
        console.info(
          `* ${channelName} is paused or streaming, skipping and adding 10mins`
        );
        await fb.db.update(
          "pet",
          { channelId: pet.channelId },
          { $inc: { last_interaction: 600 } }
        );
        continue;
      }

      fb.log.send(
        channelName,
        `${pet.pet_emoji} ${pet.pet_name} está pedindo atenção! Se ninguém fizer carinho ou brincar com ele, ele vai ficar rabugento!`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await fb.db.update(
        "pet",
        { channelId: pet.channelId },
        { $set: { warns: 1 } }
      );
      continue;
    }

    if (elapsedTime > 108_000 && warns === 1) {
      console.info(`* 2nd warning for ${channelName}`);

      if (
        channelConfig.isPaused ||
        (await fb.api.helix.isStreamOnline(channelName))
      ) {
        console.info(
          `* ${channelName} is paused or streaming, skipping and adding 10mins`
        );
        await fb.db.update(
          "pet",
          { channelId: pet.channelId },
          { $inc: { last_interaction: 600 } }
        );
        continue;
      }

      fb.log.send(
        channelName,
        `${pet.pet_emoji} ${pet.pet_name} ficou rabugento! Já se passaram mais de 24 horas desde a última interação!`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await fb.db.update(
        "pet",
        { channelId: pet.channelId },
        { $set: { warns: 2 } }
      );
      continue;
    }

    if (elapsedTime > 180_000 && warns === 2) {
      console.info(`* 3rd warning for ${channelName}`);

      if (
        channelConfig.isPaused ||
        (await fb.api.helix.isStreamOnline(channelName))
      ) {
        console.info(
          `* ${channelName} is paused or streaming, skipping and adding 10mins`
        );
        await fb.db.update(
          "pet",
          { channelId: pet.channelId },
          { $inc: { last_interaction: 600 } }
        );
        continue;
      }

      fb.log.send(
        channelName,
        `${pet.pet_emoji} ${pet.pet_name} foi embora! Ninguém deu atenção a ele e ele se foi...`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await fb.db.update(
        "pet",
        { channelId: pet.channelId },
        { $set: { is_alive: false, time_of_death: currentTime } }
      );
      continue;
    }
  }
}

module.exports = petAttentionTask;
