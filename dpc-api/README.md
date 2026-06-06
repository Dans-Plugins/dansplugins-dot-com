# DPC API

Spring Boot back end for the DPC (Dan's Plugins Community) website providing a RESTful community data API.

## Prerequisites

- Java 17+
- Maven 3.9+
- Docker & Docker Compose (for local development)

## Local Development

The easiest way to run the API locally is with Docker Compose from the **repository root**:

```bash
JWT_SECRET="your-secret-key-at-least-32-bytes-long" docker compose up --build
```

This starts:

| Service | Port | Description |
|---|---|---|
| `dpc-website` | 3000 | Next.js front end |
| `dpc-api` | 45345 (configurable via `API_PORT`) | Spring Boot API |
| `dpc-db` | 5432 | PostgreSQL database |

To use a different API port:

```bash
API_PORT=9090 NEXT_PUBLIC_API_URL=http://localhost:9090 JWT_SECRET="your-secret-key-at-least-32-bytes-long" docker compose up --build
```

`NEXT_PUBLIC_API_URL` is passed to the frontend container automatically via `compose.yml` (as both a build arg and environment variable).

### Running without Docker

1. Start a PostgreSQL instance (e.g. via Docker):
   ```bash
   docker run -d --name dpc-db -e POSTGRES_DB=dpc -e POSTGRES_USER=dpc -e POSTGRES_PASSWORD=dpc -p 5432:5432 postgres:16-alpine
   ```
2. Build and run the API:
   ```bash
   cd dpc-api
   DB_USERNAME=dpc DB_PASSWORD=dpc JWT_SECRET="your-secret-key-at-least-32-bytes-long" ./mvnw spring-boot:run
   ```
   To run on a different port, set `SERVER_PORT`:
   ```bash
   SERVER_PORT=9090 DB_USERNAME=dpc DB_PASSWORD=dpc JWT_SECRET="your-secret-key-at-least-32-bytes-long" ./mvnw spring-boot:run
   ```

## Configuration

Configuration is managed via environment variables:

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | Port the Spring Boot server listens on |
| `DB_HOST` | `localhost` | PostgreSQL hostname |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `dpc` | Database name |
| `DB_USERNAME` | *(required)* | Database username |
| `DB_PASSWORD` | *(required)* | Database password |
| `JWT_SECRET` | *(required)* | Secret key for JWT signing (min 32 bytes) |
| `JWT_EXPIRATION` | `24h` | JWT token expiration duration |
| `DPC_CORS_ALLOWED_ORIGINS` | `*` | Comma-separated list of origins allowed to call the API (CORS). The `*` default allows **all** origins; set this explicitly to the site origin(s) in production (e.g. `https://dansplugins.com`). |
| `DPC_SYNC_MIN_INCOMING` | `2` | Minimum batch size eligible to deactivate factions (see [Sync safety guards](#sync-safety-guards)) |
| `DPC_SYNC_MAX_DEACTIVATION_RATIO` | `0.5` | Fraction cap on factions one sync may deactivate |
| `DPC_SYNC_MAX_DEACTIVATIONS` | `1000` | Absolute cap on factions one sync may deactivate (`0` disables) |
| `DISCORD_ENABLED` | `false` | Enable ingesting Discord announcements into the News feed (see [Discord announcement ingestion](#discord-announcement-ingestion)) |
| `DISCORD_BOT_TOKEN` | *(empty)* | Discord bot token (server-only secret); the bot must be in the guild with read access to the announcements channel |
| `DISCORD_ANNOUNCEMENTS_CHANNEL_ID` | *(empty)* | Numeric id of the announcements channel to read |
| `DISCORD_GUILD_ID` | *(empty)* | Numeric guild id, used only to build message permalinks (`sourceUrl`); when empty, posts have no source link |
| `DISCORD_FETCH_LIMIT` | `20` | How many recent messages to request per poll (1–100) |
| `DISCORD_API_BASE_URL` | `https://discord.com/api/v10` | Discord REST API base URL |
| `DISCORD_POLL_INTERVAL_MILLIS` | `300000` | Delay between polls, in milliseconds (default 5 minutes) |

The Docker Compose file also supports the `API_PORT` variable (default `45345`) to control the published host port for the API.

## Database Migrations

Schemas are managed by [Flyway](https://flywaydb.org/). Migration scripts live in `src/main/resources/db/migration/` and are applied automatically on startup.

## API Endpoints

### Account Management

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/accounts/register` | Public | Create an account |
| `POST` | `/api/v1/accounts/login` | Public | Login and get JWT token |
| `GET` | `/api/v1/accounts/me` | JWT | Get account profile and API keys |
| `POST` | `/api/v1/accounts/me/api-keys` | JWT | Create a new API key |
| `DELETE` | `/api/v1/accounts/me/api-keys/{id}` | JWT | Delete an API key |

#### Register an account

```bash
# Docker Compose (default port 45345)
curl -X POST http://localhost:45345/api/v1/accounts/register \
  -H "Content-Type: application/json" \
  -d '{ "username": "myserver", "password": "secure-pass-123" }'

# Without Docker (default port 8080)
curl -X POST http://localhost:8080/api/v1/accounts/register \
  -H "Content-Type: application/json" \
  -d '{ "username": "myserver", "password": "secure-pass-123" }'
```

Response:
```json
{
  "token": "<jwt-token>",
  "username": "myserver"
}
```

#### Login

```bash
curl -X POST http://localhost:45345/api/v1/accounts/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "myserver", "password": "secure-pass-123" }'
```

#### Create an API key (requires JWT)

```bash
curl -X POST http://localhost:45345/api/v1/accounts/me/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{ "serverName": "my-survival-server" }'
```

Response:
```json
{
  "id": "<uuid>",
  "apiKey": "<your-new-api-key>",
  "keyPrefix": "dpc_abcd",
  "serverName": "my-survival-server"
}
```

Save the returned `apiKey` — it is shown only once and stored as a SHA-256 hash.
The `keyPrefix` (first 8 characters) can be used to identify the key later.

### Factions

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/factions` | API key | Sync factions (bulk upsert) |
| `GET` | `/api/v1/factions` | Public | List factions (paginated) |
| `GET` | `/api/v1/factions/{id}` | Public | Get a faction by ID |

#### Sync factions

```bash
curl -X POST http://localhost:45345/api/v1/factions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-api-key>" \
  -d '[
    {
      "name": "The Knights",
      "serverId": "my-server-id",
      "memberCount": 10,
      "description": "A noble faction",
      "serverIp": "play.example.com",
      "discordLink": "https://discord.gg/example"
    }
  ]'
```

The endpoint accepts a JSON array. Factions are upserted by `(name, serverId)` — existing factions are updated, new ones are created. `name`, `serverId`, and `memberCount` are required; `description`, `serverIp`, and `discordLink` are optional.

##### Sync safety guards

The endpoint treats each batch as the authoritative snapshot for its
`serverId`, so factions previously seen on that server but missing from the
batch are marked inactive (soft-deleted). To stop a single malformed sync from
wiping a server's registry, three guards run before any faction is deactivated:

| Property | Default | Effect |
|---|---|---|
| `dpc.sync.safety.minimum-incoming-factions` (`DPC_SYNC_MIN_INCOMING`) | `2` | Smaller batches still upsert but never deactivate. |
| `dpc.sync.safety.max-deactivation-ratio` (`DPC_SYNC_MAX_DEACTIVATION_RATIO`) | `0.5` | If a sync would deactivate more than this fraction of the server's active factions, deactivation is skipped. |
| `dpc.sync.safety.max-deactivations-per-sync` (`DPC_SYNC_MAX_DEACTIVATIONS`) | `1000` | Absolute cap on deactivations per sync. `0` disables this cap. |

When any guard trips, the server still applies the upserts in the batch and
returns 200; the deactivation step is silently skipped and a `WARN` log entry
explains why. Operators can tighten or relax these guards via environment
variables.

###### Monitoring

The only signal that a guard tripped is a `WARN` log line from
`com.dansplugins.api.service.FactionService`. Look for messages starting with
`Skipping deactivation for serverId='...'` — each one means a plugin sent a
sync that the server refused to fully apply. A handful of these is normal
during plugin restarts; a steady stream suggests either a misconfigured
client or an attacker probing with valid credentials. Sample log line:

```
WARN  c.d.a.s.FactionService - Skipping deactivation for serverId='survival-1':
  would deactivate 8 of 10 active factions (80%), exceeding the configured
  maximum ratio of 50%. Factions in the batch are still upserted.
```

There is no metric exposed for guard trips today; if you need alerting,
scrape this log line or follow up with an issue.

A single sync may contain at most `10000` faction entries; oversized payloads
are rejected with `400 Bad Request`.

The `serverId` field must match `[A-Za-z0-9._:-]+`. Any value containing
characters outside that set (whitespace, slashes, accented letters, emoji,
etc.) is rejected with `400 Bad Request`. This prevents accidental
near-duplicate registry partitions from typos that would otherwise shadow a
real server's factions.

#### List factions (paginated)

```bash
curl "http://localhost:45345/api/v1/factions?page=0&size=20"
```

#### Get a faction by ID

```bash
curl http://localhost:45345/api/v1/factions/<faction-uuid>
```

### News

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/news` | Public | List recent community news posts (Discord announcements), newest-first |

```bash
curl http://localhost:45345/api/v1/news
```

Each item matches the website's News post shape:

```json
[
  {
    "id": "discord-1234567890",
    "title": "Server event this weekend",
    "date": "2026-06-09",
    "body": "Join us for a community build event.",
    "source": "discord",
    "sourceUrl": "https://discord.com/channels/<guild>/<channel>/<message>",
    "author": "Dan"
  }
]
```

The website merges these into its own News feed (see the site's News page).

#### Discord announcement ingestion

When enabled, a scheduled poller reads recent messages from the community
Discord server's announcements channel and stores them in the
`discord_announcements` table, where `GET /api/v1/news` serves them.

- **Disabled by default.** With `DISCORD_ENABLED=false` (or a missing
  `DISCORD_BOT_TOKEN` / `DISCORD_ANNOUNCEMENTS_CHANNEL_ID`) the poller is a
  no-op and the API makes no calls to Discord.
- **Upsert-only, never delete.** Messages are upserted by Discord message id —
  inserted once and updated in place if edited. The ingestion path never
  deletes rows, so a Discord outage or an empty fetch cannot wipe
  previously-ingested announcements.
- **Title derivation.** A post's title is the first non-empty line of the
  message (truncated); the full message becomes the body.
- **Configuration.** See the `DISCORD_*` variables in the
  [Configuration](#configuration) table.

##### Setting up the Discord bot (one-time)

To enable ingestion you need a Discord bot that can read the announcements
channel, plus the channel and (optionally) server ids.

1. **Create the application and bot.** Go to the
   [Discord Developer Portal](https://discord.com/developers/applications) →
   **New Application**. Open the **Bot** tab and **Reset Token** to reveal the
   bot token — this is the `DISCORD_BOT_TOKEN` value (treat it as a secret).
2. **Enable the Message Content intent.** On the **Bot** tab, turn on the
   **Message Content Intent** (under *Privileged Gateway Intents*).
   > ⚠️ **Required.** Without this intent the Discord REST API returns **empty**
   > `content` for messages, so every announcement would be ingested as blank and
   > skipped. Per Discord's docs, an app "will receive empty values in the
   > `content`, `embeds`, `attachments` … fields … if they have not configured
   > (or been approved for) the `MESSAGE_CONTENT` privileged intent." Apps in
   > 100+ servers must additionally be approved for it; below that the toggle is
   > sufficient.
3. **Invite the bot to your server.** Under **OAuth2 → URL Generator**, select
   the `bot` scope and the **View Channel** + **Read Message History**
   permissions, open the generated URL, and add the bot to the server. These two
   permissions are what `GET /channels/{id}/messages` requires; without
   *Read Message History* it returns no messages.
4. **Get the ids.** In Discord, enable **User Settings → Advanced → Developer
   Mode**, then right-click the announcements channel → **Copy Channel ID**
   (`DISCORD_ANNOUNCEMENTS_CHANNEL_ID`) and right-click the server icon →
   **Copy Server ID** (`DISCORD_GUILD_ID`, used only to build `sourceUrl`
   permalinks).
5. **Configure and enable.** Put the values in the deployment's environment
   (e.g. the gateway `.env`) and set `DISCORD_ENABLED=true`, then restart/recreate
   the `dpc-backend` service. Verify with `curl https://api.dansplugins.com/api/v1/news`
   — it should return the recent announcements within one poll interval
   (`DISCORD_POLL_INTERVAL_MILLIS`, default 5 minutes).

> The bot only needs **read** access to the announcements channel. It never
> posts, edits, or deletes anything on Discord, and the ingestion path never
> deletes stored rows (see above).

## Plugin Authentication Flow

Minecraft plugins can register and manage API keys programmatically:

1. The plugin registers an account: `POST /api/v1/accounts/register` with `{ "username": "...", "password": "..." }`.
2. The API returns a JWT token.
3. The plugin creates an API key: `POST /api/v1/accounts/me/api-keys` with the JWT token and `{ "serverName": "..." }`.
4. The API returns a one-time API key.
5. The plugin stores the API key and uses it for write requests via the `X-API-Key` header.

Alternatively, server operators can manage keys from the website UI at `/account`.

## Running Tests

```bash
cd dpc-api
./mvnw test
```

Tests use an embedded H2 database so no external services are needed.

## API Documentation

OpenAPI documentation is auto-generated via [springdoc-openapi](https://springdoc.org/). Once the API is running, replace `{PORT}` with `45345` (Docker Compose default) or `8080` (non-Docker default):

| Doc | URL |
|---|---|
| Swagger UI | `http://localhost:{PORT}/swagger-ui.html` |
| OpenAPI JSON | `http://localhost:{PORT}/v3/api-docs` |
| OpenAPI YAML | `http://localhost:{PORT}/v3/api-docs.yaml` |

## Building the JAR

```bash
cd dpc-api
./mvnw clean package -DskipTests
```

The runnable JAR is produced at `target/dpc-api-0.1.0-SNAPSHOT.jar`.
