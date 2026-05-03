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
      .collection("config")
      .aggregate([
        { $group: { _id: "$channelId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    const duppedConfigs = duplicateGroups.map((g) => g._id);
    console.log(
      "Total config docs in DB:",
      await db.collection("config").countDocuments()
    );
    console.log(
      "Duplicated channel ids found:",
      duppedConfigs.length,
      duppedConfigs
    );

    if (duppedConfigs.length === 0) {
      console.log("No duplicated configs found. Exiting...");
      return;
    }

    // Show what will be deleted
    for (const channelId of duppedConfigs) {
      const registries = await db
        .collection("config")
        .find({ channelId: channelId })
        .toArray();
      const highestRegistry = registries.reduce((highest, current) => {
        return highest.msgCount.total > current.msgCount.total
          ? highest
          : current;
      });
      const registriesToDelete = registries.filter(
        (r) => r._id !== highestRegistry._id
      );
      console.log(
        `Will delete ${
          registries.length - 1
        } registries for channel ${channelId} (keeping id: ${
          highestRegistry._id
        } (msgCount: ${
          highestRegistry.msgCount.total
        }), deleting ids: ${registriesToDelete
          .map((r) => `${r._id} (msgCount: ${r.msgCount.total})`)
          .join(", ")})`
      );
    }

    // Ask for confirmation
    const confirmed = await askForConfirmation();

    if (confirmed) {
      // Proceed with deletion
      for (const channelId of duppedConfigs) {
        const registries = await db
          .collection("config")
          .find({ channelId: channelId })
          .toArray();
        const highestRegistry = registries.reduce((highest, current) => {
          return highest.msgCount.total > current.msgCount.total
            ? highest
            : current;
        });
        console.log(
          `Deleting ${
            registries.length - 1
          } registries for channel ${channelId} (keeping id: ${
            highestRegistry._id
          })`
        );
        await db.collection("config").deleteMany({
          channelId: channelId,
          _id: { $ne: highestRegistry._id },
        });
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
