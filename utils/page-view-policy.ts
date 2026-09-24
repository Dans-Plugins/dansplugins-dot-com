// Decides, from a request's shape alone, whether it is a page view worth
// reporting to trace, and what path is recorded for it. Pure and runtime-
// agnostic, so middleware.ts stays thin and the rules are unit-tested directly.
//
// A page view is one HTML page served to a person (trace decision 0002,
// https://github.com/Stephenson-Software/trace/blob/main/docs/decisions/0002-website-page-views.md):
// a GET for a document, on a route this site actually serves, from a browser
// rather than a crawler, a monitor or a script, and not a prefetch or a
// client-side data fetch. The user agent is consulted for the bot check here
// and nowhere else; nothing about it is reported.
import { isBot, pagePath } from './trace-client';

/**
 * Every page route under pages/, in Next.js route syntax. Middleware cannot see
 * the response status, so a request is only counted when its path matches one
 * of these: a mistyped URL or a scanner probing `/wp-login` renders the 404
 * page and is left out, as it would be if the status were known. The error
 * pages themselves (404, 500) are not listed. __tests__/page-view-policy.test.ts
 * fails when this list and the pages/ directory disagree.
 */
export const PAGE_ROUTES: readonly string[] = [
    '/',
    '/about',
    '/account',
    '/account/reset',
    '/admin/plugins',
    '/commissions',
    '/dev',
    '/guides',
    '/guides/[id]',
    '/leaderboard',
    '/news',
    '/resources/[slug]',
    '/roadmap',
    '/u/[username]',
];

/**
 * Dynamic routes whose variable segment would name a person (a profile's
 * username, say). For these the route itself (`/u/[username]`) is recorded
 * instead of the path, as decision 0002 asks of any site that puts personal
 * names in URLs. Each must also be in PAGE_ROUTES.
 */
export const NORMALISED_ROUTES: readonly string[] = ['/u/[username]'];

/** Path prefixes that are machinery or assets rather than pages (decision 0002). */
const SKIPPED_PREFIXES = [
    '/_next', '/static', '/assets', '/images', '/img', '/fonts', '/api', '/actuator', '/error',
];

/** Headers the Next router or a browser sets on requests that are not a person opening a page. */
const PREFETCH_HEADERS = ['next-router-prefetch', 'x-middleware-prefetch', 'x-nextjs-data', 'rsc'];
const PURPOSE_HEADERS = ['purpose', 'sec-purpose', 'x-purpose', 'x-moz'];

/** The subset of a request the policy looks at. `headers` is a `Headers` or anything with the same `get`. */
export interface PageRequest {
    method: string;
    pathname: string;
    headers: { get(name: string): string | null | undefined };
}

export function routePattern(route: string): RegExp {
    if (route === '/') return /^\/$/;
    const segments = route.split('/').filter(Boolean).map((segment) => {
        if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) return '(?:/.*)?';
        if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return '/.+';
        if (/^\[[^\]]+\]$/.test(segment)) return '/[^/]+';
        return '/' + segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    return new RegExp('^' + segments.join('') + '$');
}

const ROUTE_PATTERNS = PAGE_ROUTES.map(routePattern);

/** Whether `path` (a request path cleaned by `pagePath`) is one of this site's page routes. */
export function isKnownRoute(path: string, patterns: readonly RegExp[] = ROUTE_PATTERNS): boolean {
    return patterns.some((pattern) => pattern.test(path));
}

/** Whether the path names a page rather than an asset, an API route or other machinery. */
export function isPagePath(path: string): boolean {
    if (typeof path !== 'string' || !path.startsWith('/')) return false;
    if (SKIPPED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'))) return false;
    // A last segment with a file extension is a file (favicon.ico, robots.txt, a hashed asset), not a page.
    const lastSegment = path.slice(path.lastIndexOf('/') + 1);
    return !/\.[A-Za-z0-9]+$/.test(lastSegment);
}

/** Whether the request is a prefetch (router or browser) or a client-side data fetch rather than a page load. */
export function isPrefetch(headers: PageRequest['headers']): boolean {
    if (PREFETCH_HEADERS.some((name) => Boolean(headers.get(name)))) return true;
    return PURPOSE_HEADERS.some((name) => /prefetch|preview|prerender/i.test(headers.get(name) ?? ''));
}

/** Whether the request asks for an HTML document, as a browser opening a page does. */
export function wantsHtml(headers: PageRequest['headers']): boolean {
    return /text\/html/i.test(headers.get('accept') ?? '');
}

/**
 * What is recorded for a page view: the path and nothing else (no query, no
 * fragment, no trailing slash, <= 200 chars), or the route for a path under
 * one of the NORMALISED_ROUTES.
 */
export function pageOf(pathname: string, normalised: readonly string[] = NORMALISED_ROUTES): string {
    const path = pagePath(pathname);
    const route = normalised.find((candidate) => routePattern(candidate).test(path));
    return route ?? path;
}

/** The decision: report this request as a page view, or not. */
export function shouldReportPageView(request: PageRequest): boolean {
    if (typeof request.method !== 'string' || request.method.toUpperCase() !== 'GET') return false;
    const path = pagePath(request.pathname);
    if (!isPagePath(path) || !isKnownRoute(path)) return false;
    if (!wantsHtml(request.headers) || isPrefetch(request.headers)) return false;
    return !isBot(request.headers.get('user-agent'));
}
