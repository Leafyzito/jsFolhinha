const buildAfk = require("./afk");
const buildBans = require("./bans");
const buildConfig = require("./config");
const buildCookie = require("./cookie");
const buildDungeon = require("./dungeon");
const buildPet = require("./pet");
const buildUsers = require("./users");

const INSERT_TEMPLATES = {
  afk: { collection: "afk", build: buildAfk },
  bans: { collection: "bans", build: buildBans },
  config: { collection: "config", build: buildConfig },
  cookie: { collection: "cookie", build: buildCookie },
  dungeon: { collection: "dungeon", build: buildDungeon },
  pet: { collection: "pet", build: buildPet },
  users: { collection: "users", build: buildUsers },
};

function getInsertTemplate(templateName) {
  return INSERT_TEMPLATES[templateName] || null;
}

module.exports = {
  INSERT_TEMPLATES,
  getInsertTemplate,
};
