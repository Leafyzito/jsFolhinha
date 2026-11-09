// saves the end of year cookie/dungeon counters from a backup-db.js dump
// wrapped of the next year diffs against them
// usage: node scripts/import-wrapped-snapshot.js <backup dir> <year>
require("dotenv").config();
const { MongoClient } = require("mongodb");
const { snapshotFromBackup, snapshotCollection } = require("../src/utils/wrapped-compute");

async function main() {
  const [dir, yearArg] = process.argv.slice(2);
  const year = Number(yearArg);
  if (!dir || !year) {
    console.error("usage: node scripts/import-wrapped-snapshot.js <backup dir> <year>");
    process.exit(1);
  }

  const snapshot = snapshotFromBackup(dir);
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const ops = [...snapshot].map(([userId, fields]) => ({
      replaceOne: {
        filter: { _id: userId },
        replacement: { _id: userId, ...fields },
        upsert: true,
      },
    }));
    const result = await client
      .db("folhinha")
      .collection(snapshotCollection(year))
      .bulkWrite(ops, { ordered: false });
    console.log(
      `Imported ${snapshot.size} users to ${snapshotCollection(year)} (${result.upsertedCount} new, ${result.modifiedCount} updated)`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
