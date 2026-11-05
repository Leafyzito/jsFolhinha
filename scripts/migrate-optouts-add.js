// step 1 of the optouts migration: builds the optouts array from the old optoutLs/optoutStalk/optoutRemind booleans
// leaves the old fields in place, remove them later with migrate-optouts-cleanup.js
// only touches users without an optouts array, so re-running it never undoes an !optin made after the deploy
// run !reloaddb afterwards if the bot is up, the users cache holds the old docs
require("dotenv").config();
const { MongoClient } = require("mongodb");
const readline = require("readline");
const mongoUri = process.env.MONGO_URI;
const clientMongo = new MongoClient(mongoUri);
const db = clientMongo.db("folhinha");

const LEGACY_FIELDS = {
  optoutLs: "lastseen",
  optoutStalk: "stalk",
  optoutRemind: "remind",
};

function askForConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(
      'Press Enter to proceed with the migration, or type "no" to cancel: ',
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() !== "no");
      }
    );
  });
}

async function main() {
  try {
    await clientMongo.connect();
    const users = db.collection("users");
    const notMigrated = { optouts: { $exists: false } };

    const total = await users.countDocuments(notMigrated);
    console.log(`Users without an optouts array: ${total}`);
    for (const [field, commandName] of Object.entries(LEGACY_FIELDS)) {
      const count = await users.countDocuments({ ...notMigrated, [field]: true });
      console.log(`  ${field}: true -> "${commandName}": ${count} users`);
    }

    if (total === 0) {
      console.log("Nothing to migrate. Exiting...");
      return;
    }

    if (!(await askForConfirmation())) {
      console.log("Migration cancelled.");
      return;
    }

    // one pipeline update so every doc gets all of its optouts at once
    const result = await users.updateMany(notMigrated, [
      {
        $set: {
          optouts: {
            $concatArrays: Object.entries(LEGACY_FIELDS).map(
              ([field, commandName]) => ({
                $cond: [{ $eq: [`$${field}`, true] }, [commandName], []],
              })
            ),
          },
        },
      },
    ]);
    console.log(`Added optouts to ${result.modifiedCount} users`);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await clientMongo.close();
  }
}

main();
