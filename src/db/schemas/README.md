# Database schemas

This folder documents the shape of every MongoDB collection used by the bot.

The bot uses the raw [`mongodb`](https://www.npmjs.com/package/mongodb) driver
(no Mongoose / no ODM), so these schemas are purely documentation today —
nothing in [`src/db/index.js`](https://github.com/leafyzito/jsFolhinha/blob/main/src/db/index.js) reads them.

For setting up MongoDB and environment variables when building the project locally, see
[`docs/setup.md`](https://github.com/leafyzito/jsFolhinha/blob/main/docs/setup.md) at the repo root.

## Format

Each file is a single JSON Schema document using the **MongoDB-flavoured**
JSON Schema dialect (`bsonType` instead of `type`, with extra BSON types like
`objectId`, `date`, `int`, `long`, `double`). This is the same dialect that
`db.createCollection({ validator: { $jsonSchema: ... } })` accepts, so if you
ever want runtime validation you can plug these files straight in.

The filename matches the collection name 1:1 (e.g. `afk.json` →
`db.collection("afk")`).

## Collections

| File                  | Written by this repo?                  | Notes                                                   |
| --------------------- | -------------------------------------- | ------------------------------------------------------- |
| `afk.json`            | yes                                    | One doc per (channel, user)                             |
| `auth.json`           | yes (updates only; inserts elsewhere)  | Twitch OAuth tokens, managed by the auth provider       |
| `bans.json`           | yes                                    | Per-user command bans                                   |
| `botconfigs.json`     | **no** — legacy / external             | Generic key/value bot settings keyed by `category`      |
| `commandlog.json`     | yes                                    | Append-only log of every command invocation             |
| `config.json`         | yes                                    | Per-channel configuration                               |
| `cookie.json`         | yes                                    | Per-user cookie game stats                              |
| `customcommands.json` | yes                                    | Per-channel user-defined commands                       |
| `dungeon.json`        | yes                                    | Per-user dungeon game stats                             |
| `jokenpo.json`        | **no** — legacy data, no writes        | Old jokenpo win/loss stats                              |
| `pendingjoin.json`    | updates only — **inserted by website** | Channel join requests coming from folhinhabot.com       |
| `pet.json`            | yes                                    | One pet per channel                                     |
| `remind.json`         | yes                                    | Reminders. `_id` is a numeric auto-incremented counter  |
| `sugestoes.json`      | yes                                    | User suggestions. `_id` is a numeric counter            |
| `users.json`          | yes                                    | Per-user state (aliases, optouts, lastseen, plus, connections, ...) |

## Conventions

- All schemas declare `_id` and the fields the bot actually reads/writes today.
- Optional fields (added later, only present on some docs) are listed in
  `properties` but **not** in `required`.
- Fields stored as Unix timestamps are typed as `["double", "long", "int"]`
  because the codebase mixes `Math.floor(Date.now() / 1000)` (int) with
  `Date.now() / 1000` (double, from older Python code).
- `additionalProperties` is left as `true` (the default) on collections where
  legacy docs may carry extra fields no longer used by the code.
