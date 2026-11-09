require("dotenv").config();

// db uses fb.metrics, normally set up by main.js
global.fb = { metrics: require("../src/metrics") };
const fs = require("fs");
const path = require("path");

// This import assumes your db/index.js exports a class called MongoUtils
const MongoUtils = require("../src/db/index.js");

async function backupDb() {
  const db = new MongoUtils();

  // Ensure DB connection
  await db.ensureConnection();
  const mongo = db.db;

  // List all collections
  const collections = await mongo.listCollections().toArray();
  if (!collections || collections.length === 0) {
    console.error("No collections found.");
    process.exit(1);
  }

  // Create folder in project root named "db-backups" with today's date (YYYY-MM-DD)
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  // Project root is one level up from __dirname (since scripts/backup-db.js)
  const projectRoot = path.resolve(__dirname, "..");
  const backupDir = path.join(projectRoot, "db-backups", dateStr);
  fs.mkdirSync(backupDir, { recursive: true });

  // For each collection, dump all docs to a JSON file
  for (const col of collections) {
    const colName = col.name;
    const collection = mongo.collection(colName);
    const docs = await collection.find({}).toArray();

    // Write to JSON file
    const filePath = path.join(backupDir, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");
    console.log(
      `Backed up collection "${colName}" (${docs.length} docs) to ${filePath}`,
    );
  }

  // Optionally, close db connection
  if (db.client && db.client.close) {
    await db.client.close();
  }
  console.log(`Backup completed. All collections saved to ${backupDir}`);
  process.exit(0);
}

if (require.main === module) {
  backupDb().catch((err) => {
    console.error("Backup failed:", err);
    process.exit(1);
  });
}
