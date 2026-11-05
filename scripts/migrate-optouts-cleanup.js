// step 2 of the optouts migration: removes the old optoutLs/optoutStalk/optoutRemind booleans
// only run once the optouts array is live in prod and nothing needs a rollback
// refuses to run while some user still has no optouts array (migrate-optouts-add.js not run yet)
require("dotenv").config();
const { MongoClient } = require("mongodb");
const readline = require("readline");
const mongoUri = process.env.MONGO_URI;
const clientMongo = new MongoClient(mongoUri);
const db = clientMongo.db("folhinha");

const LEGACY_FIELDS = ["optoutLs", "optoutStalk", "optoutRemind"];

function askForConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(
      'Press Enter to proceed with deletion, or type "no" to cancel: ',
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

    const notMigrated = await users.countDocuments({
      optouts: { $exists: false },
      $or: LEGACY_FIELDS.map((field) => ({ [field]: { $exists: true } })),
    });
    if (notMigrated > 0) {
      console.log(
        `${notMigrated} users still have the old fields but no optouts array. Run migrate-optouts-add.js first. Exiting...`
      );
      process.exitCode = 1;
      return;
    }

    const legacyQuery = {
      $or: LEGACY_FIELDS.map((field) => ({ [field]: { $exists: true } })),
    };
    const total = await users.countDocuments(legacyQuery);
    console.log(`Users with old optout fields: ${total}`);

    if (total === 0) {
      console.log("Nothing to delete. Exiting...");
      return;
    }

    if (!(await askForConfirmation())) {
      console.log("Deletion cancelled.");
      return;
    }

    const result = await users.updateMany(legacyQuery, {
      $unset: Object.fromEntries(LEGACY_FIELDS.map((field) => [field, ""])),
    });
    console.log(`Removed old optout fields from ${result.modifiedCount} users`);
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exitCode = 1;
  } finally {
    await clientMongo.close();
  }
}

main();
