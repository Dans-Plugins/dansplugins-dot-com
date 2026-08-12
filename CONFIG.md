# Configuration Guide

This document describes the configuration options for the Dan's Plugins Community Website.

## Environment Variables

The application is configured via environment variables. Which file to put them in depends on how the project is being run, because the two paths read different files:

| Running with | File read | Notes |
| --- | --- | --- |
| `npm run dev` / `npm run build` | `.env.local` | Next.js loads it automatically. Ignored by git via the `.env*.local` pattern. |
| `docker compose` | `.env` | Compose substitutes `${VAR}` in `compose.yml` from the shell environment or from a `.env` file in the project root — it does not read `.env.local`. See [Docker Compose Configuration](#docker-compose-configuration). |

Variables can also be set directly in the environment, which works for both.

### `NEXT_PUBLIC_API_URL`

**Type:** string  
**Default:** `http://localhost:45345`  
**Description:** The base URL of the DPC API backend. The frontend uses this for all API calls (account management, factions leaderboard, etc.). Change this when deploying to a different host or port. Note that some of those calls are made during **server-side rendering** rather than from the browser — a resource page reads its version history from the API while rendering — so this URL has to be reachable from the Next.js server as well as from a visitor's browser. Where the two differ, the server-side call is the one that decides whether a version list appears.

**Example:**

```env
NEXT_PUBLIC_API_URL=https://api.dansplugins.com
```

### `NEXT_PUBLIC_BASE_URL`

**Type:** string  
**Default:** `http://localhost:3000`  
**Description:** The site's own base URL. It is used for three things: calls the frontend makes to its internal Next.js API routes (for example, the visit-counter endpoint at `/api/visits`); the absolute URLs each page advertises to search engines and link scrapers — the canonical URL (`<link rel="canonical">` and `og:url`) and the social preview image (`og:image`/`twitter:image`, served from `public/social-card.png`); and the URLs listed in `/sitemap.xml` and `/robots.txt` (see [Crawler Documents](#crawler-documents)). Set this to the site's public origin when deploying — otherwise server-side rendering cannot reach its own API routes, shared links will advertise `localhost` URLs whose preview image no one outside your machine can load, and the sitemap will hand search engines a list of `localhost` pages. Distinct from `NEXT_PUBLIC_API_URL`, which points at the separate DPC API backend. Like all `NEXT_PUBLIC_*` variables, it is inlined at **build time**, not read at runtime — with Docker Compose it must be set when running `docker compose up --build` (see [Docker Compose Configuration](#docker-compose-configuration)), not just on the running container.

**Example:**

```env
NEXT_PUBLIC_BASE_URL=https://dansplugins.com
```

### `JWT_SECRET`

**Type:** string  
**Default:** *none — required*  
**Description:** The signing secret for the bundled [UserAuth](https://github.com/Preponderous-Software/UserAuth) service that `dpc-api` delegates authentication to. It must be at least 32 bytes. Unlike the `NEXT_PUBLIC_*` variables it is a runtime secret, not a build-time inline, and it is never exposed to the browser.

It is **required** by the Docker Compose stack: `compose.yml` declares it as `${JWT_SECRET:?...}`, so `docker compose up` — and therefore `./up.sh` — aborts with an error rather than starting when it is unset. It is read by UserAuth rather than by this site, so running the front end alone with `npm run dev` does not need it, while a UserAuth instance started outside Compose does (see [`dpc-api/README.md`](dpc-api/README.md)).

Treat it as a secret: keep it out of version control, and use a distinct value in each environment. Changing it invalidates every token UserAuth has already issued, so everyone signed in is signed out.

**Example:**

```bash
JWT_SECRET="your-secret-key-at-least-32-bytes-long" docker compose up --build
```

## Docker Compose Configuration

When running the stack with Docker Compose, variables can be set in the shell or placed in a **`.env`** file in the project root. Compose reads `.env` for `${VAR}` substitution in `compose.yml`; it does not read `.env.local`, and no env file is copied into the website image (see the `COPY` lines in `Dockerfile`), so `.env.local` has no effect on a Compose run.

`.env` holds `JWT_SECRET` and is therefore ignored by git, alongside the `.env*.local` pattern.

**Example `.env`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:45345
NEXT_PUBLIC_BASE_URL=http://localhost:3000
JWT_SECRET=your-secret-key-at-least-32-bytes-long
```

`compose.yml` starts five services: the Next.js site (published on port 3000), `dpc-api` (45345, see [API Port](#api-port)), its PostgreSQL database (5432), and — reachable only from inside the Compose network — UserAuth and its own database. The faction-sync guards `dpc-api` reads (`DPC_SYNC_MIN_INCOMING`, `DPC_SYNC_MAX_DEACTIVATION_RATIO`, `DPC_SYNC_MAX_DEACTIVATIONS`) can be overridden the same way, and are documented in [`dpc-api/README.md`](dpc-api/README.md).

### API Port

The Docker Compose published port for the API can be changed via `API_PORT`:

```bash
API_PORT=9090 JWT_SECRET="your-secret-key-at-least-32-bytes-long" docker compose up --build
```

When changing the API port, set `NEXT_PUBLIC_API_URL` to match. This is passed to the frontend as a Docker build arg and environment variable automatically via `compose.yml`:

```bash
API_PORT=9090 NEXT_PUBLIC_API_URL=http://localhost:9090 JWT_SECRET="your-secret-key-at-least-32-bytes-long" docker compose up --build
```

## Social Preview Image

Every page advertises a preview image for shared links (`og:image`, `twitter:image`, with `twitter:card` set to `summary_large_image`), so a dansplugins.com link posted in Discord or on social media renders as a branded card rather than plain text.

- The site-wide card is `public/social-card.png` (1200×630, the size Open Graph consumers expect). Replace that file to rebrand it; keep the dimensions, since `components/Seo.tsx` declares them as `og:image:width`/`og:image:height`. If the new artwork says something different, update `DEFAULT_SOCIAL_IMAGE_ALT` in `components/Seo.tsx` too — it is the `og:image:alt` text describing the card.
- The URL is made absolute using `NEXT_PUBLIC_BASE_URL`, so that variable must be set to the site's public origin for previews to work anywhere but your own machine.
- A page can override the image by passing an `image` prop to `Seo` — either a path under `public/` or an absolute URL — or suppress it entirely with `image={null}`. Overrides omit the width/height hints, since only the site card's dimensions are known.

## Crawler Documents

The site serves `/robots.txt` and `/sitemap.xml` so search engines know which pages exist and which routes to leave alone. Both are **routes** (`pages/robots.txt.ts` and `pages/sitemap.xml.ts`), not static files under `public/`, because both need absolute URLs built from `NEXT_PUBLIC_BASE_URL` — a static file would have to hard-code an origin.

- **Set `NEXT_PUBLIC_BASE_URL` before deploying.** Otherwise the sitemap advertises `http://localhost:3000` pages and `robots.txt` points at a `localhost` sitemap, both of which are useless to a crawler.
- The page list lives in `STATIC_SITEMAP_PATHS` in `utils/sitemap.ts`. Add a new top-level page there when you add one — a test in `__tests__/sitemap.test.ts` walks `pages/` and fails if an addressable page is neither listed in the sitemap nor disallowed below. The per-plugin guide pages (`/guides/[id]`) are generated from `pages/data/plugins.json` and need no maintenance.
- `robots.txt` disallows `/account` (signed-in only), `/dev` (the developer console), and `/api/` (JSON, not pages) — the `DISALLOWED_CRAWL_PATHS` list in the same file. Public profiles (`/u/[username]`) stay crawlable but are not listed in the sitemap.
- Neither document is a substitute for indexing controls on individual pages; `robots.txt` is a request, not an access control. Do not rely on it to keep anything private.

## Editing News Posts

The News page (`/news`) reads its posts at request time from `data/news.json`. In a Docker Compose deployment this lives on the mounted `./data` volume, so **posts can be edited on the server without rebuilding or redeploying the site** — changes appear on the next page load.

- The file is **seeded with default posts on first run** if it does not exist.
- If the file is present but contains invalid JSON, the page serves the default posts and **does not overwrite your file**, so an editing typo never destroys content. Fix the JSON and reload.
- Posts are displayed newest-first (by `date`).

Each entry in the `posts` array supports these fields:

| Field | Required | Description |
|---|---|---|
| `id` | yes | Unique identifier for the post (used as the React key). |
| `title` | yes | Post heading. |
| `date` | yes | Post date, `YYYY-MM-DD` (formatted in UTC for display). |
| `body` | yes | Post text. |
| `source` | no | Provenance badge: `direct` (default, "Announcement"), `discord` ("From Discord"), or `external` ("Reposted"). |
| `sourceUrl` | no | Link to the original source; rendered as a "View source" link when present. |
| `author` | no | Optional attribution shown next to the date. |

**Example `data/news.json`:**

```json
{
  "posts": [
    {
      "id": "welcome",
      "title": "Welcome to the new site",
      "date": "2026-06-10",
      "body": "We launched a refreshed community website.",
      "source": "direct"
    },
    {
      "id": "announcement-123",
      "title": "Server event this weekend",
      "date": "2026-06-09",
      "body": "Join us for a community build event.",
      "source": "discord",
      "sourceUrl": "https://discord.gg/xXtuAQ2"
    }
  ]
}
```

## next.config.js

Additional Next.js configuration is found in `next.config.js` in the project root. The options actually set there are documented below; refer to the [Next.js documentation](https://nextjs.org/docs/api-reference/next.config.js/introduction) for everything else.

| Option | Value | Why |
| --- | --- | --- |
| `reactStrictMode` | `true` | Opts into React's additional development-mode checks (double-invoked effects, deprecated API warnings) to catch issues early. |
| `swcMinify` | `false` | `next` is pinned at `12.2.2`, where the SWC minifier defaults to `false`; this line restates that default rather than actively opting out of it. Next.js made `swcMinify` default to `true` starting in v13, so this line should be revisited (and can likely be removed) if/when the `next` dependency is upgraded past v12. |
