// Builders for the two crawler documents the site serves: `/sitemap.xml` (the
// list of pages worth indexing) and `/robots.txt` (which routes a crawler may
// visit, plus a pointer at the sitemap). Kept pure and separate from the routes
// in pages/ — the same split as utils/seo.ts and components/Seo.tsx — so the
// path list and the generated text can be unit-tested without a request.

import {absoluteUrl} from './seo';
import {resourcePath} from './resources';

// The route the sitemap is served from, referenced by both the sitemap route
// itself and the `Sitemap:` line in robots.txt.
export const SITEMAP_ROUTE = '/sitemap.xml';

// The static pages worth offering to a search engine. Deliberately not derived
// from the contents of pages/ — that directory also holds error pages, API
// routes, dynamic templates, and the routes listed as off-limits below, none of
// which belong in a sitemap. Add a new top-level page here when you add one.
// This is the top navigation (components/TopBar.tsx) minus `/dev`: the Dev
// Portal is linked for humans but renders nothing until its client-side API
// calls resolve, so there is nothing there for a crawler to index.
export const STATIC_SITEMAP_PATHS: readonly string[] = [
    '/',
    '/about',
    '/guides',
    '/leaderboard',
    '/news',
    '/roadmap',
    '/commissions'
];

// Routes a crawler is asked to skip: `/account` is signed-in-only, `/dev` is the
// developer console (see above), and `/api/` serves JSON rather than pages. This
// is a request, not access control — nothing here is private. Public profiles
// (`/u/[username]`) stay crawlable — they are public — but are left out of the
// sitemap, since the set of usernames is not ours to enumerate.
export const DISALLOWED_CRAWL_PATHS: readonly string[] = ['/account', '/dev', '/api/'];

// Escape the five characters XML reserves. Today's paths are plain slugs, but a
// future path carrying a query string or an ampersand would otherwise emit
// invalid XML that a crawler rejects outright.
const escapeXml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

// Render a sitemap for the given site-relative paths. `baseUrl` comes from
// NEXT_PUBLIC_BASE_URL (documented in CONFIG.md), so the URLs are absolute as
// the sitemap protocol requires. No `lastmod`, `changefreq` or `priority`: the
// pages are server-rendered from live data with no per-page modification date to
// report honestly, and Google ignores the latter two.
export const sitemapXml = (baseUrl: string, paths: readonly string[]): string => {
    const urls = paths.map(
        (path) => `    <url>\n        <loc>${escapeXml(absoluteUrl(baseUrl, path))}</loc>\n    </url>`
    );
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        ''
    ].join('\n');
};

// The on-site guide pages (`/guides/[id]`), one per plugin in
// pages/data/plugins.json. They are reachable from the Guides page, but listing
// them saves a crawler from having to follow that page's links to find them. Ids
// are percent-encoded as a single path segment — every id today is a plain slug,
// but Next.js hands `params.id` back decoded, so encoding here is what keeps the
// advertised URL and the route in agreement whatever an id contains.
export const guideSitemapPaths = (pluginIds: readonly string[]): string[] =>
    pluginIds.map((id) => `/guides/${encodeURIComponent(id)}`);

// The on-site resource pages (`/resources/[slug]`), one per plugin. These are
// the pages a search engine should rank for a plugin's name — the home page
// carries all sixteen plugins at once, so it can rank for none of them
// individually. The path shape comes from utils/resources.ts rather than being
// spelled again here, so a link on the site and its sitemap entry cannot differ.
export const resourceSitemapPaths = (pluginIds: readonly string[]): string[] =>
    pluginIds.map(resourcePath);

// Render robots.txt: everything is crawlable except the routes above, and the
// sitemap is advertised as the absolute URL the standard requires.
export const robotsTxt = (baseUrl: string): string =>
    [
        'User-agent: *',
        'Allow: /',
        ...DISALLOWED_CRAWL_PATHS.map((path) => `Disallow: ${path}`),
        '',
        `Sitemap: ${absoluteUrl(baseUrl, SITEMAP_ROUTE)}`,
        ''
    ].join('\n');
