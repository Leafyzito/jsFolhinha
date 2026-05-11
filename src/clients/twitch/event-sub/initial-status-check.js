const { ApiClient } = require("@twurple/api");
const { getBroadcasterToken, hasScope } = require("./utils");

/**
 * Check initial bot status (mod/VIP) for a broadcaster
 * @param {string} broadcasterId - The broadcaster's user ID
 * @param {Set<string>|null} [moderatedChannelsCache] - Optional cached Set of broadcaster IDs where bot is a mod
 */
async function checkInitialStatus(
  broadcasterId,
  moderatedChannelsCache = null
) {
  try {
    // Check if broadcaster token is available
    const broadcasterToken = await getBroadcasterToken(broadcasterId);

    if (!broadcasterToken) {
      console.warn(
        `* Skipping initial status check for ${broadcasterId}: broadcaster token not available`
      );
      // Set botIsMod and botIsVip to false as default when token is not available
      await fb.db.update(
        "config",
        { channelId: broadcasterId },
        {
          $set: {
            botIsMod: false,
            botIsVip: false,
          },
        }
      );
      return;
    }

    // Check if bot is a moderator using Get Moderated Channels endpoint
    // This endpoint returns all channels where the bot has moderator privileges
    let botIsMod = false;
    const botUserId = process.env.BOT_USERID;

    // Use cached list if provided, otherwise fetch from API
    if (moderatedChannelsCache && moderatedChannelsCache instanceof Set) {
      // Use cached list for fast lookup
      botIsMod = moderatedChannelsCache.has(String(broadcasterId));
    } else {
      // Fall back to API call if cache is not provided (backward compatibility)
      try {
        const botHasModeratedChannelsScope = await hasScope(
          botUserId,
          "user:read:moderated_channels"
        );

        if (botHasModeratedChannelsScope) {
          // Create bot-specific ApiClient to use bot's token
          const botApiClient = new ApiClient({
            authProvider: fb.authProvider.provider,
            userId: botUserId,
          });

          // Get all channels where the bot has moderator privileges
          let cursor = null;
          do {
            const result = await botApiClient.moderation.getModeratedChannels(
              botUserId,
              {
                after: cursor,
              }
            );

            if (result && result.data) {
              for (const channel of result.data) {
                // Extract broadcaster_id from channel object (API returns broadcaster_id)
                // Check both snake_case (official API) and camelCase (library normalization)
                const channelBroadcasterId =
                  channel.id || channel.broadcaster_id || channel.broadcasterId;

                if (
                  channelBroadcasterId === broadcasterId ||
                  String(channelBroadcasterId) === String(broadcasterId)
                ) {
                  botIsMod = true;
                  break;
                }
              }
            }
            if (botIsMod) break;
            cursor = result?.pagination?.cursor || null;
          } while (cursor);
        } else {
          // Bot doesn't have required scope, botIsMod remains false
          console.warn(
            `* Bot does not have user:read:moderated_channels scope for ${broadcasterId}`
          );
        }
      } catch (error) {
        console.error(
          `Error checking moderator status for ${broadcasterId}:`,
          error
        );
      }
    }

    // Check if bot is a VIP
    let botIsVip = false;
    const hasVipReadScope = await hasScope(broadcasterId, "channel:read:vips");

    if (hasVipReadScope) {
      try {
        // Create broadcaster-specific ApiClient to use broadcaster's token
        const broadcasterApiClient = new ApiClient({
          authProvider: fb.authProvider.provider,
          userId: broadcasterId,
        });
        const botUserId = process.env.BOT_USERID;

        // Handle paginated results - ensure we check all pages
        let cursor = null;
        let hasMorePages = true;
        do {
          const result = await broadcasterApiClient.channels.getVips(
            broadcasterId,
            cursor ? { after: cursor } : {}
          );
          if (result && result.data) {
            for (const vip of result.data) {
              // Check multiple possible property names for user ID
              // VIP objects might have userId, user.id, or id property
              const vipUserId = vip.userId || vip.user?.id || vip.id;
              if (vipUserId === botUserId) {
                botIsVip = true;
                break;
              }
            }
          }
          if (botIsVip) break;
          // Get cursor for next page
          cursor = result?.pagination?.cursor || null;
          hasMorePages = !!cursor;
        } while (hasMorePages);
      } catch (error) {
        console.error(`Error checking VIP status for ${broadcasterId}:`, error);
      }
    }

    // Update config collection
    await fb.db.update(
      "config",
      { channelId: broadcasterId },
      {
        $set: {
          botIsMod: botIsMod,
          botIsVip: botIsVip,
        },
      }
    );

    console.info(
      `* Initial status for ${broadcasterId}: mod=${botIsMod}, vip=${botIsVip}`
    );
  } catch (error) {
    console.error(`Error checking initial status for ${broadcasterId}:`, error);
    if (fb.discord && fb.discord.logError) {
      fb.discord.logError(
        `Initial status check failed for ${broadcasterId}: ${error.message}`
      );
    }
  }
}

module.exports = {
  checkInitialStatus,
};
