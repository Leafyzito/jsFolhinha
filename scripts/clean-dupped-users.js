require("dotenv").config();
const { MongoClient } = require("mongodb");
const readline = require("readline");
const mongoUri = process.env.MONGO_URI;
const clientMongo = new MongoClient(mongoUri);
const db = clientMongo.db("folhinha");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promise-based function to ask for confirmation
function askForConfirmation() {
  return new Promise((resolve) => {
    rl.question(
      'Press Enter to proceed with deletion, or type "no" to cancel: ',
      (answer) => {
        resolve(answer.toLowerCase() !== "no");
      }
    );
  });
}

// Wrapping the MongoDB operations in an async function
async function main() {
  try {
    await clientMongo.connect();

    const duplicateGroups = await db
      .collection("users")
      .aggregate([
        { $group: { _id: "$userid", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    const duppedUsers = duplicateGroups.map((g) => g._id);
    console.log("Total users in DB:", await db.collection("users").countDocuments());
    console.log("Duplicated user ids found:", duppedUsers.length, duppedUsers);

    if (duppedUsers.length === 0) {
      console.log("No duplicated users found. Exiting...");
      return;
    }

    // Show what will be deleted
    for (const userId of duppedUsers) {
      const registries = await db
        .collection("users")
        .find({ userid: userId })
        .toArray();
      const oldestRegistry = registries.reduce((oldest, current) => {
        return oldest.lsDate < current.lsDate ? oldest : current;
      });
      const registriesToDelete = registries.filter(
        (r) => r._id !== oldestRegistry._id
      );
      console.log(
        `Will delete ${
          registries.length - 1
        } registries for user ${userId} (keeping id: ${
          oldestRegistry._id
        } (lsDate: ${oldestRegistry.lsDate}), deleting ids: ${registriesToDelete
          .map((r) => `${r._id} (lsDate: ${r.lsDate})`)
          .join(", ")})`
      );
    }

    // Ask for confirmation
    const confirmed = await askForConfirmation();

    if (confirmed) {
      // Proceed with deletion
      for (const userId of duppedUsers) {
        const registries = await db
          .collection("users")
          .find({ userid: userId })
          .toArray();
        const oldestRegistry = registries.reduce((oldest, current) => {
          return oldest.lsDate < current.lsDate ? oldest : current;
        });
        console.log(
          `Deleting ${
            registries.length - 1
          } registries for user ${userId} (keeping id: ${oldestRegistry._id})`
        );
        await db
          .collection("users")
          .deleteMany({ userid: userId, _id: { $ne: oldestRegistry._id } });
      }
      console.log("Deletion completed successfully.");
    } else {
      console.log("Operation cancelled by user.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    rl.close();
    await clientMongo.close();
  }
}

// Execute the function
main();
