require("dotenv").config();
const { ApiClient } = require("@twurple/api");
const { AppTokenAuthProvider } = require("@twurple/auth");

const CALLBACK_PREFIX = "https://eventsub.folhinhabot.com/eventsub/event/";

// Lists the bot's webhook subscriptions on Twitch. Pass --delete to remove them, e.g. after rolling back
// They're shared with prod, so don't run with --delete while prod is using them
async function main() {
  const shouldDelete = process.argv.includes("--delete");
  const authProvider = new AppTokenAuthProvider(
    process.env.BOT_CLIENT_ID,
    process.env.BOT_CLIENT_SECRET
  );
  const apiClient = new ApiClient({ authProvider });

  const firstPage = await apiClient.eventSub.getSubscriptions();
  console.log(`Quota used: ${firstPage.totalCost}/${firstPage.maxTotalCost}`);

  const subscriptions = await apiClient.eventSub
    .getSubscriptionsPaginated()
    .getAll();
  const webhooks = subscriptions.filter(
    (subscription) =>
      subscription.transportMethod === "webhook" &&
      subscription._transport.callback?.startsWith(CALLBACK_PREFIX)
  );

  const byStatus = {};
  for (const subscription of webhooks) {
    byStatus[subscription.status] = (byStatus[subscription.status] ?? 0) + 1;
  }
  console.log(`Found ${webhooks.length} webhook subscriptions`, byStatus);

  if (!shouldDelete) {
    return;
  }

  for (const subscription of webhooks) {
    await apiClient.eventSub.deleteSubscription(subscription.id);
  }
  console.log(`Deleted ${webhooks.length} webhook subscriptions`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
