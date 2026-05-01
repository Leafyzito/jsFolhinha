# Setup

Short guide for cloning this repo and running the bot against your own MongoDB and Twitch credentials.

## Prerequisites

- **Node.js** (matching what you use for production is safest).
- **MongoDB** — local (`mongodb://localhost:27017`), Docker, or [Atlas](https://www.mongodb.com/atlas). The app connects using `MONGO_URI` and uses the database name **`folhinha`** (see [`src/db/index.js`](../src/db/index.js)).
- A **Twitch** bot account and tokens as documented in [`.env.example`](../.env.example).

Optional:

- **Redis** — set both `REDIS_HOST` and `REDIS_PORT` in `.env` to enable caching; if you omit them, the bot uses an in-memory cache (see [`src/db/index.js`](../src/db/index.js)).
- **ClickHouse**, **Discord**, etc. — only if you are working on features that need them; many code paths fall back or no-op when env vars are missing.

## 1. Clone and install

```bash
git clone https://github.com/leafyzito/jsFolhinha.git
cd jsFolhinha
git submodule update --init --recursive
npm install
```

## 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and set at least:

- **`MONGO_URI`** — connection string to your MongoDB.
- **Twitch bot** — e.g. `BOT_USERNAME`, `BOT_USERID`, `BOT_IRC_TOKEN`, and the other `BOT_*` / `DEV_*` values you need to connect and test.

`BOT_USERID` and `BOT_USERNAME` are also read by the Mongo init script (see below).

## 3. Initialize MongoDB (collections, indexes, first config)

The database name is always **`folhinha`**, regardless of a path in `MONGO_URI` (the app calls `db("folhinha")`).

From the repo root:

```bash
npm run init:mongo
```

This runs [`scripts/init-mongo.js`](../scripts/init-mongo.js). It:

- Creates the expected **collections** (if they do not exist).
- Creates **`commandlog` as a time-series** collection with `timeField: "sentDate"` and `granularity: "seconds"` (falls back to a normal collection on older servers; MongoDB 6.3+ recommended for time-series without `metaField`).
- Creates **indexes** used by common queries.
- If **`BOT_USERID`** and **`BOT_USERNAME`** are set, inserts the **first `config`** document for the bot’s own channel (defaults aligned with `createNewChannelConfig` in the app).

Safe to re-run: it skips existing collections, duplicate indexes, and an existing config for that `channelId`.

**Collection shapes** (reference only, not enforced at runtime) live in [`src/db/schemas/`](../src/db/schemas/).

## 4. Run the bot

```bash
npm run dev
```

For production-style runs: see the root [README](../README.md) (`npm run start`, Docker Compose).

---

If something fails on startup, check the console and confirm `MONGO_URI`, Twitch tokens, and that `npm run init:mongo` completed without errors.
