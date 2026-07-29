# Configuration Guide

This document describes the configuration options for the Dan's Plugins Community Website.

## Environment Variables

The application is configured via environment variables. Create a `.env.local` file in the project root and set the variables described below, or set them directly in your environment.

### `NEXT_PUBLIC_API_URL`

**Type:** string  
**Default:** `http://localhost:45345`  
**Description:** The base URL of the DPC API backend. The frontend uses this for all API calls (account management, factions leaderboard, etc.). Change this when deploying to a different host or port.

**Example:**

```env
NEXT_PUBLIC_API_URL=https://api.dansplugins.com
```

### `NEXT_PUBLIC_BASE_URL`

**Type:** string  
**Default:** `http://localhost:3000`  
**Description:** The site's own base URL. It is used for two things: calls the frontend makes to its internal Next.js API routes (for example, the visit-counter endpoint at `/api/visits`), and the absolute URLs each page advertises to search engines and link scrapers — the canonical URL (`<link rel="canonical">` and `og:url`) and the social preview image (`og:image`/`twitter:image`, served from `public/social-card.png`). Set this to the site's public origin when deploying — otherwise server-side rendering cannot reach its own API routes, and shared links will advertise `localhost` URLs whose preview image no one outside your machine can load. Distinct from `NEXT_PUBLIC_API_URL`, which points at the separate DPC API backend. Like all `NEXT_PUBLIC_*` variables, it is inlined at **build time**, not read at runtime — with Docker Compose it must be set when running `docker compose up --build` (see [Docker Compose Configuration](#docker-compose-configuration)), not just on the running container.

**Example:**

```env
NEXT_PUBLIC_BASE_URL=https://dansplugins.com
```

## Docker Compose Configuration

When running the site with Docker Compose, environment variables can be placed in a `.env.local` file in the project root. Files matching the `.env*.local` pattern are excluded from version control via `.gitignore`.

**Example `.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:45345
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

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

Additional Next.js configuration is found in `next.config.js` in the project root. Refer to the [Next.js documentation](https://nextjs.org/docs/api-reference/next.config.js/introduction) for all available options.
