// Helpers for the canonical URL a page advertises to search engines and link
// scrapers (`<link rel="canonical">` and `og:url`). Kept pure and separate from
// components/Seo.tsx so the URL-normalisation rules can be unit-tested.

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

// Join the site's own origin to a canonical path. `baseUrl` comes from
// NEXT_PUBLIC_BASE_URL (documented in CONFIG.md) and may or may not carry a
// trailing slash; `path` is the output of canonicalPath.
export const absoluteUrl = (baseUrl: string, path: string): string => {
    const origin = baseUrl.replace(/\/+$/, '');
    return path === '/' ? `${origin}/` : `${origin}${path}`;
};
