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
