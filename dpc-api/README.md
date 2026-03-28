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
| `dpc-api` | 8080 | Spring Boot API |
| `dpc-db` | 5432 | PostgreSQL database |

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

## Configuration

Configuration is managed via environment variables:

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL hostname |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `dpc` | Database name |
| `DB_USERNAME` | *(required)* | Database username |
| `DB_PASSWORD` | *(required)* | Database password |
| `JWT_SECRET` | *(required)* | Secret key for JWT signing (min 32 bytes) |
| `JWT_EXPIRATION` | `24h` | JWT token expiration duration |

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
curl -X POST http://localhost:8080/api/v1/accounts/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "myserver", "password": "secure-pass-123" }'
```

#### Create an API key (requires JWT)

```bash
curl -X POST http://localhost:8080/api/v1/accounts/me/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{ "serverName": "my-survival-server" }'
```

Response:
```json
{
  "apiKey": "<your-new-api-key>",
  "serverName": "my-survival-server"
}
```

Save the returned `apiKey` — it is shown only once and stored as a SHA-256 hash.

### Factions

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/factions` | API key | Sync factions (bulk upsert) |
| `GET` | `/api/v1/factions` | Public | List factions (paginated) |
| `GET` | `/api/v1/factions/{id}` | Public | Get a faction by ID |

#### Sync factions

```bash
curl -X POST http://localhost:8080/api/v1/factions \
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

The endpoint accepts a JSON array. Factions are upserted by `(name, serverId)` — existing factions are updated, new ones are created. `serverIp` and `discordLink` are optional.

#### List factions (paginated)

```bash
curl "http://localhost:8080/api/v1/factions?page=0&size=20"
```

#### Get a faction by ID

```bash
curl http://localhost:8080/api/v1/factions/<faction-uuid>
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

OpenAPI documentation is auto-generated via [springdoc-openapi](https://springdoc.org/). Once the API is running:

- **Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI JSON**: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)
- **OpenAPI YAML**: [http://localhost:8080/v3/api-docs.yaml](http://localhost:8080/v3/api-docs.yaml)

## Building the JAR

```bash
cd dpc-api
./mvnw clean package -DskipTests
```

The runnable JAR is produced at `target/dpc-api-0.1.0-SNAPSHOT.jar`.
