const path = require("path");

const countlineCommand = async (message) => {
  try {
    const clTarget =
      message.args[1]?.replace(/^@/, "") || message.senderUsername;

    // if (clTarget.toLowerCase() === "folhinhabot") {
    //   return {
    //     reply: `Para de tentar me contar Stare`,
    //   };
    // }

    if (["top", "rank", "ranking"].includes(clTarget.toLowerCase())) {
      // Get top 5 chatters from ClickHouse
      const topChatters = await fb.clickhouse.query(
        `
         SELECT 
           user_id,
           COUNT(*) as message_count
         FROM message_structured 
         WHERE channel_id = {channelId:String}
         GROUP BY user_id
         ORDER BY message_count DESC
         LIMIT 5
       `,
        { channelId: message.channelID }
      );

      // Access the data array from ClickHouse result
      const topChattersData = topChatters.data || topChatters;

      if (topChattersData.length === 0) {
        return {
          reply: "Nenhuma mensagem encontrada neste canal",
        };
      }

      // Get all user IDs at once
      const userIds = topChattersData.map((chatter) => chatter.user_id);
      const userInfos = await fb.api.helix.getManyUsersByUserIDs(userIds);

      let reply = `Top 5 chatters desse chat: `;
      for (let i = 0; i < topChattersData.length; i++) {
        const chatter = topChattersData[i];
        // Find user info from the batch result
        const userInfo = userInfos.find((user) => user.id === chatter.user_id);
        const username = userInfo
          ? userInfo.displayName || userInfo.login
          : `User${chatter.user_id}`;

        reply += `${i + 1}º ${username}: (${parseInt(
          chatter.message_count
        ).toLocaleString("fr-FR")})`;
        if (i !== topChattersData.length - 1) {
          reply += ", ";
        }
      }

      // Check if user is in top 5, only show ranking if they're not
      const userInTop5 = topChattersData.some(
        (chatter) => chatter.user_id === message.senderUserID
      );

      if (!userInTop5) {
        // Find user's rank
        const userRank = await fb.clickhouse.query(
          `
           SELECT 
             COUNT(*) + 1 as rank
           FROM (
             SELECT 
               user_id,
               COUNT(*) as message_count
             FROM message_structured 
             WHERE channel_id = {channelId:String}
             GROUP BY user_id
             HAVING COUNT(*) > (
               SELECT COUNT(*) 
               FROM message_structured 
               WHERE channel_id = {channelId:String} 
               AND user_id = {userId:String}
             )
           )
         `,
          { channelId: message.channelID, userId: message.senderUserID }
        );

        const userMessageCount = await fb.clickhouse.query(
          `
           SELECT COUNT(*) FROM message_structured 
           WHERE channel_id = {channelId:String} 
           AND user_id = {userId:String}
         `,
          { channelId: message.channelID, userId: message.senderUserID }
        );

        const userCount = parseInt(userMessageCount.data[0]["COUNT()"]);
        const userRanking =
          userRank.data && userRank.data.length > 0
            ? parseInt(userRank.data[0].rank)
            : "N/A";

        if (userRanking !== "N/A") {
          reply += `. Você está em ${userRanking}º com ${userCount.toLocaleString(
            "fr-FR"
          )} mensagens`;
        }
      }

      const emote = await fb.emotes.getEmoteFromList(
        message.channelName,
        ["falamuito", "talkk", "peepotalk"],
        "🗣️"
      );

      return {
        reply: `${reply} ${emote}`,
      };
    }

    // Get user ID for the target user
    let clTargetID;
    if (clTarget !== message.senderUsername) {
      const userInfo = await fb.api.helix.getUserByUsername(clTarget);
      if (!userInfo) {
        return {
          reply: `O usuário ${clTarget} não existe`,
        };
      }
      clTargetID = userInfo.id;
    } else {
      clTargetID = message.senderUserID;
    }

    // Get user message count
    const userMessageCount = await fb.clickhouse.query(
      `
      SELECT COUNT(*) FROM message_structured 
      WHERE channel_id = {channelId:String} 
      AND user_id = {userId:String}
    `,
      { channelId: message.channelID, userId: clTargetID }
    );

    // Get total channel message count
    const channelTotalCount = await fb.clickhouse.query(
      `
      SELECT COUNT(*) FROM message_structured 
      WHERE channel_id = {channelId:String}
    `,
      { channelId: message.channelID }
    );

    const userCount = parseInt(userMessageCount.data[0]["COUNT()"]);
    const totalCount = parseInt(channelTotalCount.data[0]["COUNT()"]);

    if (userCount === 0) {
      return {
        reply: `${clTarget} nunca falou neste chat`,
      };
    }

    return {
      reply: `${clTarget} mandou ${userCount.toLocaleString(
        "fr-FR"
      )} das ${totalCount.toLocaleString("fr-FR")} mensagens totais deste chat`,
    };
  } catch (error) {
    console.error("Countline command error:", error);
    return {
      reply: "Erro ao buscar contagem de mensagens",
    };
  }
};

countlineCommand.commandName = "countline";
countlineCommand.aliases = ["countline", "cl"];
countlineCommand.shortDescription =
  "Mostra a quantidade de mensagens de um usuário no chat atual";
countlineCommand.cooldown = 5000;
countlineCommand.cooldownType = "channel";
countlineCommand.whisperable = false;
countlineCommand.description = `Veja quantas mensagem você ou algum usuário já mandou no chat no qual o comando foi realizado

Pode também utilizar !countline top para ver o top 5 de pessoas que mais falaram no chat

Contando desde 06/03/2025`;
countlineCommand.code = `https://github.com/leafyzito/jsFolhinha/blob/main/src/commands/${__dirname
  .split(path.sep)
  .pop()}/${__filename.split(path.sep).pop()}`;

module.exports = {
  countlineCommand,
};
