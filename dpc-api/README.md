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

`JWT_SECRET` is required: the bundled UserAuth service signs tokens with it (min 32 bytes). This starts:

| Service | Port | Description |
|---|---|---|
| `dpc-website` | 3000 | Next.js front end |
| `dpc-api` | 45345 (configurable via `API_PORT`) | Spring Boot API |
| `dpc-db` | 5432 | PostgreSQL database (site data) |
| `userauth` | *(internal)* | [UserAuth](https://github.com/Preponderous-Software/UserAuth) — authentication, reached by `dpc-api` at `http://userauth:9998` |
| `userauth-db` | *(internal)* | PostgreSQL database (UserAuth) |

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
2. Ensure a [UserAuth](https://github.com/Preponderous-Software/UserAuth) instance is reachable at `USERAUTH_URL` (default `http://localhost:9998`) — dpc-api delegates authentication to it. The Docker Compose path above starts one for you; standalone, run its published image:
   ```bash
   docker run -d --name userauth -p 9998:9998 \
     -e DB_URL=jdbc:postgresql://host.docker.internal:5432/userauth \
     -e DB_USERNAME=userauth -e DB_PASSWORD=userauth \
     -e JWT_SECRET="your-secret-key-at-least-32-bytes-long" \
     ghcr.io/preponderous-software/userauth:latest
   ```
3. Build and run the API:
   ```bash
   cd dpc-api
   DB_USERNAME=dpc DB_PASSWORD=dpc USERAUTH_URL=http://localhost:9998 ./mvnw spring-boot:run
   ```
   To run on a different port, set `SERVER_PORT`:
   ```bash
   SERVER_PORT=9090 DB_USERNAME=dpc DB_PASSWORD=dpc USERAUTH_URL=http://localhost:9998 ./mvnw spring-boot:run
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
| `USERAUTH_URL` | `http://localhost:9998` | Base URL of the [UserAuth](https://github.com/Preponderous-Software/UserAuth) service that dpc-api delegates authentication to (registration, login, token validation, logout). Must be reachable from the API. |
| `DPC_CORS_ALLOWED_ORIGINS` | `*` | Comma-separated list of origins allowed to call the API (CORS). The `*` default allows **all** origins; set this explicitly to the site origin(s) in production (e.g. `https://dansplugins.com`). |
| `DPC_SYNC_MIN_INCOMING` | `2` | Minimum batch size eligible to deactivate factions (see [Sync safety guards](#sync-safety-guards)) |
| `DPC_SYNC_MAX_DEACTIVATION_RATIO` | `0.5` | Fraction cap on factions one sync may deactivate |
| `DPC_SYNC_MAX_DEACTIVATIONS` | `1000` | Absolute cap on factions one sync may deactivate (`0` disables) |
| `DPC_BACKLOG_ORG` | `Dans-Plugins` | GitHub org whose open issues and pull requests the dev-portal backlog mirrors |
| `DPC_BACKLOG_GITHUB_TOKEN` | *(empty)* | Optional classic PAT for the backlog sync. No scopes are needed — the GitHub Search API only reads public data — but an authenticated identity raises the rate limit from 10 to 30 requests/minute. |
| `DPC_BACKLOG_SYNC_INTERVAL_MS` | `900000` | How often the backlog sync re-pulls GitHub (15 minutes) |
| `DPC_BACKLOG_SYNC_INITIAL_DELAY_MS` | `5000` | How long after startup the first backlog sync runs |
| `DPC_BACKLOG_SYNC_ENABLED` | `true` | Set to `false` for local runs that should not call the real GitHub API |
| `DPC_RELEASE_SYNC_GITHUB_TOKEN` | *(falls back to `DPC_BACKLOG_GITHUB_TOKEN`)* | Optional classic PAT for the release mirror. Like the backlog token it needs no scopes; without one the sync runs at GitHub's unauthenticated 60 requests/hour. |
| `DPC_RELEASE_SYNC_INTERVAL_MS` | `3600000` | How often the release mirror re-pulls GitHub (hourly). Each pass costs one request per plugin. |
| `DPC_RELEASE_SYNC_INITIAL_DELAY_MS` | `15000` | How long after startup the first release sync runs. Staggered behind the backlog sync. |
| `DPC_RELEASE_SYNC_ENABLED` | `true` | Set to `false` for local runs that should not call the real GitHub API |
| `DPC_RELEASE_SYNC_MAX_RELEASES` | `20` | How many releases per plugin the mirror keeps, and the point past which the sync stops assuming it has seen a plugin's whole release history (see [Plugin versions](#plugin-versions)) |
| `DPC_CLAIMS_AUTO_RELEASE_DAYS` | `30` | A dev-portal claim with no activity for this many days is released automatically |
| `DPC_ADMIN_USERNAMES` | *(empty)* | Comma-separated UserAuth usernames allowed to convert a feature request into a real GitHub issue. Empty by default, which means **nobody** can convert until it is set. |
| `DPC_FEATURE_REQUEST_GITHUB_TOKEN` | *(falls back to `DPC_BACKLOG_GITHUB_TOKEN`)* | Classic PAT used to create the GitHub issue a converted feature request becomes. Creating an issue is a write, so this one needs at least the `public_repo` scope — unlike the read-only backlog token it falls back to. |

The Docker Compose file also supports the `API_PORT` variable (default `45345`) to control the published host port for the API.

## Database Migrations

Schemas are managed by [Flyway](https://flywaydb.org/). Migration scripts live in `src/main/resources/db/migration/` and are applied automatically on startup.

## API Endpoints

### Authentication & Profile

Authentication is delegated to the [UserAuth](https://github.com/Preponderous-Software/UserAuth)
service. dpc-api proxies registration/login/logout to UserAuth (UserAuth is internal-only,
so the browser talks to dpc-api) and validates the bearer token on each request. dpc-api
keeps a local profile mirror that owns each user's API keys.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register (proxied to UserAuth) and return a token |
| `POST` | `/api/v1/auth/login` | Public | Login (proxied to UserAuth) and return a token |
| `POST` | `/api/v1/auth/logout` | Bearer | Revoke the current token |
| `GET` | `/api/v1/profile/me` | Bearer | Get the current user's profile and API keys |
| `GET` | `/api/v1/profile/{username}` | Public | Get a user's public profile (display name, avatar, bio, join date, badges, liked plugins/guides; no id or API keys) |
| `PATCH` | `/api/v1/profile/me` | Bearer | Update display name / avatar / bio |
| `POST` | `/api/v1/profile/me/api-keys` | Bearer | Create a new API key |
| `DELETE` | `/api/v1/profile/me/api-keys/{id}` | Bearer | Delete an API key |

#### Register an account

```bash
# Docker Compose (default port 45345)
curl -X POST http://localhost:45345/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "username": "myserver", "password": "secure-pass-123" }'
```

Response (the token is issued by UserAuth):
```json
{
  "token": "<token>",
  "tokenType": "Bearer",
  "expiresAt": "<timestamp>"
}
```

#### Login

```bash
curl -X POST http://localhost:45345/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "myserver", "password": "secure-pass-123" }'
```

#### Create an API key (requires the bearer token)

```bash
curl -X POST http://localhost:45345/api/v1/profile/me/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
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

### Plugins

The plugin catalogue: one row per plugin, keyed by the `slug` that the website's
guide routes, resource routes and like targets all use. Public and, for now,
read-only — the rows are seeded by `V15__create_plugins_table.sql` and changed by
migration rather than over HTTP, so there is no write path to authenticate.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/plugins` | Public | The whole catalogue, alphabetically by title |
| `GET` | `/api/v1/plugins/{slug}` | Public | One plugin, or `404` if the slug is unknown |

```bash
curl http://localhost:45345/api/v1/plugins/medieval-factions
```

```json
{
  "slug": "medieval-factions",
  "title": "Medieval Factions",
  "description": "Allows players to organize themselves into feudal, diplomatic, lawful groups akin to nations.",
  "githubUrl": "https://github.com/Dans-Plugins/Medieval-Factions",
  "spigotmcUrl": "https://www.spigotmc.org/resources/medieval-factions.79941/",
  "bstatsId": "8929",
  "iconPath": "/icons/mf.png"
}
```

`spigotmcUrl`, `bstatsId` and `iconPath` are `null` for plugins that have no
SpigotMC page, no bStats project, or no icon. The internal UUID is not exposed:
the slug is the public identifier.

The website still renders its catalogue from the checked-in
`pages/data/plugins.json` and will switch to these endpoints when the catalogue
becomes editable — see `RESOURCE_HUB.md` in the repository root.

#### Plugin versions

Each plugin's GitHub releases, mirrored into `plugin_versions` by a scheduled
sync so a resource page can show version history without calling GitHub on every
request. DPC hosts none of the files: every `downloadUrl` points at the asset on
GitHub, and the rows are metadata about files that live there.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/plugins/{slug}/versions` | Public | One plugin's mirrored releases, newest first |
| `GET` | `/api/v1/plugins/versions/latest` | Public | Every plugin's latest release, one row per plugin that has one |

```bash
curl http://localhost:45345/api/v1/plugins/medieval-factions/versions
```

```json
[
  {
    "tag": "v5.3.0",
    "name": "Medieval Factions 5.3.0",
    "changelog": "### Added\n- Something",
    "htmlUrl": "https://github.com/Dans-Plugins/Medieval-Factions/releases/tag/v5.3.0",
    "prerelease": false,
    "publishedAt": "2026-01-02T03:04:05Z",
    "downloadCount": 412,
    "assets": [
      {
        "name": "MedievalFactions-5.3.0.jar",
        "sizeBytes": 2411724,
        "downloadCount": 412,
        "downloadUrl": "https://github.com/Dans-Plugins/Medieval-Factions/releases/download/v5.3.0/MedievalFactions-5.3.0.jar"
      }
    ]
  }
]
```

A known plugin that publishes no releases answers `200` with `[]`; only an
unknown slug is a `404`. `name` and `changelog` are `null` when the release was
published without a title or without notes. A version's `downloadCount` is its
assets' counts summed — GitHub's figures, copied at sync time, since the download
itself never passes through this service.

The sync (`ReleaseSyncService`) is deliberately conservative about deletion.
GitHub is the system of record, so a release it no longer reports is deleted
here — but a plugin whose fetch *failed* is skipped whole rather than emptied,
and because only the newest `DPC_RELEASE_SYNC_MAX_RELEASES` releases are fetched,
a full page of results limits pruning to versions at least as new as the oldest
release in that page. An outage, a rate limit, or a long release history can
therefore leave the mirror stale, but never wrongly empty.

##### Every plugin's latest release

A page listing the whole catalogue wants one release per plugin, not each
plugin's history, and asking for the latter a plugin at a time is one request per
card. `/api/v1/plugins/versions/latest` answers all of them at once:

```bash
curl http://localhost:45345/api/v1/plugins/versions/latest
```

```json
[
  {
    "slug": "medieval-factions",
    "tag": "v5.3.0",
    "prerelease": false,
    "publishedAt": "2026-01-02T03:04:05Z"
  }
]
```

"Latest" means the newest release that is **not** a pre-release — what GitHub's
own `/releases/latest` means by the word. A plugin that has published nothing but
pre-releases is labelled with its newest one rather than dropped from the answer,
and `prerelease` is how a caller tells the two apart. A plugin with nothing
mirrored is absent altogether rather than present with a null tag, so the list is
shorter than `/api/v1/plugins` whenever some plugin has yet to cut a release.

Assets are deliberately not served here: a caller that wants files wants the full
`/versions` list for one plugin, not a label for every plugin.

### Likes

Likes on plugins and guides. A target is keyed by the plugin `id` from the
website's `plugins.json` (a guide's id is its plugin's id). Liking is
idempotent; counts are public.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/likes` | Bearer | Like a plugin or guide (idempotent); returns the new count |
| `DELETE` | `/api/v1/likes` | Bearer | Unlike a plugin or guide; returns the new count |
| `GET` | `/api/v1/likes/counts?type=plugin\|guide` | Public | Aggregate like counts for a target type (`targetId` → count) |
| `GET` | `/api/v1/likes/me` | Bearer | The current user's liked targets |

The `POST`/`DELETE` body is `{ "targetType": "plugin" | "guide", "targetId": "<id>" }`.

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

## Plugin Authentication Flow

Minecraft plugins can register and manage API keys programmatically:

1. The plugin registers an account: `POST /api/v1/auth/register` with `{ "username": "...", "password": "..." }`.
2. The API returns a bearer token.
3. The plugin creates an API key: `POST /api/v1/profile/me/api-keys` with the bearer token and `{ "serverName": "..." }`.
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

The runnable JAR is produced at `target/dpc-api-0.2.0-SNAPSHOT-8-8-2026.jar`.
