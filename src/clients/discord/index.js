require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { colorToHexString } = require("@mastondzn/dank-twitch-irc");

// Event handlers (kept in separate files for cleanliness)
const onReadyHandler = require("./events/ready");

class DiscordClient {
  constructor() {
    const allIntents = Object.values(GatewayIntentBits).reduce(
      (acc, p) => acc | p,
      0
    );

    this.client = new Client({ intents: allIntents });
    this.client.EmbedBuilder = EmbedBuilder;

    // Useful state
    this.client.duplicateMessages = [];

    // Bind methods to maintain proper 'this' context
    this.logCommand = this.logCommand.bind(this);
    this.logSend = this.logSend.bind(this);
    this.log = this.log.bind(this);
    this.importantLog = this.importantLog.bind(this);
    this.logWhisper = this.logWhisper.bind(this);
    this.logWhisperFrom = this.logWhisperFrom.bind(this);
    this.logError = this.logError.bind(this);
    this.notifyDevMention = this.notifyDevMention.bind(this);
  }

  sanitizeEmbedValue(value, fallback = "No value") {
    if (typeof value === "string") {
      // Truncate if too long (Discord limit is 1024 characters)
      if (value.length > 1024) {
        return value.substring(0, 1000) + "...";
      }
      // Remove any null characters or other invalid characters
      return value.replace(/\0/g, "").trim();
    } else if (value === null || value === undefined) {
      return fallback;
    } else {
      return String(value);
    }
  }

  async init() {
    // connect
    await this.client.login(process.env.DISCORD_TOKEN);

    // register events
    this.registerEvents();

    // tasks are started from main.js
  }

  registerEvents() {
    this.client.on("ready", () => onReadyHandler(this));
  }

  // intentionally empty: tasks are started in main.js

  // Utility methods for logging and notifications
  async logCommand(message, response, sentVia = null) {
    const channelName =
      message.channelName == "whisper"
        ? "📨 Whisper"
        : `#${message.channelName}`;

    const embed = new this.client.EmbedBuilder()
      .setTitle(
        `${channelName}/${message.displayName} - ${message.command.commandName}`
      )
      .setURL(`${this.getLogsUrl(message.channelName, message.id)}`)
      .addFields(
        {
          name: "Comando:",
          value: this.sanitizeEmbedValue(
            message.messageText,
            "No command text"
          ),
          inline: false,
        },
        {
          name: "Resposta:",
          value: this.sanitizeEmbedValue(response, "No response"),
          inline: false,
        }
      )
      .setColor(this.getColorForEmbed(message))
      .setFooter({
        text: `${this.formatResponseTime(
          message.responseTime
        )} ● ${this.getFormattedDateTime()}${
          sentVia !== null ? ` ● ${sentVia}` : ""
        }`,
      });

    if (message.notes != null) {
      embed.addFields({
        name: "Notas:",
        value: this.sanitizeEmbedValue(message.notes, "No notes"),
        inline: false,
      });
    }

    const logChannel = await this.client.channels.fetch(
      process.env.DISCORD_LOG_CHANNEL
    );
    logChannel.send({ embeds: [embed] }).catch((err) => {
      console.error(`Erro ao enviar mensagem no discord logCommand: ${err}`);
    });
  }

  async logSend(channel, content, sentVia = null) {
    console.info(`[SEND] #${channel}: ${content}`);
    const embed = new this.client.EmbedBuilder()
      .setTitle(`Enviado para #${channel}`)
      .setURL(`${this.getLogsUrl(channel)}`)
      .addFields({
        name: "Conteúdo:",
        value: this.sanitizeEmbedValue(content, "No content"),
        inline: false,
      })
      .setColor("#008000")
      .setFooter({
        text: `${this.getFormattedDateTime()}${
          sentVia !== null ? ` ● ${sentVia}` : ""
        }`,
      });

    const logChannel = await this.client.channels.fetch(
      process.env.DISCORD_LOG_CHANNEL
    );
    logChannel.send({ embeds: [embed] }).catch((err) => {
      console.error(`Erro ao enviar mensagem no discord logSend: ${err}`);
    });
  }

  async log(content) {
    console.info(content);
    try {
      const logChannel = await this.client.channels.fetch(
        process.env.DISCORD_LOG_CHANNEL
      );
      await logChannel.send(content);
    } catch (err) {
      console.error(`Erro ao enviar mensagem no discord log: ${err}`);
      setTimeout(async () => {
        try {
          const logChannel = await this.client.channels.fetch(
            process.env.DISCORD_LOG_CHANNEL
          );
          await logChannel.send(content);
        } catch (secondErr) {
          console.error(
            `Erro ao enviar mensagem no segundo envio no discord log: ${secondErr}`
          );
        }
      }, 5000);
    }
  }

