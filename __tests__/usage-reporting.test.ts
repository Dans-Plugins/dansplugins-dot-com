// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import pkg from '../package.json';
import { TraceClient } from '../utils/trace-client';
import {
    DEFAULT_ENDPOINT,
    DETAILS_URL,
    PROGRAM_NAME,
    VERSION,
    createUsageReporting,
    disabledReason,
    installIdFile,
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

describe('the fleet-wide opt-outs come from trace-client.ts', () => {
    it('agrees with TraceClient.environmentOptsOut for every value', () => {
        const values = [undefined, '', ' ', 'on', 'off', ' OFF ', 'false', '0', 'no', '1', 'true', 'yes', 'YES', 'maybe'];
        for (const trace of values) {
            for (const dnt of values) {
                const env = { USAGE_REPORTING_KEY: KEY, TRACE_USAGE_REPORTING: trace, DO_NOT_TRACK: dnt };
                const optsOut = TraceClient.environmentOptsOut({ TRACE_USAGE_REPORTING: trace, DO_NOT_TRACK: dnt });
                expect(disabledReason(env), `${trace}/${dnt}`).toBe(optsOut ? 'environment' : null);
            }
        }
    });

    it('reads only the env it is given, never process.env', () => {
        vi.stubEnv('DO_NOT_TRACK', '1');
        vi.stubEnv('TRACE_USAGE_REPORTING', 'off');
        try {
            expect(disabledReason({ USAGE_REPORTING_KEY: KEY })).toBeNull();
            const client = createUsageReporting({ USAGE_REPORTING_KEY: KEY }, { fetch: okFetch(), log: () => undefined });
            expect(client.enabled).toBe(true);
            expect(client.disabledReason).toBeNull();
        } finally {
            vi.unstubAllEnvs();
        }
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

    // compose.yml passes every variable through as `${VAR:-}`, so an unset one arrives as ''.
    it('treats the empty values compose.yml passes through as unset', async () => {
        const empty = {
            USAGE_REPORTING_ENABLED: '',
            USAGE_REPORTING_ENDPOINT: '',
            TRACE_USAGE_REPORTING: '',
            DO_NOT_TRACK: '',
        };
        expect(disabledReason({ ...empty, USAGE_REPORTING_KEY: '' })).toBe('no key');

        const fetch = okFetch();
        const client = createUsageReporting({ ...empty, USAGE_REPORTING_KEY: KEY }, { fetch, log: () => undefined });
        expect(client.enabled).toBe(true);
        await client.report('page-view', { tags: pageViewTags('/') });
        expect(fetch.mock.calls[0][0]).toBe(DEFAULT_ENDPOINT + '/api/metrics');
    });
});

describe('pageViewTags', () => {
    it('carries the page and nothing else; the client adds the version', () => {
        expect(pageViewTags('/about')).toEqual({ page: '/about' });
        expect(VERSION).toBe(pkg.version);
    });
});

describe('the installation ID', () => {
    function sentTags(fetch: ReturnType<typeof okFetch>): Record<string, string> {
        return JSON.parse((fetch.mock.calls[0] as [string, RequestInit])[1].body as string).tags;
    }

    it('lives in <data dir>/<program>/trace-install-id', () => {
        expect(installIdFile({ XDG_DATA_HOME: '/data/' })).toBe(`/data/${PROGRAM_NAME}/trace-install-id`);
        expect(installIdFile({ HOME: '/home/app' })).toBe(`/home/app/.local/share/${PROGRAM_NAME}/trace-install-id`);
        expect(installIdFile({ XDG_DATA_HOME: ' ', HOME: '' })).toBeNull();
        expect(installIdFile({})).toBeNull();
    });

    it('is TRACE_INSTALL_ID when set, sent as the tag install', async () => {
        const fetch = okFetch();
        const client = createUsageReporting(
            { USAGE_REPORTING_KEY: KEY, TRACE_INSTALL_ID: ' pinned-id ', XDG_DATA_HOME: '/nonexistent' },
            { fetch, log: () => undefined },
        );
        expect(client.installId).toBe('pinned-id');
        await client.report('page-view', { tags: pageViewTags('/') });
        expect(sentTags(fetch)).toEqual({ page: '/', version: pkg.version, install: 'pinned-id' });
    });

    it('otherwise comes from the file, or from memory where node:fs is out of reach', async () => {
        const dataHome = mkdtempSync(join(tmpdir(), 'install-id-'));
        const fetch = okFetch();
        const client = createUsageReporting(
            { USAGE_REPORTING_KEY: KEY, XDG_DATA_HOME: dataHome },
            { fetch, log: () => undefined },
        );
        expect(client.installId).toMatch(/^[0-9a-f-]{36}$/);
        await client.report('page-view', { tags: pageViewTags('/') });
        expect(sentTags(fetch).install).toBe(client.installId);
        const file = join(dataHome, PROGRAM_NAME, 'trace-install-id');
        // process.getBuiltinModule arrived in Node 20.16 / 22.3; before that
        // (and in the Edge runtime) the client keeps the ID in memory only.
        const hasFs = typeof (process as { getBuiltinModule?: unknown }).getBuiltinModule === 'function';
        expect(existsSync(file)).toBe(hasFs);
        if (hasFs) expect(readFileSync(file, 'utf8').trim()).toBe(client.installId);
    });

    it('is never made, read or written when reporting is off', () => {
        const dataHome = mkdtempSync(join(tmpdir(), 'install-id-off-'));
        for (const env of [
            { USAGE_REPORTING_KEY: KEY, XDG_DATA_HOME: dataHome, TRACE_USAGE_REPORTING: 'off' },
            { USAGE_REPORTING_KEY: KEY, XDG_DATA_HOME: dataHome, DO_NOT_TRACK: '1' },
            { USAGE_REPORTING_KEY: KEY, XDG_DATA_HOME: dataHome, USAGE_REPORTING_ENABLED: 'false' },
            { XDG_DATA_HOME: dataHome, TRACE_INSTALL_ID: 'pinned-id' },
        ]) {
            expect(createUsageReporting(env, { log: () => undefined }).installId).toBeNull();
        }
        expect(existsSync(join(dataHome, PROGRAM_NAME))).toBe(false);
    });
});
