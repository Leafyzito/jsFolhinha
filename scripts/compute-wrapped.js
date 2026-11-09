// computes the wrapped of every user and saves it to the wrapped<year> collection
// usage: node scripts/compute-wrapped.js <year> [--dry-run <out.json>] [--snapshot-dir <backup dir>]
// --dry-run writes to a file instead of mongo
// --snapshot-dir reads the previous year counters from a backup instead of wrappedsnapshot<year - 1>
require("dotenv").config();
const fs = require("fs");
const { MongoClient } = require("mongodb");
const {
  computeWrapped,
  saveWrapped,
  snapshotFromBackup,
  wrappedCollection,
} = require("../src/utils/wrapped-compute");

function flag(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

async function main() {
  const year = Number(process.argv[2]);
  if (!year) {
    console.error(
      "usage: node scripts/compute-wrapped.js <year> [--dry-run <out.json>] [--snapshot-dir <backup dir>]"
    );
    process.exit(1);
  }
  const dryRun = flag("--dry-run");
  const snapshotDir = flag("--snapshot-dir");

  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const mongo = client.db("folhinha");

    const startedAt = Date.now();
    const wrapped = await computeWrapped(mongo, year, {
      snapshot: snapshotDir ? snapshotFromBackup(snapshotDir) : undefined,
    });
    console.log(
      `Computed ${wrapped.users.length} users in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
    );

    if (dryRun) {
      fs.writeFileSync(dryRun, JSON.stringify(wrapped, null, 2), "utf8");
      console.log(`Wrote ${dryRun}`);
      return;
    }

    const result = await saveWrapped(mongo, year, wrapped);
    console.log(
      `Saved to ${wrappedCollection(year)} (${result.upsertedCount} new, ${result.modifiedCount} updated)`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
