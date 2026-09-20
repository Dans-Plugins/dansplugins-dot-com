import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    SPIGOT_CACHE_TTL_MS,
    clearTestedVersionsCache,
    formatTestedVersions,
    getTestedVersions,
    getTestedVersionsWithRateLimit,
    spigotResourceId
} from '../utils/spigot';

// Build a minimal fetch Response stub for the Spiget resource endpoint.
const stubFetch = (response: Partial<Response>) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));
};

const resourceWith = (testedVersions: unknown) => ({ ok: true, json: async () => ({ id: 79941, testedVersions }) });

beforeEach(() => {
    clearTestedVersionsCache();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('spigotResourceId', () => {
    it('reads the id off the end of a resource URL', () => {
        expect(spigotResourceId('https://www.spigotmc.org/resources/medieval-factions.79941/')).toBe('79941');
        expect(spigotResourceId('https://www.spigotmc.org/resources/medieval-factions.79941')).toBe('79941');
        expect(spigotResourceId('https://www.spigotmc.org/resources/medieval-factions.79941/?tab=reviews')).toBe('79941');
    });

    it('is undefined for the catalogue\'s "no SpigotMC page" spellings and for links without an id', () => {
        expect(spigotResourceId('')).toBeUndefined();
        expect(spigotResourceId(undefined)).toBeUndefined();
        expect(spigotResourceId(null)).toBeUndefined();
        expect(spigotResourceId('https://www.spigotmc.org/resources/')).toBeUndefined();
    });
});

describe('getTestedVersions', () => {
    it('returns the list Spiget gives, asking only for that field', async () => {
        stubFetch(resourceWith(['1.18', '1.19', '1.20']));
        expect(await getTestedVersions('96724')).toEqual(['1.18', '1.19', '1.20']);
        const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(url).toBe('https://api.spiget.org/v2/resources/96724?fields=testedVersions');
    });

    it('drops entries that are not non-empty strings', async () => {
        stubFetch(resourceWith(['1.21', 7, '', null]));
        expect(await getTestedVersions('1')).toEqual(['1.21']);
    });

    it('returns undefined on a non-OK response, a missing field, or a rejected fetch', async () => {
        stubFetch({ ok: false, status: 404, statusText: 'Not Found' });
        expect(await getTestedVersions('1')).toBeUndefined();
        clearTestedVersionsCache();
        stubFetch({ ok: true, json: async () => ({ id: 1 }) });
        expect(await getTestedVersions('1')).toBeUndefined();
        clearTestedVersionsCache();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
        expect(await getTestedVersions('1')).toBeUndefined();
    });

    it('bounds every Spiget request with an abort signal', async () => {
        stubFetch(resourceWith(['1.21']));
        await getTestedVersions('1');
        const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('serves a cached list without asking Spiget again inside the TTL', async () => {
        stubFetch(resourceWith(['1.21']));
        expect(await getTestedVersions('1')).toEqual(['1.21']);
        expect(await getTestedVersions('1')).toEqual(['1.21']);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('keeps the last good list when Spiget fails after the TTL has passed', async () => {
        vi.useFakeTimers();
        try {
            stubFetch(resourceWith(['1.21']));
            expect(await getTestedVersions('1')).toEqual(['1.21']);
            vi.advanceTimersByTime(SPIGOT_CACHE_TTL_MS + 1);
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
            expect(await getTestedVersions('1')).toEqual(['1.21']);
            expect(fetch).toHaveBeenCalledTimes(1);
            // The failure re-stamped the entry, so the next render is served
            // from cache instead of paying the timeout again.
            expect(await getTestedVersions('1')).toEqual(['1.21']);
            expect(fetch).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('getTestedVersionsWithRateLimit', () => {
    it('maps every id, keeping undefined for the ones that failed', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            if (url.includes('/resources/1?')) {
                return Promise.resolve(resourceWith(['1.20']) as unknown as Response);
            }
            return Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' } as Response);
        }));
        const result = await getTestedVersionsWithRateLimit(['1', '2'], 1);
        expect(result.get('1')).toEqual(['1.20']);
        expect(result.get('2')).toBeUndefined();
    });

    it('makes no request for an empty list', async () => {
        vi.stubGlobal('fetch', vi.fn());
        expect((await getTestedVersionsWithRateLimit([])).size).toBe(0);
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe('formatTestedVersions', () => {
    it('collapses an unbroken run into a range', () => {
        expect(formatTestedVersions(['1.18', '1.19', '1.20'])).toBe('1.18–1.20');
    });

    it('leaves a single version alone', () => {
        expect(formatTestedVersions(['1.21'])).toBe('1.21');
    });

    it('never bridges a gap', () => {
        expect(formatTestedVersions(['1.16', '1.21'])).toBe('1.16, 1.21');
        expect(formatTestedVersions(['1.16', '1.17', '1.19', '1.20'])).toBe('1.16–1.17, 1.19–1.20');
    });

    it('sorts numerically, so 1.9 comes before 1.10, and drops duplicates', () => {
        expect(formatTestedVersions(['1.10', '1.9', '1.10'])).toBe('1.9–1.10');
    });

    it('does not run across a major boundary', () => {
        expect(formatTestedVersions(['1.21', '26.1', '26.2'])).toBe('1.21, 26.1–26.2');
    });

    it('passes an unfamiliar spelling through rather than dropping it', () => {
        expect(formatTestedVersions(['1.20', '1.20.4-pre', ' '])).toBe('1.20, 1.20.4-pre');
    });
});
