# DPC API

Spring Boot back end for the DPC (Dan's Plugins Community) website providing a RESTful community data API.

## Prerequisites

- Java 17+
- Maven 3.9+
- Docker & Docker Compose (for local development)

## Local Development

The easiest way to run the API locally is with Docker Compose from the **repository root**:

```bash
docker compose up --build
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
   DB_USERNAME=dpc DB_PASSWORD=dpc ./mvnw spring-boot:run
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

## Database Migrations

Schemas are managed by [Flyway](https://flywaydb.org/). Migration scripts live in `src/main/resources/db/migration/` and are applied automatically on startup.

## API Endpoints

### Registration

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/register` | Public | Register for an API key |

#### Register for an API key

```bash
curl -X POST http://localhost:8080/api/v1/register \
  -H "Content-Type: application/json" \
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

Server operators who want to publish data from their Minecraft plugins (e.g. Medieval Factions) need an API key.

1. The operator registers by calling `POST /api/v1/register` with their server name.
2. The API returns a one-time API key (stored as a SHA-256 hash on the server side).
3. The operator configures the key in their plugin (e.g. `dpc-api.key` in Medieval Factions `config.yml`).
4. The plugin sends write requests with the `X-API-Key` header.
5. `GET` endpoints are public and require no authentication.

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
