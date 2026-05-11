// Helper function to normalize scopes to an array
function normalizeScopes(scopes) {
  if (!scopes) {
    return [];
  }
  if (Array.isArray(scopes)) {
    return scopes;
  }
  if (typeof scopes === "string") {
    // Handle space-separated or comma-separated strings
    return scopes
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

// Helper function to check if database has new scopes not in provider
function hasNewScopes(dbScopes, providerScopes) {
  const dbScopesArray = normalizeScopes(dbScopes);
  const providerScopesArray = normalizeScopes(providerScopes);

  // Check if any database scope is missing from provider
  return dbScopesArray.some((scope) => !providerScopesArray.includes(scope));
}

async function checkNewAuthUsers() {
  try {
    // Fetch all auth entries from database (force database fetch to bypass cache)
    const authTokensRaw = await fb.db.get("auth", {}, true);

    if (!authTokensRaw) {
      return;
    }

    // Ensure we always work with an array
    const authTokens = Array.isArray(authTokensRaw)
      ? authTokensRaw
      : [authTokensRaw];

    if (authTokens.length === 0) {
      return;
    }

    // Compare database entries against users already in auth provider
    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const token of authTokens) {
      const userId = token.user_id;

      try {
        // Check if user is in provider
        let providerScopes = null;
        let userInProvider = false;
        try {
          providerScopes =
            fb.authProvider.provider.getCurrentScopesForUser(userId);
          if (providerScopes && providerScopes.length > 0) {
            userInProvider = true;
          }
        } catch {
          // User not in provider yet
          userInProvider = false;
        }

        if (!userInProvider) {
          // User is in DB but not in provider - add them
          const result = await fb.authProvider.addUserFromDb(userId);
          if (result.success) {
            console.info(`User ${userId} added to auth provider dynamically`);
            addedCount++;
          } else {
            console.error(
              `Failed to add user ${userId} to auth provider: ${
                result.error || "Unknown error"
              }`
            );
            errorCount++;
          }
        } else {
          // User is already in provider - check for new scopes
          const dbScopes = token.scope;
          if (hasNewScopes(dbScopes, providerScopes)) {
            // Database has new scopes - update the user
            const result = await fb.authProvider.addUserFromDb(userId);
            if (result.success) {
              console.info(
                `User ${userId} updated in auth provider with new scopes`
              );
              updatedCount++;
            } else {
              console.error(
                `Failed to update user ${userId} in auth provider: ${
                  result.error || "Unknown error"
                }`
              );
              errorCount++;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        errorCount++;
        // Continue with other users even if one fails
      }
    }

    // Log summary if there was activity
    if (addedCount > 0 || updatedCount > 0 || errorCount > 0) {
      console.info(
        `Auth polling complete: ${addedCount} users added, ${updatedCount} users updated, ${errorCount} errors, ${authTokens.length} total checked`
      );
    }
  } catch (error) {
    console.error("Error in checkNewAuthUsers task:", error);
    if (fb.discord && fb.discord.logError) {
      fb.discord.logError(`Error in checkNewAuthUsers task: ${error.message}`);
    }
  }
}

module.exports = checkNewAuthUsers;
