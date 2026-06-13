# Copilot Instructions

This repository follows the DPC (Dans Plugins Community) conventions defined at
https://github.com/Dans-Plugins/dpc-conventions. Read those conventions before
making any changes.

## Technology Stack

This repository is a monorepo containing a frontend and a backend.

### Frontend (repository root)

- Language: TypeScript
- Framework: Next.js (React)
- Build tool: npm
- Styling: MUI (Material UI) with Emotion
- Target platform: Node.js web server (Next.js server via `next start`)

### Backend (`dpc-api/`)

- Language: Java
- Framework: Spring Boot (Spring Web, Spring Data JPA, Spring Security)
- Build tool: Maven (`./mvnw`)
- Database: PostgreSQL with Flyway migrations
- Target platform: JVM service (exposes the DPC community data REST API, e.g. faction sync)

## Project Structure

### Frontend (repository root)

- `pages/` – Next.js pages (each file is a route)
- `components/` – Reusable React components
- `styles/` – Global CSS styles
- `public/` – Static assets served at the root URL
- `utils/` – Shared utility functions
- `services/` – Data-fetching or business-logic services
- `__tests__/` – Unit tests (Vitest)
- `data/` – Runtime-persisted JSON (`news.json`, `visits.json`); bind-mounted in `compose.yml`

### Backend

- `dpc-api/` – Spring Boot REST API (Java + Maven). See `dpc-api/README.md`
  for backend setup, endpoints, and configuration. Changes that touch the API
  contract, sync logic, or backend configuration live here.

## Coding Conventions

Frontend (repository root):

- Use TypeScript for all new files.
- Follow the existing component structure when adding new pages or components.
- Use MUI components for UI elements to stay consistent with the existing design.
- Keep user-facing text in components readable and consistent with the site's tone.

Backend (`dpc-api/`):

- Follow the existing Spring Boot package layout (controllers, services, config, filters).
- Document backend configuration in `dpc-api/README.md`.

All code:

- Do not hard-code environment-specific values; use environment variables instead.

## Contribution Workflow

- Branch from `develop` for all changes.
- Open a pull request against `develop`, not `main`.
- Reference the related GitHub issue in every pull request description.
