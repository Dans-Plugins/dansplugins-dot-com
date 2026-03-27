# DPC API

Spring Boot back end for the DPC (Dan's Plugins Community) website providing a RESTful community data API.

## Prerequisites

- Java 17+
- Maven 3.9+
- Docker & Docker Compose (for local development)

## Local Development

The easiest way to run the API locally is with Docker Compose from the **repository root**:

```bash
DPC_API_KEY=my-secret-key docker compose up --build
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
   ./mvnw spring-boot:run
   ```

## Configuration

Configuration is managed via environment variables:

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL hostname |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `dpc` | Database name |
| `DB_USERNAME` | `dpc` | Database username |
| `DB_PASSWORD` | `dpc` | Database password |
| `DPC_API_KEY` | *(required)* | API key for write endpoints |

## Database Migrations

Schemas are managed by [Flyway](https://flywaydb.org/). Migration scripts live in `src/main/resources/db/migration/` and are applied automatically on startup.

## API Endpoints

### Factions

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/factions` | API key | Create a faction |
| `GET` | `/api/v1/factions` | Public | List factions (paginated) |
| `GET` | `/api/v1/factions/{id}` | Public | Get a faction by ID |

#### Create a faction

```bash
curl -X POST http://localhost:8080/api/v1/factions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: changeme" \
  -d '{
    "name": "The Knights",
    "serverId": "my-server-uuid",
    "memberCount": 10,
    "description": "A noble faction"
  }'
```

#### List factions (paginated)

```bash
curl "http://localhost:8080/api/v1/factions?page=0&size=20"
```

#### Get a faction by ID

```bash
curl http://localhost:8080/api/v1/factions/<faction-uuid>
```

## Plugin Authentication Flow

Server owners who want to publish data from their Minecraft plugins (e.g. Medieval Factions) need an API key.

1. An administrator provisions an API key and sets the `DPC_API_KEY` environment variable on the API server.
2. The server owner configures the same key in their plugin configuration.
3. The plugin sends write requests with the `X-API-Key` header:
   ```
   X-API-Key: <your-api-key>
   ```
4. `GET` endpoints are public and require no authentication.

## Running Tests

```bash
cd dpc-api
./mvnw test
```

Tests use an embedded H2 database so no external services are needed.

## Building the JAR

```bash
cd dpc-api
./mvnw clean package -DskipTests
```

The runnable JAR is produced at `target/dpc-api-0.1.0-SNAPSHOT.jar`.
