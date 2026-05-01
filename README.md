# [FolhinhaBot](https://folhinhabot.com/)

## Setup

### First Steps

1. Clone the repository and initialize submodules:

```bash
git clone https://github.com/leafyzito/jsFolhinha.git
cd jsFolhinha
git submodule update --init --recursive
```

1. Copy `.env.example` to `.env` and fill in your credentials

For MongoDB setup (collections, indexes, first-time config), env vars, and optional services, see `**[docs/setup.md](docs/setup.md)**` in the `[docs/](docs/)` folder.

### Development Mode

For development and testing without all services:

1. Install dependencies:

```bash
npm install
```

1. Run the application:

```bash
npm run dev
```

### Production Mode (Docker)

For running the complete application with all services (including [Cobalt](https://github.com/imputnet/cobalt/) and [Twitch Clipper](https://github.com/leafyzito/twitch-clipper)):

1. Make sure you have Docker and Docker Compose installed
2. Ensure the environment variable ENV is set to 'prod' in docker-compose.yml (or 'dev' for testing)
3. Start the application:

```bash
docker compose up -d
```

To stop the application:

```bash
docker compose down
```

## Project Structure

- `main.js` - Main application entry point
- `src/` - Source code directory
  - `apis/` - API integrations
  - `clients/` - Client connections
  - `commands/` - Bot commands and handlers
  - `db/` - Database operations (`[schemas/](src/db/schemas/)` has JSON Schema per collection)
  - `extras/` - Extra files/functions
  - `handlers/` - Event handlers and middleware
  - `log/` - Logging functionality
  - `tasks/` - Scheduled tasks and background jobs
  - `utils/` - Utility functions and helpers
- `scripts/` - Additional scripts and tools (e.g. `init-mongo.js`, `backup-db.js`)
- `docs/` - Developer documentation
- `apps/twitchClipper/` - [Go-based Twitch clipping functionality](https://github.com/leafyzito/twitch-clipper/)

## API

The bot includes a built-in HTTP API server for monitoring and uptime tracking.

### Endpoints

- `**/**` — Status payload with uptime and channel counts
- `**/commands**` — List of registered commands and metadata
- `**/plus**` — Dev, admin, Plus, and supporter users from the database (for internal / ops use)

### Configuration

The API server listens on port **3323** by default (see `[docker-compose.yml](docker-compose.yml)`). Override with `STATUS_PORT`:

```bash
STATUS_PORT=8080
```

### Example response (`GET /`)

```json
{
  "status": "running",
  "uptime": 3600,
  "uptimeHumanized": "1h 0m 0s",
  "startTime": 1703123456,
  "connectedChannels": 1,
  "stats": {
    "totalCommandsUsed": 42,
    "totalChannels": 1
  }
}
```

Exact fields may change as the handler evolves; see `[src/utils/api-server.js](src/utils/api-server.js)`.

## Code Quality

### Linting

This project uses ESLint for code quality and consistency.

#### Available Commands

- `npm run lint` - Check for linting issues
- `npm run lint:fix` - Automatically fix linting issues where possible

## Contributing

Feel free to contribute to the project by opening issues or submitting pull requests with your ideas :)

**Before submitting code:**

1. Run `npm run lint` to check for code quality issues
2. Run `npm run lint:fix` to automatically fix any auto-fixable issues

