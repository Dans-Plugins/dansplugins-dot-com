// @vitest-environment node
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import pkg from '../package.json';
import { reportPageView } from '../utils/page-view-reporting';
import { TraceClient } from '../utils/trace-client';
import { PROGRAM_NAME, createUsageReporting } from '../utils/usage-reporting';

const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';
const HTML_ACCEPT = 'text/html,application/xhtml+xml,*/*;q=0.8';

function request(pathname: string, extra: Record<string, string> = {}, method = 'GET') {
    const headers = new Headers({ 'user-agent': BROWSER, accept: HTML_ACCEPT, cookie: 'session=abc', referer: 'https://example.org/', ...extra });
    return { method, nextUrl: { pathname }, headers };
}

function event() {
    const pending: Promise<unknown>[] = [];
    return { pending, waitUntil: vi.fn((promise: Promise<unknown>) => { pending.push(promise); }) };
}

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
    while (closers.length) await closers.pop()!();
});

// A loopback stand-in for the trace server that records what it receives.
async function stubTrace() {
    const received: { url?: string; authorization?: string; body: unknown }[] = [];
    const server = createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
            received.push({ url: req.url, authorization: req.headers.authorization, body: JSON.parse(body) });
            res.writeHead(201).end();
        });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    closers.push(() => new Promise<void>((resolve) => server.close(() => resolve())));
    return { received, endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

describe('reportPageView', () => {
    it('sends one page-view with the path and version only, and hands it to waitUntil', async () => {
        const trace = await stubTrace();
        const client = createUsageReporting(
            { USAGE_REPORTING_KEY: 'test-key', USAGE_REPORTING_ENDPOINT: trace.endpoint },
            { log: () => undefined },
        );
        const ev = event();
        expect(reportPageView(request('/', {}, 'GET'), ev, client)).toBe(true);
        expect(ev.waitUntil).toHaveBeenCalledOnce();
        await Promise.all(ev.pending);
        expect(trace.received).toEqual([{
            url: '/api/metrics',
            authorization: 'Bearer test-key',
            body: { application: PROGRAM_NAME, name: 'page-view', tags: { page: '/', version: pkg.version } },
        }]);
        // Nothing about the visitor travels: no cookie, referrer, user agent or query.
        const sent = JSON.stringify(trace.received);
        for (const leaked of ['session=abc', 'example.org', 'Firefox']) {
            expect(sent).not.toContain(leaked);
        }
    });

    it('does nothing for requests the policy skips', () => {
        const fetch = vi.fn();
        const client = createUsageReporting({ USAGE_REPORTING_KEY: 'k' }, { fetch, log: () => undefined });
        for (const req of [
            request('/', {}, 'POST'),
            request('/favicon.ico'),
            request('/no-such-page'),
            request('/', { 'user-agent': 'Googlebot/2.1' }),
            request('/', { 'x-nextjs-data': '1' }),
        ]) {
            const ev = event();
            expect(reportPageView(req, ev, client)).toBe(false);
            expect(ev.waitUntil).not.toHaveBeenCalled();
        }
        expect(fetch).not.toHaveBeenCalled();
    });

    it('does not even look at the request when reporting is off', () => {
        const ev = event();
        const headers = { get: vi.fn(() => null) };
        expect(reportPageView({ method: 'GET', nextUrl: { pathname: '/' }, headers }, ev, TraceClient.disabled())).toBe(false);
        expect(headers.get).not.toHaveBeenCalled();
        expect(ev.waitUntil).not.toHaveBeenCalled();
    });
});
