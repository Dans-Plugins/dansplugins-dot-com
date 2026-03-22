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

## Docker Compose Configuration

When running the site with Docker Compose, environment variables can be placed in a `.env.local` file in the project root. Files matching the `.env*.local` pattern are excluded from version control via `.gitignore`.

**Example `.env.local`:**

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## next.config.js

Additional Next.js configuration is found in `next.config.js` in the project root. Refer to the [Next.js documentation](https://nextjs.org/docs/api-reference/next.config.js/introduction) for all available options.
