import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    TRACE_CACHE_TTL_MS,
    clearTraceUsageCache,
    getProgramUsage,
    getUsageSummary,
    parseProgramUsage
} from '../utils/traceUsage';
import {liveProgramBody, summaryWithInstalls, usageWithDailyServers, usageWithInstalls, usageWithoutInstalls} from './fixtures/traceUsage';

const ok = (body: unknown) => ({ok: true, json: async () => body} as unknown as Response);
const status = (code: number, text: string) => ({ok: false, status: code, statusText: text} as Response);
const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    clearTraceUsageCache();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
});

describe('getProgramUsage', () => {
    it('reads the public per-program endpoint and returns its figures', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(usageWithInstalls())));
        expect(await getProgramUsage('MedievalFactions')).toEqual(usageWithInstalls());
        expect(fetchMock().mock.calls[0][0]).toBe('https://trace.danielstephenson.dev/api/public/programs/MedievalFactions');
    });

    it('keeps null installs as null rather than turning them into zeros', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(usageWithoutInstalls())));
        const usage = await getProgramUsage('MedievalFactions');
        expect(usage?.activeInstalls30d).toBeNull();
        expect(usage?.versions.map((v) => v.installs)).toEqual([null, null, null]);
    });

    it('can be pointed at another trace server', async () => {
        vi.stubEnv('TRACE_PUBLIC_URL', 'http://localhost:4010/');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(usageWithInstalls())));
        await getProgramUsage('Conquest-Recipes');
        expect(fetchMock().mock.calls[0][0]).toBe('http://localhost:4010/api/public/programs/Conquest-Recipes');
    });

    it('bounds the request with an abort signal', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(usageWithInstalls())));
        await getProgramUsage('MedievalFactions');
        expect(fetchMock().mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });

    it('resolves a 404 (endpoint not deployed yet) to undefined, quietly', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(status(404, 'Not Found')));
        expect(await getProgramUsage('MedievalFactions')).toBeUndefined();
        expect(console.error).not.toHaveBeenCalled();
    });

    it('resolves a server error, a timeout and a malformed body to undefined', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(status(502, 'Bad Gateway')));
        expect(await getProgramUsage('A')).toBeUndefined();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError')));
        expect(await getProgramUsage('B')).toBeUndefined();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({application: 'C', startups30d: 'lots'})));
        expect(await getProgramUsage('C')).toBeUndefined();
    });

    it('serves a cached answer inside the TTL without asking trace again', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(usageWithInstalls())));
        await getProgramUsage('MedievalFactions');
        await getProgramUsage('MedievalFactions');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('caches a miss too, so a down or not-yet-deployed trace is not asked on every render', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(status(404, 'Not Found')));
        expect(await getProgramUsage('MedievalFactions')).toBeUndefined();
        expect(await getProgramUsage('MedievalFactions')).toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('keeps the last good answer when trace fails after the TTL, then re-fetches once it is back', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(usageWithInstalls())));
        expect((await getProgramUsage('MedievalFactions'))?.activeInstalls30d).toBe(57);

        vi.advanceTimersByTime(TRACE_CACHE_TTL_MS + 1);
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
        expect((await getProgramUsage('MedievalFactions'))?.activeInstalls30d).toBe(57);

        vi.advanceTimersByTime(TRACE_CACHE_TTL_MS + 1);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({...usageWithInstalls(), activeInstalls30d: 60})));
        expect((await getProgramUsage('MedievalFactions'))?.activeInstalls30d).toBe(60);
    });
});

describe('parseProgramUsage', () => {
    it('rejects non-objects and missing arrays', () => {
        expect(parseProgramUsage(null)).toBeUndefined();
        expect(parseProgramUsage([])).toBeUndefined();
        expect(parseProgramUsage({...usageWithInstalls(), days: undefined})).toBeUndefined();
    });

    it('rejects a negative or non-numeric count anywhere', () => {
        expect(parseProgramUsage({...usageWithInstalls(), activeInstalls30d: -1})).toBeUndefined();
        expect(parseProgramUsage({...usageWithInstalls(), versions: [{version: '1', installs: null, startups: 'x'}]})).toBeUndefined();
        expect(parseProgramUsage({...usageWithInstalls(), days: [{day: '2026-10-01'}]})).toBeUndefined();
    });

    it('treats an absent activeInstalls30d as null', () => {
        const {activeInstalls30d: _omitted, ...rest} = usageWithInstalls();
        expect(parseProgramUsage(rest)?.activeInstalls30d).toBeNull();
    });

    it('keeps the uses trace serves today: startupUses30d and each day\'s startupUses', () => {
        const usage = parseProgramUsage(liveProgramBody());
        expect(usage?.startupUses30d).toBe(1626);
        expect(usage?.days).toEqual([
            {day: '2026-10-27', startups: 50, startupUses: 50},
            {day: '2026-10-28', startups: 48, startupUses: 48},
            {day: '2026-10-29', startups: 40, startupUses: 40},
        ]);
    });

    it('keeps a per-day server count when one is sent, null included', () => {
        expect(parseProgramUsage(usageWithDailyServers())?.days[0].installs).toBe(20);
        const body = {...usageWithInstalls(), days: [{day: '2026-10-01', startups: 2, installs: null}]};
        expect(parseProgramUsage(body)?.days).toEqual([{day: '2026-10-01', startups: 2, installs: null}]);
    });

    it('leaves out (never sets undefined) uses and servers that are absent or not counts', () => {
        const body = {
            ...usageWithInstalls(),
            startupUses30d: 'many',
            days: [{day: '2026-10-01', startups: 2}, {day: '2026-10-02', startups: 3, startupUses: -1, installs: 'x'}],
        };
        const usage = parseProgramUsage(body)!;
        expect('startupUses30d' in usage).toBe(false);
        expect(usage.days).toEqual([{day: '2026-10-01', startups: 2}, {day: '2026-10-02', startups: 3}]);
        expect(usage.days.every((d) => !('startupUses' in d) && !('installs' in d))).toBe(true);
    });
});

describe('getUsageSummary', () => {
    it('keeps each program name and last-seen time, and drops the raw event count', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok([
            {application: 'MedievalFactions', count: 9000, lastSeen: '2026-10-03T00:00:00Z'},
            {nonsense: true},
        ])));
        // A trace from before installs were summarised: no server count, not a zero.
        expect(await getUsageSummary()).toEqual([{application: 'MedievalFactions', lastSeen: '2026-10-03T00:00:00Z', installs: null}]);
        expect(fetchMock().mock.calls[0][0]).toBe('https://trace.danielstephenson.dev/api/public/summary');
    });

    it('keeps the distinct-server count and drops both raw event counts', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(summaryWithInstalls())));
        expect(await getUsageSummary()).toEqual([
            {application: 'MedievalFactions', lastSeen: '2026-10-03T14:00:00Z', installs: 31},
            {application: 'Fiefs', lastSeen: '2026-10-03T00:00:00Z', installs: 3},
            {application: 'Currencies', lastSeen: '2026-10-02T00:00:00Z', installs: null},
        ]);
    });

    it('treats a server count that is not a count as absent', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok([
            {application: 'A', installs: -1, lastSeen: null},
            {application: 'B', installs: '12', lastSeen: null},
        ])));
        expect((await getUsageSummary())?.map((r) => r.installs)).toEqual([null, null]);
    });

    it('resolves to undefined when trace cannot be reached, and caches that', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
        expect(await getUsageSummary()).toBeUndefined();
        expect(await getUsageSummary()).toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
