# Configuration Guide

This document describes the configuration options for the Dan's Plugins Community Website.

## Environment Variables

The application is configured via environment variables. Which file to put them in depends on how the project is being run, because the two paths do not read the same set of files:

| Running with | Files read | Notes |
| --- | --- | --- |
| `npm run dev` / `npm run build` | `.env`, then `.env.local` | Next.js loads both automatically; `.env.local` takes precedence where they overlap. |
| `docker compose` | `.env` only | Compose substitutes `${VAR}` in `compose.yml` from the shell environment or from a `.env` file in the project root. It does **not** read `.env.local`, and no env file is copied into the website image. See [Docker Compose Configuration](#docker-compose-configuration). |

So `.env` is the file both paths honour, and the one to use when a value should apply to either. Note that a `NEXT_PUBLIC_*` value left in `.env` is picked up by a later `npm run build` as well — for example a `.env` written for local Compose use will inline `http://localhost:3000` into a production bundle built on the same machine.

Variables can also be set directly in the environment, which works for both.

### `NEXT_PUBLIC_API_URL`

**Type:** string  
**Default:** `http://localhost:45345`  
**Description:** The base URL of the DPC API backend, as a **visitor's browser** reaches it. The frontend uses this for all API calls (account management, factions leaderboard, etc.). Change this when deploying to a different host or port. Note that some of those calls are made during **server-side rendering** rather than from the browser — a resource page reads its version history from the API while rendering, and the home page reads every card's release tag from it — so this URL has to be reachable from the Next.js server too, unless [`DPC_API_INTERNAL_URL`](#dpc_api_internal_url) names a separate address for that. Where the server cannot reach the API, a version list and the "Latest" chips are simply absent: each of those reads swallows its own error so the page degrades rather than breaks.

**Example:**

```env
NEXT_PUBLIC_API_URL=https://api.dansplugins.com
```

### `DPC_API_INTERNAL_URL`

**Type:** string  
**Default:** *unset — falls back to `NEXT_PUBLIC_API_URL`*  
**Description:** The base URL of the DPC API backend, as the **Next.js server** reaches it while rendering. Set this only where the server and the browser reach `dpc-api` at different addresses; when it is unset, server-side calls use `NEXT_PUBLIC_API_URL` like everything else, which is the right answer wherever the API answers at one public origin from both sides.

The Docker Compose stack is the case that needs it. `NEXT_PUBLIC_API_URL` there is the API's published host port (`http://localhost:45345`), which is what a visitor's browser needs — but from inside the `dpc-website` container that is the container's own loopback, where nothing listens. On the Compose network the API is `http://dpc-api:8080`, and no single value can name both. `compose.yml` therefore defaults this variable to `http://dpc-api:8080`; override it in the shell or `.env` if the API service is renamed or moved.

Unlike the `NEXT_PUBLIC_*` variables it is never exposed to the browser and is **not** inlined at build time — it is read from the environment at runtime, so changing it needs a container restart rather than an image rebuild.

**Example:**

```env
DPC_API_INTERNAL_URL=http://dpc-api:8080
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

Because the `NEXT_PUBLIC_*` values are inlined when the image is built, rebuild after changing them: `docker compose up --build`, or `./up.sh`, which always rebuilds. A plain `docker compose up` reuses the cached image, so neither a changed variable nor a changed source file appears. [`DPC_API_INTERNAL_URL`](#dpc_api_internal_url) is the exception — being server-only it is read at runtime, so a restart is enough.

`compose.yml` sets `DPC_API_INTERNAL_URL` to `http://dpc-api:8080` by default, which is how the website container reaches the API on the Compose network. Leave it alone unless the API service is renamed or moved; it does not belong in a `.env` written for `npm run dev`, where the server and the browser are the same machine and `NEXT_PUBLIC_API_URL` already answers for both.

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

`API_PORT` is the *published* port only; inside the Compose network the API still listens on 8080, so [`DPC_API_INTERNAL_URL`](#dpc_api_internal_url) does not change with it.

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

`swcMinify` used to be set here to restate Next 12's default. Next.js made the SWC minifier the default in v13 and removed the option in v15, so on `next` 14 the line said nothing and has been dropped.
