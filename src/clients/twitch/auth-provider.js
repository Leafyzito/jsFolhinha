require("dotenv").config();
const { RefreshingAuthProvider } = require("@twurple/auth");

const { getTokenData } = require("../../utils/init");

class AuthProvider {
  constructor() {
    // https://twurple.js.org/reference/auth/classes/RefreshingAuthProvider.html
    this.provider = new RefreshingAuthProvider({
      clientId: process.env.BOT_CLIENT_ID,
      clientSecret: process.env.BOT_CLIENT_SECRET,
    });
  }

  async init() {
    // register events
    this.registerEvents();

    // add users from database
    await this.addUsers();

    // tasks are started from main.js
  }

  async addUsers() {
    const tokenDataList = await getTokenData();

    for (const tokenData of tokenDataList) {
      await this.addSingleUser(tokenData);
    }
  }

  async addSingleUser(tokenData) {
    try {
      const {
        userId, // not required, but if not present twurple will get from api later internally
        username, // not required, but useful for intents naming (dealing with users manually later or grouping)
        accessToken,
        refreshToken,
        scope,
        expiresIn,
        obtainmentTimestamp,
      } = tokenData;

      // Check if user is already added
      try {
        const existingScopes = this.provider.getCurrentScopesForUser(userId);
        if (existingScopes && existingScopes.length > 0) {
          // User already exists, Twurple's addUser will update if needed
          // But we'll still proceed as addUser handles updates gracefully
        }
      } catch {
        // User doesn't exist yet, which is fine - we'll add them
      }

      const newTokenData = {
        accessToken: accessToken,
        refreshToken: refreshToken ?? null,
        scope: scope,
        expiresIn: expiresIn ?? null,
        obtainmentTimestamp: obtainmentTimestamp ?? null,
      };
      const intents = [`${username}User`]; // [`${username}User`] // if username is available
      userId == process.env.BOT_USERID ? intents.push("chat") : null;
      this.provider.addUser(userId, newTokenData, intents); // no userId: await this.provider.addUserForToken(tokenData);

      return { success: true, userId };
    } catch (error) {
      console.error(`Error adding user to auth provider:`, error);
      if (fb.discord && fb.discord.logError) {
        fb.discord.logError(
          `Error adding user to auth provider: ${error.message}`
        );
      }
      return { success: false, userId: tokenData.userId, error: error.message };
    }
  }

  async addUserFromDb(userId) {
    try {
      // Fetch token data for specific user from database
      const authToken = await fb.db.get("auth", { user_id: userId }, true);

      if (!authToken) {
        return {
          success: false,
          userId,
          error: "Auth token not found in database",
        };
      }

      // Map database fields to the format expected by addSingleUser
      const tokenData = {
        userId: authToken.user_id,
        username: authToken.username,
        accessToken: authToken.access_token,
        refreshToken: authToken.refresh_token,
        scope: authToken.scope,
        expiresIn: authToken.expires_at
          ? Math.floor((new Date(authToken.expires_at) - new Date()) / 1000)
          : null,
        obtainmentTimestamp: authToken.created_at
          ? Math.floor(new Date(authToken.created_at).getTime() / 1000)
          : null,
      };

      return await this.addSingleUser(tokenData);
    } catch (error) {
      console.error(`Error adding user ${userId} from database:`, error);
      if (fb.discord && fb.discord.logError) {
        fb.discord.logError(
          `Error adding user ${userId} from database: ${error.message}`
        );
      }
      return { success: false, userId, error: error.message };
    }
  }

  registerEvents() {
    this.provider.onRefresh(async (userId, newTokenData) => {
      try {
        console.info(`Token refreshed for userId: ${userId}`);

        // Map newTokenData to database format
        const updateData = {
          access_token: newTokenData.accessToken,
          refresh_token: newTokenData.refreshToken,
          scope: newTokenData.scope,
          expires_at: newTokenData.expiresIn
            ? new Date(Date.now() + newTokenData.expiresIn * 1000)
            : null,
          last_used: new Date(),
          is_valid: true,
          failed_attempts: 0,
        };

        // Update the token in the database
        await fb.db.update("auth", { user_id: userId }, { $set: updateData });

        console.info(`Token data updated in database for userId: ${userId}`);
      } catch (error) {
        console.error(
          `Error updating token data for userId: ${userId}:`,
          error
        );
        if (fb.discord && fb.discord.logError) {
          fb.discord.logError(
            `Token refresh database update failed for userId: ${userId} - ${error.message}`
          );
        }
      }
    });
    this.provider.onRefreshFailure(async (userId, error) => {
      try {
        console.error(`Token refresh failed for userId: ${userId}`, error);

        // Update failed attempts in database
        await fb.db.update(
          "auth",
          { user_id: userId },
          {
            $inc: { failed_attempts: 1 },
            $set: {
              last_used: new Date(),
              is_valid: false,
            },
          }
        );

        // Log to discord if available
        if (fb.discord && fb.discord.logError) {
          // fb.discord.logError(
          //   `Token refresh failed for userId: ${userId} - check logs`
          // );
        }
        console.error(
          `Token refresh failed for userId for userId: ${userId} - ${error.message}`
        );
      } catch (dbError) {
        console.error(
          `Error updating failed refresh attempt for userId: ${userId}:`,
          dbError
        );
      }
    });
  }
}

module.exports = AuthProvider;
