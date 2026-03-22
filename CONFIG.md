# Configuration Guide

This document describes the configuration options for the Dan's Plugins Community Website.

## Environment Variables

The application is configured via environment variables. Copy `.env.local.example` to `.env.local` (if provided) or set the variables directly in your environment.

### `NEXT_PUBLIC_SITE_URL`

**Type:** string  
**Default:** `https://dansplugins.com`  
**Description:** The public base URL of the site. Used for generating absolute links and canonical URLs.

**Example:**

```env
NEXT_PUBLIC_SITE_URL=https://dansplugins.com
```

## Docker Compose Configuration

When running the site with Docker Compose, environment variables can be placed in a `.env` file in the project root. The `.env` file is excluded from version control via `.gitignore`.

**Example `.env`:**

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## next.config.js

Additional Next.js configuration is found in `next.config.js` in the project root. Refer to the [Next.js documentation](https://nextjs.org/docs/api-reference/next.config.js/introduction) for all available options.
