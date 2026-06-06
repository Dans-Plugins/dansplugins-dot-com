# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed

- The home page no longer returns a 500 when a plugin has no bStats ID (or a bStats lookup fails): `serverCount` now falls back to `null` instead of an unserializable `undefined`, and the popularity sort treats `null` as "no count" so those plugins still sort to the end.
- The home page no longer returns a 500 when the visits API is unavailable: `getServerSideProps` now guards the visit calls and falls back to a hidden counter, and `getVisits()` checks `response.ok` before parsing.
- Visit persistence is now crash-tolerant: `visits.json` is written atomically (temp file + rename) and read defensively, re-initializing from defaults on a missing/corrupt/invalid file instead of throwing.

### Removed

- Deleted the unused `components/VisitCounter.tsx` dead-code component (the visit count is rendered by `BottomBar`).

### Added

- Added an **About Us** page (`/about`) introducing the community, with links to GitHub, Discord, and Patreon.
- Added a **Road Map** page (`/roadmap`) that lists planned, in-progress, and completed work, driven by an editable `pages/data/roadmap.json`.
- Added a **Commissions** page (`/commissions`) with a pricing table, what's-included list, availability status, and a link to the commissions Discord, driven by an editable `pages/data/commissions.json`.
- Added **About**, **Road Map**, and **Commissions** links to the top navigation bar.
- Added a frontend test harness (Vitest) with a `npm test` script, an initial suite covering `utils/bstats.ts`, `utils/visitStorage.ts`, and the `pages/api/visits.ts` handler, and a `Test` step in the CI workflow.
- Documented the `dpc-api` backend's `DPC_CORS_ALLOWED_ORIGINS` configuration variable (CORS allowed origins, default `*`) in `dpc-api/README.md`, and wired it explicitly in `application.yml` to match the existing `DPC_SYNC_*` configuration pattern.
- Documented the `NEXT_PUBLIC_BASE_URL` environment variable (read by `services/visitService.ts`, default `http://localhost:3000`) in `CONFIG.md`.

### Changed

- Updated `.github/copilot-instructions.md` to describe the monorepo layout: the Next.js/TypeScript frontend at the repository root and the Spring Boot/Java backend under `dpc-api/`.

## [0.9.0] – 2022-07-01

### Added

- Initial public release of the Dan's Plugins Community Website.
- Home page with plugin cards for all DPC plugins.
- Docker Compose setup for local development.
- `up.sh` and `down.sh` scripts for managing the Docker environment.
