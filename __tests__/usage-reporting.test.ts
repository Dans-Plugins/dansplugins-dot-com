// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import pkg from '../package.json';
import {
    DEFAULT_ENDPOINT,
    DETAILS_URL,
    PROGRAM_NAME,
    VERSION,
    createUsageReporting,
    disabledReason,
    pageViewTags,
    startupLine,
} from '../utils/usage-reporting';

const KEY = 'test-key-not-a-real-one';

function okFetch() {
    return vi.fn(async (..._args: unknown[]) => new Response(null, { status: 201 }));
}

describe('disabledReason', () => {
    it('is on with a key and no opt-out', () => {
        expect(disabledReason({ USAGE_REPORTING_KEY: KEY })).toBeNull();
        expect(disabledReason({ USAGE_REPORTING_KEY: KEY, USAGE_REPORTING_ENABLED: 'true' })).toBeNull();
    });

    it('is off without a key', () => {
        expect(disabledReason({})).toBe('no key');
        expect(disabledReason({ USAGE_REPORTING_KEY: '   ' })).toBe('no key');
    });

    it('honours USAGE_REPORTING_ENABLED=false', () => {
        for (const value of ['false', 'FALSE', '0', 'no', 'off']) {
            expect(disabledReason({ USAGE_REPORTING_KEY: KEY, USAGE_REPORTING_ENABLED: value }), value)
                .toBe('USAGE_REPORTING_ENABLED');
        }
    });

    it('honours the fleet-wide environment opt-outs first', () => {
        for (const value of ['off', 'false', '0', 'no', 'OFF']) {
            expect(disabledReason({ USAGE_REPORTING_KEY: KEY, TRACE_USAGE_REPORTING: value }), value).toBe('environment');
        }
        for (const value of ['1', 'true', 'yes']) {
            expect(disabledReason({ USAGE_REPORTING_KEY: KEY, DO_NOT_TRACK: value }), value).toBe('environment');
        }
        expect(disabledReason({ DO_NOT_TRACK: '1', USAGE_REPORTING_ENABLED: 'false' })).toBe('environment');
        expect(disabledReason({ USAGE_REPORTING_KEY: KEY, DO_NOT_TRACK: '0' })).toBeNull();
        expect(disabledReason({ USAGE_REPORTING_KEY: KEY, TRACE_USAGE_REPORTING: 'on' })).toBeNull();
    });
});

describe('startupLine', () => {
    it('says what is sent, where, how to turn it off, and links the details', () => {
        const line = startupLine({ USAGE_REPORTING_KEY: KEY });
        expect(line).toContain('Usage reporting is on');
        expect(line).toContain(PROGRAM_NAME);
        expect(line).toContain(DEFAULT_ENDPOINT);
        expect(line).toContain('USAGE_REPORTING_ENABLED=false');
        expect(line).toContain('TRACE_USAGE_REPORTING=off');
        expect(line).toContain(DETAILS_URL);
        expect(line).not.toContain(KEY);
    });

    it('names the switch that turned reporting off', () => {
        expect(startupLine({ USAGE_REPORTING_KEY: KEY, DO_NOT_TRACK: '1' })).toBe('Usage reporting is off (environment).');
        expect(startupLine({ USAGE_REPORTING_KEY: KEY, USAGE_REPORTING_ENABLED: 'false' }))
            .toBe('Usage reporting is off (USAGE_REPORTING_ENABLED).');
    });

    it('is silent when there is no key', () => {
        expect(startupLine({})).toBeNull();
    });
});

describe('createUsageReporting', () => {
    it('sends nothing and logs nothing without a key', async () => {
        const fetch = okFetch();
        const log = vi.fn();
        const client = createUsageReporting({}, { fetch, log });
        expect(client.enabled).toBe(false);
        await client.report('page-view', { tags: pageViewTags('/') });
        expect(fetch).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalled();
    });

    it('sends nothing when opted out', async () => {
        const fetch = okFetch();
        for (const env of [
            { USAGE_REPORTING_KEY: KEY, USAGE_REPORTING_ENABLED: 'false' },
            { USAGE_REPORTING_KEY: KEY, TRACE_USAGE_REPORTING: 'off' },
            { USAGE_REPORTING_KEY: KEY, DO_NOT_TRACK: '1' },
        ]) {
            const client = createUsageReporting(env, { fetch, log: () => undefined });
            expect(client.enabled).toBe(false);
            await client.report('page-view', { tags: pageViewTags('/') });
        }
        expect(fetch).not.toHaveBeenCalled();
    });

    it('posts a page-view as this program, with the key, to the configured endpoint', async () => {
        const fetch = okFetch();
        const log = vi.fn();
        const client = createUsageReporting(
            { USAGE_REPORTING_KEY: KEY, USAGE_REPORTING_ENDPOINT: 'http://127.0.0.1:9/' },
            { fetch, log },
        );
        expect(client.enabled).toBe(true);
        expect(log).toHaveBeenCalledOnce();
        await client.report('page-view', { tags: pageViewTags('/') });
        expect(fetch).toHaveBeenCalledOnce();
        const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('http://127.0.0.1:9/api/metrics');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ' + KEY);
        expect(JSON.parse(init.body as string)).toEqual({
            application: PROGRAM_NAME,
            name: 'page-view',
            tags: { page: '/', version: pkg.version },
        });
    });

    it('defaults to the shared trace server', async () => {
        const fetch = okFetch();
        const client = createUsageReporting({ USAGE_REPORTING_KEY: KEY }, { fetch, log: () => undefined });
        await client.report('page-view', { tags: pageViewTags('/') });
        expect(fetch.mock.calls[0][0]).toBe(DEFAULT_ENDPOINT + '/api/metrics');
    });
});

describe('pageViewTags', () => {
    it('carries the page and the version and nothing else', () => {
        expect(pageViewTags('/about')).toEqual({ page: '/about', version: VERSION });
        expect(VERSION).toBe(pkg.version);
    });
});
