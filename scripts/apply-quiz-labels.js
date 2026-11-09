require("dotenv").config();

// db uses fb.metrics, normally set up by main.js
global.fb = { metrics: require("../src/metrics") };

const MongoUtils = require("../src/db/index.js");

async function runTest() {
  const db = new MongoUtils();
  await db.ensureConnection();

  // Find all suggestions with "Quiz" label and id > 220 and id < 394
  let suggestions = await db.get("sugestoes", {
    $or: [{ labels: { $exists: false } }, { labels: { $size: 0 } }],
  });

  if (!suggestions || suggestions.length === 0) {
    console.log("No suggestions found");
    return;
  }

  if (!Array.isArray(suggestions)) {
    suggestions = [suggestions];
  }

  console.log(`Found ${suggestions.length} suggestions`);

  for (const sugg of suggestions) {
    if (sugg.sugestao.substring(1).startsWith("quiz")) {
      // ignore prefix
      console.log(`Adding label to suggestion ${sugg._id}`);
      await db.update(
        "sugestoes",
        { _id: sugg._id },
        { $set: { labels: ["Quiz"] } },
      );
    }
  }
}

runTest();
