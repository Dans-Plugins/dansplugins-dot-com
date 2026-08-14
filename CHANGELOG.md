# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Resource pages now show a plugin's release history. `dpc-api` mirrors each plugin's GitHub releases into new `plugin_versions` and `plugin_version_assets` tables (`V16`) on an hourly schedule and serves them at `GET /api/v1/plugins/{slug}/versions`; `/resources/[slug]` renders the newest release expanded, with its changelog and a download button per asset, and the rest collapsed into accordions. A downloads chip joins the server-count chip, and the "Latest" chip now reads from the mirror when there is one — still the newest *stable* release, as GitHub's own "latest" means it — so a page render no longer spends a call on GitHub's rate limit for something the API already holds. DPC still hosts no files: every download link points at the asset on GitHub. Release notes are rendered with raw HTML parsing disabled, unlike the guide renderer, because a mirrored release body is not a file from a repository this site controls (#273).
- The release sync deletes a version GitHub no longer reports, but never on the strength of a failed fetch, and never past the oldest release it actually saw — so an outage or a rate limit can leave the mirror stale, but not wrongly empty.

### Changed

- The road map's **Version History & Downloads** item moves to Completed, and its description now says what shipped: a plugin's recent releases rather than every release ever cut.
- `dpc-api/README.md`'s configuration table now documents the seven environment variables it had omitted — the four `DPC_BACKLOG_*` ones, `DPC_CLAIMS_AUTO_RELEASE_DAYS`, `DPC_ADMIN_USERNAMES` and `DPC_FEATURE_REQUEST_GITHUB_TOKEN` — including the two whose defaults gate behaviour outright: nobody can convert a feature request until `DPC_ADMIN_USERNAMES` is set, and that conversion needs a wider-scoped token than the read-only backlog one it falls back to. `dpc.backlog.sync-initial-delay-ms`, previously reachable only through `BacklogSyncService`'s `@Scheduled` annotation, is now declared in `application.yml` alongside the rest of the sync's settings (#284).
- `USER_GUIDE.md`'s walk-through of a plugin's page now covers the Versions section and the downloads figure.
- The News page's private date formatter is now the shared `absoluteDateFrom` helper that release dates use, so the site prints a date one way. Same output for a valid date; a post whose date is malformed now renders nothing instead of "Invalid Date".
- The last four dates that still formatted themselves now go through `absoluteDateFrom` too, leaving the site with a single definition of a calendar date. The footer's "visits since" date was formatted in whatever time zone the runtime happened to be in, so a counter started near midnight UTC could render as one day on the server and the day before or after in the browser — a hydration mismatch that could visibly rewrite the footer after load (#286). The two "Member since" dates and the API-key list's "Created" date passed no locale at all, so a join date read `1/2/2026` in the US and `02/01/2026` in the UK, and an account created near midnight UTC showed a different day depending on where you were standing; all three now read `January 2, 2026` like every other date on the site (#287). The footer also stops showing the visit counter entirely when its start date won't parse, rather than printing "N visits since" with nothing after it — `data/visits.json` is bind-mounted and editable outside the app, so a malformed date is reachable.
- `CONFIG.md` now notes that `NEXT_PUBLIC_API_URL` is read during server-side rendering as well as from the browser, so it must be reachable from the Next.js server — a resource page's version list depends on it.
- The documented way to run this project locally now matches what the project actually does. `JWT_SECRET` has its own entry in `CONFIG.md` and is set in every command that starts the stack: `compose.yml` declares it as `${JWT_SECRET:?...}`, so `./up.sh` and `docker compose up` abort without it, yet `README.md` and `CONTRIBUTING.md` both told a new contributor to run them bare, and the variable was explained only in `dpc-api/README.md`, which the root `README.md` did not link (#290). `CONFIG.md` also stops pointing Docker Compose users at `.env.local`: Compose substitutes from `.env`, and the website image copies no env file at all, so that file was doing nothing on a Compose run — the two paths and the file each reads are now spelled out, and `.env` joins `.env*.local` in `.gitignore` since it is where the secret goes (#289).
- `README.md` now says that this repository contains the `dpc-api` Spring Boot back end as well as the Next.js front end — with the Java 17 toolchain that implies, a link to `dpc-api/README.md`, and `./mvnw verify` under Testing — rather than describing the project as a Next.js application alone. Its Docker Compose section also stops calling itself "Test Server with Hot-Reloading": that stack runs `next start` against a production build with no source volume mounted, so an edit needs a rebuild. `npm run dev`, previously the afterthought below it, is named as the hot-reloading path (#291). The Compose setup steps now also run `npm install` first and explain why — `compose.yml` bind-mounts `./node_modules` into the website container, so on a fresh clone the mount shadows what the image installed with an empty directory and the container fails to start — and `CONTRIBUTING.md`'s Compose command gains `--build`, without which a cached image serves the code as it was rather than as it is.
- The road map now reflects the state of the issue tracker. **Resource pages** move to Completed (#272, shipped in 0.15.0), and **on-site guides**, **community profiles and likes** (epic #167 phases 1–2), the **Dev Portal**, and the **search-visibility and link-preview work** (#244, #257, #215) are listed as completed work the page had never mentioned. **Discord announcements in News** (#24) moves from In Progress to Planned — its ingestion was never merged and the retraction problem (#142) is unanswered, so nothing is under way. New Planned items cover the open issues the page omitted: verified reviews and the install reporting they depend on (#278), following and an activity feed (#193), notifications (#196), profiles linked to factions (#195), MCP access tokens (#280, #281), and a knowledge-base section backed by the DPC Zettelkasten (#282). **Minecraft-version compatibility** (#162) and **badges and roles** (#194) are listed as In Progress, each naming the half that shipped and the half that has not.

### Fixed

- `./up.sh` and `./down.sh` now work as `README.md` says they do. Neither script was tracked as executable, so the command the setup instructions give as the way to start the local stack answered `Permission denied` on a fresh clone before Docker was ever reached; all three helper scripts are now mode `100755` (#294). Their first line was `# /bin/bash` — a comment, not a shebang — leaving the interpreter to whatever the caller fell back to, and now reads `#!/bin/bash`. The two Compose scripts also called `docker-compose`, the v1 binary that reached end of life in June 2023 and that current Docker installations may not provide at all; they now call the v2 subcommand `docker compose`, the spelling every document in the repository already used (#292).

## [0.15.0-SNAPSHOT-8-8-2026] – 2026-08-08

### Changed
- dansplugins-dot-com is now developed AI-first. Day-to-day feature work, grooming, review and maintenance run through AI agents working directly against this repository, with the maintainers setting direction and approving what lands. The version bump marks that change in how the project is built — it is not a break in behaviour, configuration or stored data, and existing installations can upgrade in place. Released as `0.15.0-SNAPSHOT-8-8-2026`: the AI-first line has not yet been verified in live operation, and the dated snapshot designation stays until it has.

### Added

- Every plugin now has a page of its own at `/resources/[slug]`, reached from the new **Details** button and the plugin's name on its card. The page gathers what the card had to leave out — icon, description, server count, latest release, like button — alongside download, guide, source and SpigotMC links, and routes bug reports to the plugin's issue tracker and feature ideas to the Dev Portal rather than collecting them on the page. `/sitemap.xml` now lists a resource URL per plugin, so each plugin has a page that can rank for its own name instead of sharing the home page with fifteen others. Server counts and release tags are best-effort: an unreachable bStats or GitHub omits a chip rather than failing the page (#272).
- The plugin catalogue now exists as a `plugins` table in `dpc-api` (`V15`), seeded from `pages/data/plugins.json` and served read-only at `GET /api/v1/plugins` and `GET /api/v1/plugins/{slug}`. This is the first half of moving the catalogue off a checked-in file; the site still renders from the file, and `__tests__/pluginCatalogue.test.ts` fails if the two disagree. The second half is #87. See `RESOURCE_HUB.md` (#87).
- `RESOURCE_HUB.md` documents the design of the resource hub the road map now tracks: what SpigotMC does that this site doesn't, which of those features are worth copying, and the decisions behind them — mirroring GitHub releases rather than hosting files, keeping reviews separate from discussion and from bug reports, and what it would take to mark a review as coming from someone whose server actually runs the plugin (a per-plugin install signal that `dpc-api` does not receive today, so reviews ship without it) (#271).
- Plugin cards now show a "Latest: vX.Y.Z" chip fetched from each plugin's GitHub releases at render time, so server owners can see the current release without clicking through to GitHub. Plugins with no releases show no chip; the fetch is best-effort and backed by a tested `utils/github.ts` helper (#162).
- Plugin cards now show each plugin's real branded icon (from `public/icons/`) instead of a generated letter avatar where one is mapped in `plugins.json`; plugins without a mapped icon still fall back to the letter avatar (#214).
- Pages now emit a canonical URL (`<link rel="canonical">` and `og:url`), built from `NEXT_PUBLIC_BASE_URL`, so query-string and trailing-slash variants of a page are no longer treated as separate resources. The dynamic guide and public-profile routes report their concrete path rather than the bracketed template (#244).
- The site now serves `/robots.txt` and `/sitemap.xml`, so search engines are told which pages exist instead of discovering them only by following links. The sitemap lists the top-level pages plus every on-site plugin guide (`/guides/[id]`, generated from `pages/data/plugins.json`); `robots.txt` asks crawlers to skip `/account`, `/dev` and `/api/`, and points at the sitemap. Both are routes built from `NEXT_PUBLIC_BASE_URL` rather than hard-coded static files, backed by a tested `utils/sitemap.ts` helper (#257).
- Shared links now show a branded preview image instead of a text-only card: a 1200×630 social card (`public/social-card.png`) is advertised as `og:image`/`twitter:image`, and `twitter:card` is now `summary_large_image`. Pages can override the image — or opt out of it — via a new `image` prop on `Seo`, backed by a tested `socialImageUrl` helper (#215).
- The guide page's (`pages/guides/[id].tsx`) `getServerSideProps` — the not-found, successful-fetch, non-ok-response, and network-failure branches — now has unit test coverage, matching the pattern already used for the home page's `getServerSideProps`. No behaviour change.
- The three remaining untested `getServerSideProps` handlers now have unit test coverage: the crawler-document routes (`pages/robots.txt.ts`, `pages/sitemap.xml.ts`) are checked for their `Content-Type`, their written body, that they read `NEXT_PUBLIC_BASE_URL` per request, and — for the sitemap — that every plugin in `pages/data/plugins.json` still gets a guide URL; the News page (`pages/news.tsx`) is checked for passing the stored posts through unmodified. `utils/sitemap.ts` and `utils/newsStorage.ts` were already tested, but the route wiring around them was not. No behaviour change.

### Changed

- A plugin card's primary button is now **Details**, opening that plugin's resource page; **GitHub** remains as a secondary link alongside **Guide** and **SpigotMC**. The card's title is a link to the same page.
- The road map now tracks the resource hub as six phases (resource pages, version history, reviews, discussion, update posts, discovery), and the existing "Editable Plugin Catalogue" item notes that it finishes the catalogue move `V15` starts.
- `GuideLikeButton` is now `SelfLoadingLikeButton`, taking the like target as props instead of hard-coding guides, so the resource page reuses it rather than growing a second copy. No behaviour change on guide pages.
- The plugin avatar's colour-from-title helper moved out of `PluginCard` into `utils/pluginAvatar.ts`, so a plugin gets the same colour on its card and on its resource page. No visual change.
- The "View the issue" link on a converted feature request now uses MUI's `Link` instead of a bare `<a>`, so it takes the theme's link colour like every other link on the site rather than the browser default (#246).
- Internal navigation (top nav, the wordmark, plugin/guide links, the account and public-profile pages) now routes through `next/link` instead of plain `<a href>`/`<Button href>`, so moving between pages is an instant client-side transition instead of a full page reload. External links (Discord, GitHub, SpigotMC, etc.) and same-page hash anchors are unchanged (#222).
- The top navigation now collapses into a hamburger menu (a right-hand `Drawer`) below the `md` breakpoint instead of wrapping twelve links into a ragged multi-line block, and the four off-site community links (Discord, Patreon, LinkedIn, RPKit) are grouped behind a "Community" menu/section on both desktop and mobile so the primary in-site nav stays to eight destinations plus Account (#216).
- The `NEXT_PUBLIC_API_URL || 'http://localhost:45345'` fallback, previously copy-pasted across seven files, is now a single `getApiBaseUrl()` resolver in `utils/apiBase.ts`; `services/visitService.ts` now shares `utils/seo.ts`'s `siteBaseUrl()` instead of keeping its own copy of the `NEXT_PUBLIC_BASE_URL` fallback. No behaviour change (#258, #260).

### Fixed

- The on-site guide pages (`/guides/[id]`) now wrap their content in `<main id="main">` like every other page, so the site-wide "Skip to main content" link actually lands somewhere. It previously had no target on those pages, leaving the first focusable element on the site's longest content inert, and the pages with no `main` landmark for a screen reader to jump to (#267).
- The on-site guide pages now render their title as an `<h1>` (styled as before via `variant="h3"`) instead of an `<h3>`. They previously contained no `<h1>` at all, so the heading outline opened at level 3 and then jumped to whatever `<h1>` the fetched `USER_GUIDE.md` supplied, and crawlers were offered guide pages — which `/sitemap.xml` lists — with no top-level heading to read (#268).
- A drift guard (`__tests__/pageLandmarks.test.ts`) now walks `pages/` and fails if a page is missing either the `main` landmark or an `<h1>`, in the style of the existing sitemap guard, so neither omission can recur silently.
- The lint instructions in `README.md` and `CONTRIBUTING.md` no longer list `npm run lint` twice under separate "Linux:" and "Windows:" headings, which implied a platform difference that does not exist (#247).
- `USER_GUIDE.md` no longer tells visitors to "click a plugin card" — plugin cards have never been clickable as a whole; the guide now names the actual controls on a card (Guide, GitHub, SpigotMC, and the like button) and documents the home page's search box and sort toggle, which had gone unmentioned since 0.14.0 (#253).
- `USER_GUIDE.md` no longer claims the Guides page opens a plugin's guide "in a new tab" — guides have rendered on-site at `/guides/[id]` since #163; the doc now describes that behavior and the "View on GitHub" fallback link.
- `NEXT_PUBLIC_BASE_URL` is now passed as a Docker build arg and environment variable in `compose.yml` (matching `NEXT_PUBLIC_API_URL`), so it can actually be set when deploying via `docker compose up --build` as `CONFIG.md` already documented. Previously it had no `Dockerfile`/`compose.yml` wiring at all, so the production build always inlined the `http://localhost:3000` default regardless of what was set, and canonical URLs / `og:url` / shared-link previews would always advertise `localhost` (#251).
- `CONTRIBUTING.md`'s Testing section now lists `npm test` and `npm run build` alongside `npm run lint`, and adds a backend (`dpc-api/`) testing step — previously it named only `npm run lint`, so a contributor following it exactly could open a PR that fails CI on the `npm test` and `./mvnw verify` gates the guide never mentioned (#254).
- `CONTRIBUTING.md` and `.github/copilot-instructions.md` now tell contributors to branch from and target `main`, which is where every pull request has actually gone for months. They previously described a `develop`-based workflow, so a contributor following them exactly would branch from a `develop` that has not moved since 0.13.0 and then have to retarget or rebase the pull request (#249).
- `.github/workflows/build.yml`'s push trigger no longer lists `develop` alongside `main` — #249 already retired the `develop`-based workflow in the contributor docs, but the CI trigger was missed, so it still fired on pushes to a branch every doc says is unused. `pull_request` triggers (which run on real PRs regardless of target) are unchanged.
- `CONFIG.md`'s `next.config.js` section now names the two options actually set (`reactStrictMode`, `swcMinify`) with their values and rationale, instead of only linking to the upstream Next.js docs. `swcMinify: false` is noted as a restatement of the default under the pinned `next@12.2.2` (not an active opt-out), which should be revisited on a future Next.js major upgrade (#265).

## [0.14.0] – 2026-06-14

### Added

- Each faction row on the leaderboard now shows how recently its data was synced ("Updated N days ago"), so visitors can tell whether a member count is current or stale (#212). Backed by a tested `utils/relativeTime` helper.
- The Account page's Login, Register, Save-profile, and Create-key buttons now show a spinner and disable while the request is in flight, giving feedback on slow actions and preventing accidental double-submits (#206).
- The plugin search box now has a clear (✕) button and, while searching, shows a "Showing N of M plugins" count (#220).
- Each plugin card now links to that plugin's on-site **Guide** (`/guides/{id}`) alongside the GitHub and SpigotMC buttons (#221).

### Changed

- The site wordmark in the top bar now links to the home page, matching the universal "click the logo to go home" convention (#209).
- The top navigation now reflects your signed-in state: it shows your username when you're logged in and "Sign in" when you're not, instead of an always-identical "Account" link (#210).
- Sign-in, registration, and leaderboard error messages now use plain, user-facing language instead of developer-speak like "Is the API running?" (#207, #211). A failed registration no longer speculatively blames the username; it points at both the username and the password requirements (#208).

### Fixed

- Each page now has a single `<h1>` (its title) and wraps its content in a `<main id="main">` landmark, and a "Skip to main content" link (hidden until focused) lets keyboard and screen-reader users bypass the navigation — fixing the missing-heading and no-bypass-blocks gaps (WCAG 2.4.1, 1.3.1) (#218, #219).
- The `<html>` element now sets `lang="en"`, so assistive technology and translation tools can identify the page language (WCAG 3.1.1) (#217).
- External links on the News, Road Map, and Commissions pages now use `rel="noopener noreferrer"` (previously only `noopener`), matching the rest of the site and avoiding referrer leakage (#213).

## [0.13.0] – 2026-06-14

### Changed

- Authentication is now provided by the shared UserAuth service instead of dpc-api's own accounts (epic #167, phase 1). dpc-api proxies registration/login/logout to UserAuth and validates its tokens; a local profile mirror owns each user's API keys. The Account page now signs in via UserAuth and supports a profile (display name, avatar, bio). API paths moved from `/api/v1/accounts/*` to `/api/v1/auth/*` and `/api/v1/profile/*`. The Docker Compose stack now bundles the UserAuth service (and its database) so `docker compose up` runs end-to-end; `JWT_SECRET` (used by UserAuth to sign tokens) is now required when starting the stack.

### Removed

- The orphaned `discord_announcements` table is dropped (migration V11). The Discord-ingestion feature (#24) was preview-deployed to production on 2026-06-06 — which created the table — but its PR was never merged, so no code referenced the table. It is dropped until the feature lands; the original create migration (V8) is retained because it is recorded in production's migration history.

### Fixed

- `POST /api/v1/auth/register` no longer returns a 503 (which hid that the account was already created) when the automatic post-register login fails. It now returns `201` with `{ "registered": true, "tokenIssued": false }`, signalling the caller to log in rather than re-register.

### Added

- Custom, MUI-styled **404 and 500 error pages** (a shared `components/ErrorPage`), so a missing or failed route keeps the site's theme and navigation and offers a link home, instead of Next.js's unstyled default page.
- The plugin catalogue gains a **"Most Liked"** sort option alongside "By Popularity" (server count) and "Alphabetical", ranking plugins by their like count (#201, epic #167 phase 2). The sort logic was extracted into a unit-tested `utils/sortPlugins.ts`.
- Earned **badges now also appear on the signed-in user's own Account page** (not just the public profile), and the badge-label map is shared between the two pages (`utils/badges.ts`). The authenticated `GET /api/v1/profile/me` response gains a `badges` array (#194, epic #167 phase 3).
- **Profile badges** (#194, epic #167 phase 3). Public profiles now show earned badges, starting with **Server Owner** (awarded to any user who owns at least one API key — i.e. runs a server that syncs with DPC). Badges are *derived* from existing state rather than stored, so they stay accurate automatically; the public `GET /api/v1/profile/{username}` response gains a `badges` array.
- **Public profile pages** (#181, epic #167 phase 3). A new public `GET /api/v1/profile/{username}` returns a user's public profile — display name, avatar, bio, join date, and the plugins/guides they've liked — deliberately **excluding** the internal id and API keys (which stay on the authenticated `GET /api/v1/profile/me`). The website renders these at `/u/{username}`, and the Account page links to your own public profile. This is the foundation for the social layer (following, activity, comment author links).
- The Account page now shows a **"My likes"** section listing the plugins and guides the signed-in user has liked — a personal toolbox linking to each item (#180, epic #167 phase 3). Frontend-only: it reads the existing `GET /api/v1/likes/me` and resolves ids against the plugin catalogue.
- Plugin cards and guide pages now show a **like button with a count** (#169, frontend). Signed-in users can like/unlike (the count updates live); logged-out visitors see counts and are sent to the Account page to sign in. Backed by the likes API.
- A likes API in `dpc-api` (#169, backend): authenticated `POST`/`DELETE /api/v1/likes` to like/unlike a plugin or guide (idempotent), public `GET /api/v1/likes/counts?type=...` for aggregate counts, and `GET /api/v1/likes/me` for the current user's liked set.
- Plugin guides now render on-site at `/guides/[id]` (fetched from each plugin's `USER_GUIDE.md` and rendered with `markdown-to-jsx`) instead of linking out to raw GitHub markdown; the Guides page links to these in-site pages, and each guide keeps a "View on GitHub" link and falls back to GitHub if the content can't be loaded.
- The home-page plugin catalogue now has a search box that filters plugins by name or description (in addition to the existing sort), with an empty state when nothing matches.
- The faction leaderboard now shows each faction's server IP (as a click-to-copy chip) and a link to its Discord, when the faction has published them.
- Every page now sets a descriptive `<title>`, meta description, and Open Graph / Twitter card tags (via a shared `Seo` component), so browser tabs, search engines, and shared links show meaningful information.

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
