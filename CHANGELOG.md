# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.12.0] – 2026-06-13

### Changed

- Site-wide visual refresh. A new brand palette and type pairing (Inter for body, Space Grotesk for headings, loaded via a custom `_document`); solid app bars in place of the indigo gradient; removal of the gradient-clip text and the 20px grid-pattern page background; flat surfaces with hairline borders and softened hover lifts; a redesigned home hero with call-to-action buttons; restyled plugin cards (per-plugin avatar, server-count chip, clearer button hierarchy); and consistent table/card/page treatments across the Leaderboard, Account, Commissions, Road Map, About, Guides, and News pages.
- Bumped the site version to 0.12.0.

### Fixed

- `USER_GUIDE.md` now documents the **Guides**, **Leaderboard**, and **Account** pages. These are all reachable from the top navigation bar but were previously absent from the guide's "Common Scenarios", which only covered News, About, Road Map, and Commissions.
- `.github/copilot-instructions.md` now lists the `__tests__/` (Vitest) and `data/` (runtime-persisted JSON, bind-mounted in `compose.yml`) directories in its frontend Project Structure, which previously omitted both tracked directories.

## [0.10.0] – 2026-06-07

### Fixed

- The **Guides** page now lists a guide for every plugin in the catalogue, not just Medieval Factions. Links are derived from `pages/data/plugins.json` and point at each plugin's in-repo `USER_GUIDE.md` (the required in-repo guide per the DPC conventions), opening in a new tab with `rel="noopener noreferrer"`. Previously the page claimed guides existed "for each plugin" but linked only one.
- The top navigation now highlights the link for the page you are on (bold + underline, with `aria-current="page"`), so the current location is visible at a glance instead of having to recall which link was clicked.
- The faction leaderboard error message now includes a **Retry** action that re-runs the fetch in place, so a transient API failure no longer requires a full page reload to recover from.
- External links now behave consistently: the top-bar community links (Discord, Patreon, LinkedIn, RPKit), the footer links (Source Code, Report a Bug), the plugin-card GitHub/SpigotMC buttons, and the About-page links all open in a new tab with `rel="noopener noreferrer"`, matching the News, Road Map, and home-page cards. The external links in the top navigation also carry an external-link icon so they are distinguishable from in-site navigation.
- The home-page info cards (Contribute, Download, Try it Out) are now keyboard-accessible: they are focusable, expose a `link` role, and activate on Enter/Space, where previously they responded only to mouse clicks.
- The dark/light mode toggle now **persists** across navigation and reloads (saved to `localStorage`) and a first-time visitor's initial mode follows their operating-system `prefers-color-scheme` setting instead of always starting in dark. Previously the choice was lost on every page change because navigation triggers a full page load and the mode lived only in memory.
- The dark-mode toggle switch now has an accessible label (`aria-label="Toggle dark mode"`) in both the top and bottom bars, so assistive technology announces its purpose.
- `CONFIG.md` no longer documents a phantom `NEXT_PUBLIC_SITE_URL` environment variable: it was read nowhere in the code, Dockerfile, or `compose.yml`. Removed its section and corrected the example `.env.local` block to use `NEXT_PUBLIC_BASE_URL` (the variable actually read by `services/visitService.ts` for the site's own origin).
- The home page no longer returns a 500 when a plugin has no bStats ID (or a bStats lookup fails): `serverCount` now falls back to `null` instead of an unserializable `undefined`, and the popularity sort treats `null` as "no count" so those plugins still sort to the end.
- The home page no longer returns a 500 when the visits API is unavailable: `getServerSideProps` now guards the visit calls and falls back to a hidden counter, and `getVisits()` checks `response.ok` before parsing.
- Visit persistence is now crash-tolerant: `visits.json` is written atomically (temp file + rename) and read defensively, re-initializing from defaults on a missing/corrupt/invalid file instead of throwing.

### Removed

- Deleted the unused `components/VisitCounter.tsx` dead-code component (the visit count is rendered by `BottomBar`).

### Added

- Added a **News** page (`/news`) listing posts newest-first, with a **News** link in the top navigation bar. Posts are read at request time from a runtime `data/news.json` (on the mounted data volume), so they can be edited on the server without rebuilding the site; the file is seeded with default posts on first run, and an invalid file falls back to defaults without being overwritten. Each post has a `source` (`direct`, `discord`, or `external`) rendered as a badge, with an optional `sourceUrl` link and `author`.
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
