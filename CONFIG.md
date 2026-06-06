# Configuration Guide

This document describes the configuration options for the Dan's Plugins Community Website.

## Environment Variables

The application is configured via environment variables. Create a `.env.local` file in the project root and set the variables described below, or set them directly in your environment.

### `NEXT_PUBLIC_SITE_URL`

**Type:** string  
**Default:** `https://dansplugins.com`  
**Description:** The public base URL of the site. Used for generating absolute links and canonical URLs.

**Example:**

```env
NEXT_PUBLIC_SITE_URL=https://dansplugins.com
```

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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:45345
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

## next.config.js

Additional Next.js configuration is found in `next.config.js` in the project root. Refer to the [Next.js documentation](https://nextjs.org/docs/api-reference/next.config.js/introduction) for all available options.
