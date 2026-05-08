module.exports = function buildPetTemplate(params) {
  const message = params?.message ?? params;
  if (!message) {
    throw new Error("insert template 'pet' requires { message }");
  }

  return {
    channel: message.channelName,
    channelId: message.channelID,
    pet_emoji: "",
    pet_name: "",
    is_alive: false,
    alive_since: 0,
    warns: 0,
    time_of_death: 0,
    total_plays: 0,
    total_pats: 0,
    last_interaction: 0,
    last_play: 0,
    last_pat: 0,
  };
};
