import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {
    DISALLOWED_CRAWL_PATHS,
    SITEMAP_ROUTE,
    STATIC_SITEMAP_PATHS,
    guideSitemapPaths,
    resourceSitemapPaths,
    robotsTxt,
    sitemapXml
} from '../utils/sitemap';

const BASE_URL = 'https://dansplugins.com';

// The routes under pages/ that a crawler could ask for, ignoring everything that
// is not an addressable page: API handlers, Next.js special files (_app,
// _document), the error pages, dynamic templates (no single URL to list), and the
// two crawler documents themselves. Used only by the drift guard below, so the
// path list cannot silently fall behind the pages/ directory.
const crawlableRoutes = (dir = 'pages', prefix = ''): string[] =>
    readdirSync(join(process.cwd(), dir), {withFileTypes: true}).flatMap((entry) => {
        if (entry.isDirectory()) {
            return entry.name === 'api' ? [] : crawlableRoutes(join(dir, entry.name), `${prefix}/${entry.name}`);
        }
        const match = entry.name.match(/^(.*)\.tsx?$/);
        if (!match) {
            return [];
        }
        const name = match[1];
        if (
            name.startsWith('_') ||
            name === '404' ||
            name === '500' ||
            name.includes('[') ||
            name === 'robots.txt' ||
            name === 'sitemap.xml'
        ) {
            return [];
        }
        return [name === 'index' ? prefix || '/' : `${prefix}/${name}`];
    });

describe('STATIC_SITEMAP_PATHS', () => {
    it('lists only site-relative paths', () => {
        const notRelative = STATIC_SITEMAP_PATHS.filter((path) => !path.startsWith('/'));
        expect(notRelative).toEqual([]);
    });

    it('contains no dynamic route templates, which have no single canonical URL', () => {
        const templates = STATIC_SITEMAP_PATHS.filter((path) => path.includes('['));
        expect(templates).toEqual([]);
    });

    it('does not offer a route that robots.txt asks crawlers to skip', () => {
        const contradictions = STATIC_SITEMAP_PATHS.filter((path) =>
            DISALLOWED_CRAWL_PATHS.some((disallowed) => path.startsWith(disallowed))
        );
        expect(contradictions).toEqual([]);
    });

    // Drift guard: adding a page under pages/ without deciding what crawlers
    // should do with it is the failure mode this list has. Every addressable
    // page must be either offered in the sitemap or explicitly disallowed —
    // if this fails, add the new route to one of the two lists.
    it('accounts for every addressable page under pages/', () => {
        const unaccountedFor = crawlableRoutes().filter(
            (route) =>
                !STATIC_SITEMAP_PATHS.includes(route) &&
                !DISALLOWED_CRAWL_PATHS.some((disallowed) => route.startsWith(disallowed))
        );
        expect(unaccountedFor).toEqual([]);
    });

    it('the drift guard actually finds the site\'s pages', () => {
        // Guards the guard: a broken directory walk would make the check above
        // pass vacuously.
        expect(crawlableRoutes()).toContain('/');
        expect(crawlableRoutes()).toContain('/news');
        expect(crawlableRoutes()).toContain('/dev');
    });
});

describe('sitemapXml', () => {
    it('renders a well-formed urlset with one absolute loc per path', () => {
        expect(sitemapXml(BASE_URL, ['/', '/about'])).toBe(
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            '    <url>\n        <loc>https://dansplugins.com/</loc>\n    </url>\n' +
            '    <url>\n        <loc>https://dansplugins.com/about</loc>\n    </url>\n' +
            '</urlset>\n'
        );
    });

    it('does not double up slashes when the base URL has a trailing slash', () => {
        expect(sitemapXml('https://dansplugins.com/', ['/news'])).toContain(
            '<loc>https://dansplugins.com/news</loc>'
        );
    });

    it('escapes XML-reserved characters in a URL', () => {
        expect(sitemapXml(BASE_URL, ['/news?a=1&b=2'])).toContain(
            '<loc>https://dansplugins.com/news?a=1&amp;b=2</loc>'
        );
    });

    it('still renders a valid empty urlset when given no paths', () => {
        expect(sitemapXml(BASE_URL, [])).toBe(
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            '</urlset>\n'
        );
    });

    it('lists every static path', () => {
        const xml = sitemapXml(BASE_URL, STATIC_SITEMAP_PATHS);
        STATIC_SITEMAP_PATHS.forEach((path) => {
            expect(xml).toContain(`<loc>${path === '/' ? `${BASE_URL}/` : `${BASE_URL}${path}`}</loc>`);
        });
    });
});

describe('guideSitemapPaths', () => {
    it('maps plugin ids onto their on-site guide routes', () => {
        expect(guideSitemapPaths(['medieval-factions', 'fiefs']))
            .toEqual(['/guides/medieval-factions', '/guides/fiefs']);
    });

    it('returns nothing when there are no plugins', () => {
        expect(guideSitemapPaths([])).toEqual([]);
    });

    it('percent-encodes an id so the advertised URL still resolves to the route', () => {
        expect(guideSitemapPaths(['a b', 'a/b'])).toEqual(['/guides/a%20b', '/guides/a%2Fb']);
    });
});

describe('resourceSitemapPaths', () => {
    it('maps plugin ids onto their on-site resource routes', () => {
        expect(resourceSitemapPaths(['medieval-factions', 'fiefs']))
            .toEqual(['/resources/medieval-factions', '/resources/fiefs']);
    });

    it('returns nothing when there are no plugins', () => {
        expect(resourceSitemapPaths([])).toEqual([]);
    });

    it('percent-encodes an id so the advertised URL still resolves to the route', () => {
        expect(resourceSitemapPaths(['a b', 'a/b'])).toEqual(['/resources/a%20b', '/resources/a%2Fb']);
    });

    it('advertises a resource page separately from that plugin\'s guide page', () => {
        // The two are different documents about the same plugin; listing only one
        // would leave the other findable solely by following links.
        expect(resourceSitemapPaths(['fiefs'])).not.toEqual(guideSitemapPaths(['fiefs']));
    });
});

describe('robotsTxt', () => {
    it('allows crawling and points at the absolute sitemap URL', () => {
        expect(robotsTxt(BASE_URL)).toBe(
            'User-agent: *\n' +
            'Allow: /\n' +
            'Disallow: /account\n' +
            'Disallow: /dev\n' +
            'Disallow: /api/\n' +
            '\n' +
            'Sitemap: https://dansplugins.com/sitemap.xml\n'
        );
    });

    it('does not double up slashes when the base URL has a trailing slash', () => {
        expect(robotsTxt('https://dansplugins.com/')).toContain(
            'Sitemap: https://dansplugins.com/sitemap.xml'
        );
    });

    it('works with the local development default', () => {
        expect(robotsTxt('http://localhost:3000')).toContain(
            'Sitemap: http://localhost:3000/sitemap.xml'
        );
    });

    it('disallows every route listed as off-limits', () => {
        const robots = robotsTxt(BASE_URL);
        DISALLOWED_CRAWL_PATHS.forEach((path) => {
            expect(robots).toContain(`Disallow: ${path}`);
        });
    });
});

describe('SITEMAP_ROUTE', () => {
    it('matches the route pages/sitemap.xml.ts is served from', () => {
        expect(SITEMAP_ROUTE).toBe('/sitemap.xml');
    });
});