  async importantLog(content) {
    console.info(`[IMPORTANT LOG] ${content}`);
    try {
      const logChannel = await this.client.channels.fetch(
        process.env.DISCORD_IMPORTANT_LOGS_CHANNEL
      );
      await logChannel.send(content);
    } catch (err) {
      console.error(`Erro ao enviar mensagem no discord log: ${err}`);
      setTimeout(async () => {
        try {
          const logChannel = await this.client.channels.fetch(
            process.env.DISCORD_IMPORTANT_LOGS_CHANNEL
          );
          await logChannel.send(content);
        } catch (secondErr) {
          console.error(
            `Erro ao enviar mensagem no segundo envio no discord log: ${secondErr}`
          );
        }
      }, 5000);
    }
  }

  async logWhisper(recipient, content) {
    console.info(`[WHISPER] to #${recipient}: ${content}`);
    const embed = new this.client.EmbedBuilder()
      .setTitle(`📨 Whisper para #${recipient}`)
      .addFields({
        name: "Conteúdo:",
        value: content,
        inline: false,
      })
      .setColor("#008000")
      .setFooter({
        text: `${this.getFormattedDateTime()}`,
      });

    const logChannel = await this.client.channels.fetch(
      process.env.DISCORD_LOG_CHANNEL
    );
    logChannel.send({ embeds: [embed] }).catch((err) => {
      console.error(`Erro ao enviar mensagem no discord logWhisper: ${err}`);
    });
  }

  async logWhisperFrom(message) {
    console.info(
      `[WHISPER] from #${message.senderUsername}: ${message.messageText}`
    );

    const embed = new this.client.EmbedBuilder()
      .setTitle(`📩 Whisper recebido de #${message.senderUsername}`)
      .addFields({
        name: "Conteúdo:",
        value: message.messageText,
        inline: false,
      })
      .setColor(this.getColorForEmbed(message))

      .setFooter({
        text: `${this.getFormattedDateTime()}`,
      });

    const logChannel = await this.client.channels.fetch(
      process.env.DISCORD_LOG_WHISPER_CHANNEL
    );
    logChannel.send({ embeds: [embed] }).catch((err) => {
      console.error(
        `Erro ao enviar mensagem no discord logWhisperFrom: ${err}`
      );
    });
  }

  async logError(content) {
    console.error(content);
    const embed = new this.client.EmbedBuilder()
      .setTitle(`Error Alert`)
      .addFields({
        name: "Error:",
        value: content,
        inline: false,
      })
      .setColor("#FF0000") // red
      .setFooter({
        text: `${this.getFormattedDateTime()}`,
      });

    const logChannel = await this.client.channels.fetch(
      process.env.DISCORD_IMPORTANT_LOGS_CHANNEL
    );
    // mention the dev discord user
    // logChannel.send(`<@${process.env.DEV_DISCORD_ID}>`)
    //     .catch((err) => {
    //         console.error(`Erro ao enviar mensagem no discord logError mention: ${err}`);
    //     });
    logChannel.send({ embeds: [embed] }).catch((err) => {
      console.error(`Erro ao enviar mensagem no discord logError: ${err}`);
    });
  }

  async notifyDevMention(message) {
    console.info(`[DEV MENTION] #${message.channelName}/${message.displayName}`);
    const embed = new this.client.EmbedBuilder()
      .setTitle(`#${message.channelName}/${message.displayName}`)
      .setURL(`${this.getLogsUrl(message.channelName, message.id)}`)
      .setColor(this.getColorForEmbed(message))
      .setFooter({
        text: `${this.getFormattedDateTime()}`,
      });

    if (message.isReply) {
      embed.addFields({
        name: `Respondendo a ${message.parentMessageUserDisplayName}:`,
        value: message.parentMessageText,
        inline: false,
      });
    }

    embed.addFields({
      name: "Mensagem:",
      value: message.originalMessageText || message.messageText,
      inline: false,
    });

    const devPingChannel = await this.client.channels.fetch(
      process.env.DISCORD_DEV_MENTIONS_CHANNEL
    );
    devPingChannel.send({ embeds: [embed] }).catch((err) => {
      console.error(
        `Erro ao enviar mensagem no discord notifyDevMention: ${err}`
      );
    });
  }

  // Helper methods
  getFormattedDateTime() {
    // for embed footer
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
  }

  getLogsUrl(channel, messageId = null) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `https://tv.supa.sh/logs?c=${channel}&d=${year}-${month}-${day}${
      messageId ? `#${messageId}` : ""
    }`;
  }

  getColorForEmbed(message) {
    if (message.userInfo) {
      return message.userInfo.color ? message.userInfo.color : "#008000";
    }
    if (message.color) {
      return colorToHexString(message.color);
    }
    return "#008000";
  }

  formatResponseTime(responseTime) {
    return `${Math.floor(responseTime)}ms (${(responseTime / 1000).toFixed(1)}s)`;
  }
}

module.exports = DiscordClient;
