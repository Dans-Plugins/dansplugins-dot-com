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
**Description:** The site's own base URL, used by the frontend for calls to its internal Next.js API routes (for example, the visit-counter endpoint at `/api/visits`). Set this to the site's public origin when deploying so server-side rendering can reach its own API routes. Distinct from `NEXT_PUBLIC_API_URL`, which points at the separate DPC API backend.

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

## Editing News Posts

The News page (`/news`) reads its posts at request time from `data/news.json`. In a Docker Compose deployment this lives on the mounted `./data` volume, so **posts can be edited on the server without rebuilding or redeploying the site** — changes appear on the next page load.

- The file is **seeded with default posts on first run** if it does not exist.
- If the file is present but contains invalid JSON, the page serves the default posts and **does not overwrite your file**, so an editing typo never destroys content. Fix the JSON and reload.
- Posts are displayed newest-first (by `date`).
- The News page also **merges in community posts from the DPC API** (`GET ${NEXT_PUBLIC_API_URL}/api/v1/news`, currently Discord announcements). These appear in the same feed with a "From Discord" badge. If the API is unreachable the page still renders the local `data/news.json` posts. On an `id` collision a local post wins. See the `dpc-api` README for enabling Discord ingestion (`DISCORD_*` variables).

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
