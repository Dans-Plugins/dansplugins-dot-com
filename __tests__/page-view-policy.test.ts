// @vitest-environment node
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    NORMALISED_ROUTES,
    PAGE_ROUTES,
    isKnownRoute,
    isPagePath,
    isPrefetch,
    pageOf,
    routePattern,
    shouldReportPageView,
    wantsHtml,
} from '../utils/page-view-policy';

const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const HTML_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

function headers(values: Record<string, string>) {
    const map = new Map(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]));
    return { get: (name: string) => map.get(name.toLowerCase()) ?? null };
}

function browserRequest(pathname: string, extra: Record<string, string> = {}, method = 'GET') {
    return { method, pathname, headers: headers({ 'user-agent': BROWSER, accept: HTML_ACCEPT, ...extra }) };
}

// Every route pages/ serves, derived the way Next.js derives them, minus the
// framework files and the error pages -- the list PAGE_ROUTES must equal.
function routesFromPagesDirectory(): string[] {
    const pagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'pages');
    const routes: string[] = [];
    const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
            const full = join(dir, name);
            if (statSync(full).isDirectory()) {
                walk(full);
                continue;
            }
            if (!/\.(tsx|ts|jsx|js)$/.test(name)) continue;
            const route = '/' + relative(pagesDir, full).replace(/\\/g, '/').replace(/\.(tsx|ts|jsx|js)$/, '');
            if (route.startsWith('/api/') || /^\/_(app|document|error)$/.test(route)) continue;
            if (route === '/404' || route === '/500') continue;
            // robots.txt.ts and the like: generated files, not pages.
            if (/\.[A-Za-z0-9]+$/.test(route)) continue;
            routes.push(route.replace(/\/index$/, '') || '/');
        }
    };
    walk(pagesDir);
    return routes.sort();
}

describe('PAGE_ROUTES', () => {
    it('lists exactly the page routes under pages/', () => {
        expect([...PAGE_ROUTES].sort()).toEqual(routesFromPagesDirectory());
    });
});

describe('routePattern', () => {
    it('matches static, dynamic and catch-all segments', () => {
        expect(routePattern('/').test('/')).toBe(true);
        expect(routePattern('/about').test('/about')).toBe(true);
        expect(routePattern('/about').test('/about/team')).toBe(false);
        expect(routePattern('/u/[name]').test('/u/dan')).toBe(true);
        expect(routePattern('/u/[name]').test('/u')).toBe(false);
        expect(routePattern('/u/[name]').test('/u/dan/extra')).toBe(false);
        expect(routePattern('/docs/[...slug]').test('/docs/a/b')).toBe(true);
        expect(routePattern('/docs/[...slug]').test('/docs')).toBe(false);
        expect(routePattern('/docs/[[...slug]]').test('/docs')).toBe(true);
    });
});

describe('isKnownRoute', () => {
    it('accepts served routes and rejects paths that render the 404 page', () => {
        expect(isKnownRoute('/')).toBe(true);
        expect(isKnownRoute('/wp-login')).toBe(false);
        expect(isKnownRoute('/no-such-page')).toBe(false);
    });
});

describe('isPagePath', () => {
    it('skips assets, API routes and machinery', () => {
        for (const path of ['/_next/static/chunks/main.js', '/api/visits', '/api', '/static/x', '/assets/a',
            '/images/logo', '/fonts/x', '/actuator/health', '/error', '/favicon.ico', '/robots.txt',
            '/sitemap.xml', '/og-image.png']) {
            expect(isPagePath(path), path).toBe(false);
        }
    });

    it('keeps page paths, including ones that merely start like a skipped prefix', () => {
        for (const path of ['/', '/about', '/apiary', '/errors-and-omissions']) {
            expect(isPagePath(path), path).toBe(true);
        }
    });
});

describe('pageOf', () => {
    it('records the path only: no query, no fragment, no trailing slash, at most 200 characters', () => {
        expect(pageOf('/')).toBe('/');
        expect(pageOf('/about/')).toBe('/about');
        expect(pageOf('/about?utm_source=x#top')).toBe('/about');
        expect(pageOf('/' + 'a'.repeat(300))).toHaveLength(200);
    });

    it('records the route, not the path, for routes that would name a person', () => {
        expect(pageOf('/u/some-player', ['/u/[username]'])).toBe('/u/[username]');
        expect(pageOf('/u/some-player/?tab=likes', ['/u/[username]'])).toBe('/u/[username]');
        expect(pageOf('/about', ['/u/[username]'])).toBe('/about');
    });

    it('only normalises routes the site serves', () => {
        for (const route of NORMALISED_ROUTES) {
            expect(PAGE_ROUTES).toContain(route);
        }
    });
});

describe('wantsHtml and isPrefetch', () => {
    it('recognises a document request', () => {
        expect(wantsHtml(headers({ accept: HTML_ACCEPT }))).toBe(true);
        expect(wantsHtml(headers({ accept: 'application/json' }))).toBe(false);
        expect(wantsHtml(headers({}))).toBe(false);
    });

    it('recognises router prefetches, data fetches and browser prefetches', () => {
        expect(isPrefetch(headers({ 'x-nextjs-data': '1' }))).toBe(true);
        expect(isPrefetch(headers({ 'next-router-prefetch': '1' }))).toBe(true);
        expect(isPrefetch(headers({ 'x-middleware-prefetch': '1' }))).toBe(true);
        expect(isPrefetch(headers({ rsc: '1' }))).toBe(true);
        expect(isPrefetch(headers({ purpose: 'prefetch' }))).toBe(true);
        expect(isPrefetch(headers({ 'sec-purpose': 'prefetch;prerender' }))).toBe(true);
        expect(isPrefetch(headers({ accept: HTML_ACCEPT }))).toBe(false);
    });
});

describe('shouldReportPageView', () => {
    it('reports a browser opening a page', () => {
        expect(shouldReportPageView(browserRequest('/'))).toBe(true);
        expect(shouldReportPageView(browserRequest('/?ref=home'))).toBe(true);
    });

    it('skips anything but GET', () => {
        expect(shouldReportPageView(browserRequest('/', {}, 'POST'))).toBe(false);
        expect(shouldReportPageView(browserRequest('/', {}, 'HEAD'))).toBe(false);
    });

    it('skips unknown routes, assets and non-document requests', () => {
        expect(shouldReportPageView(browserRequest('/no-such-page'))).toBe(false);
        expect(shouldReportPageView(browserRequest('/favicon.ico'))).toBe(false);
        expect(shouldReportPageView(browserRequest('/', { accept: '*/*' }))).toBe(false);
        expect(shouldReportPageView(browserRequest('/', { 'x-nextjs-data': '1' }))).toBe(false);
    });

    it('skips crawlers, monitors, scripts and requests with no user agent', () => {
        for (const agent of ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'curl/8.5.0',
            'UptimeRobot/2.0', 'python-requests/2.31', 'Mozilla/5.0 (compatible; Discordbot/2.0)', '']) {
            expect(shouldReportPageView(browserRequest('/', { 'user-agent': agent })), agent).toBe(false);
        }
    });
});
