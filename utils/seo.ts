// Helpers for the URLs a page advertises to search engines and link scrapers —
// the canonical URL (`<link rel="canonical">` and `og:url`) and the social
// preview image (`og:image`). Kept pure and separate from components/Seo.tsx so
// the URL-normalisation rules can be unit-tested.

// Normalise a route into the single path a page should claim as canonical:
// query string and fragment removed (so `?utm_source=discord` is not a separate
// resource), a leading slash guaranteed, and any trailing slash dropped except
// on the root. Returns null when there is no honest canonical path to emit —
// an empty route, or one still containing an unresolved dynamic segment such as
// `/guides/[id]`, which Next.js reports before the concrete value is known.
export const canonicalPath = (path: string): string | null => {
    const withoutFragment = path.split('#')[0];
    const withoutQuery = withoutFragment.split('?')[0];
    if (withoutQuery === '' || withoutQuery.includes('[')) {
        return null;
    }
    const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
    const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');
    return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash;
};

// The site's own public origin. Every absolute URL the site advertises — the
// canonical URL, og:url, og:image, and the crawler documents in utils/sitemap.ts
// — is built from this. Documented in CONFIG.md. Read through a function so each
// caller decides when to read it: components/Seo.tsx reads once at module scope
// (the canonical URL never varies within a running build), while the sitemap and
// robots.txt routes read per request.
export const siteBaseUrl = (): string => process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Join the site's own origin to a canonical path. `baseUrl` comes from
// NEXT_PUBLIC_BASE_URL (documented in CONFIG.md) and may or may not carry a
// trailing slash; `path` is the output of canonicalPath.
export const absoluteUrl = (baseUrl: string, path: string): string => {
    const origin = baseUrl.replace(/\/+$/, '');
    return path === '/' ? `${origin}/` : `${origin}${path}`;
};

// Resolve the social preview image (`og:image`) to the absolute URL scrapers
// require — Discord, Twitter/X and friends will not follow a site-relative
// path. Accepts either a path under `public/` ("/social-card.png", the usual
// case, resolved against NEXT_PUBLIC_BASE_URL) or an already-absolute URL,
// which is passed through so a page can point at an externally hosted image.
// Returns null when there is no image to advertise, so the caller can omit the
// tag rather than emit an empty one.
export const socialImageUrl = (baseUrl: string, image: string | null | undefined): string | null => {
    if (!image) {
        return null;
    }
    const trimmed = image.trim();
    if (trimmed === '') {
        return null;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return absoluteUrl(baseUrl, trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
};
