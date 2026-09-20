import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    MIN_REVIEWS_FOR_RATING,
    SPIGOT_CACHE_TTL_MS,
    clearSpigotListingCache,
    formatTestedVersions,
    getSpigotListing,
    getSpigotListingsWithRateLimit,
    shownRating,
    spigotResourceId,
    spigotReviewsUrl
} from '../utils/spigot';

// Build a minimal fetch Response stub for the Spiget resource endpoint.
const stubFetch = (response: Partial<Response>) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));
};

const resourceWith = (testedVersions: unknown, extra: Record<string, unknown> = {}) =>
    ({ ok: true, json: async () => ({ id: 79941, testedVersions, ...extra }) });
const listing = (testedVersions: string[]) => ({ testedVersions, rating: null, downloads: null });

beforeEach(() => {
    clearSpigotListingCache();
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

describe('getSpigotListing', () => {
    it('returns the tested versions, rating and downloads Spiget gives, asking only for those fields', async () => {
        stubFetch(resourceWith(['1.18', '1.19', '1.20'], { rating: { count: 45, average: 4.7 }, downloads: 63788 }));
        expect(await getSpigotListing('96724')).toEqual({
            testedVersions: ['1.18', '1.19', '1.20'],
            rating: { average: 4.7, count: 45 },
            downloads: 63788
        });
        const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(url).toBe('https://api.spiget.org/v2/resources/96724?fields=testedVersions,rating,downloads');
    });

    it('drops tested-version entries that are not non-empty strings', async () => {
        stubFetch(resourceWith(['1.21', 7, '', null]));
        expect((await getSpigotListing('1'))?.testedVersions).toEqual(['1.21']);
    });

    it('reads a missing or malformed rating or download count as null, and missing versions as none', async () => {
        stubFetch({ ok: true, json: async () => ({ id: 1, rating: { count: 'many' }, downloads: '5' }) });
        expect(await getSpigotListing('1')).toEqual({ testedVersions: [], rating: null, downloads: null });
    });

    it('keeps a zero-review rating as figures, so the threshold decides rather than absence', async () => {
        stubFetch(resourceWith([], { rating: { count: 0, average: 0 } }));
        expect((await getSpigotListing('1'))?.rating).toEqual({ average: 0, count: 0 });
    });

    it('returns undefined on a non-OK response, a non-object body, or a rejected fetch', async () => {
        stubFetch({ ok: false, status: 404, statusText: 'Not Found' });
        expect(await getSpigotListing('1')).toBeUndefined();
        clearSpigotListingCache();
        stubFetch({ ok: true, json: async () => null });
        expect(await getSpigotListing('1')).toBeUndefined();
        clearSpigotListingCache();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
        expect(await getSpigotListing('1')).toBeUndefined();
    });

    it('bounds every Spiget request with an abort signal', async () => {
        stubFetch(resourceWith(['1.21']));
        await getSpigotListing('1');
        const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('serves a cached list without asking Spiget again inside the TTL', async () => {
        stubFetch(resourceWith(['1.21']));
        expect(await getSpigotListing('1')).toEqual(listing(['1.21']));
        expect(await getSpigotListing('1')).toEqual(listing(['1.21']));
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('keeps the last good list when Spiget fails after the TTL has passed', async () => {
        vi.useFakeTimers();
        try {
            stubFetch(resourceWith(['1.21']));
            expect(await getSpigotListing('1')).toEqual(listing(['1.21']));
            vi.advanceTimersByTime(SPIGOT_CACHE_TTL_MS + 1);
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
            expect(await getSpigotListing('1')).toEqual(listing(['1.21']));
            expect(fetch).toHaveBeenCalledTimes(1);
            // The failure re-stamped the entry, so the next render is served
            // from cache instead of paying the timeout again.
            expect(await getSpigotListing('1')).toEqual(listing(['1.21']));
            expect(fetch).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('getSpigotListingsWithRateLimit', () => {
    it('maps every id, keeping undefined for the ones that failed', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            if (url.includes('/resources/1?')) {
                return Promise.resolve(resourceWith(['1.20']) as unknown as Response);
            }
            return Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' } as Response);
        }));
        const result = await getSpigotListingsWithRateLimit(['1', '2'], 1);
        expect(result.get('1')).toEqual(listing(['1.20']));
        expect(result.get('2')).toBeUndefined();
    });

    it('makes no request for an empty list', async () => {
        vi.stubGlobal('fetch', vi.fn());
        expect((await getSpigotListingsWithRateLimit([])).size).toBe(0);
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

describe('shownRating', () => {
    it('withholds a rating below the review threshold, and one that is absent', () => {
        expect(shownRating({ average: 5, count: MIN_REVIEWS_FOR_RATING - 1 })).toBeNull();
        expect(shownRating({ average: 0, count: 0 })).toBeNull();
        expect(shownRating(null)).toBeNull();
        expect(shownRating(undefined)).toBeNull();
    });

    it('shows a rating at the threshold, rounded to one decimal as SpigotMC displays it', () => {
        expect(shownRating({ average: 4.666, count: MIN_REVIEWS_FOR_RATING })).toEqual({ average: 4.7, count: MIN_REVIEWS_FOR_RATING });
        expect(shownRating({ average: 5, count: 45 })).toEqual({ average: 5, count: 45 });
    });
});

describe('spigotReviewsUrl', () => {
    it('points at the reviews tab whether or not the listing link has a trailing slash', () => {
        expect(spigotReviewsUrl('https://www.spigotmc.org/resources/medieval-factions.79941/'))
            .toBe('https://www.spigotmc.org/resources/medieval-factions.79941/reviews');
        expect(spigotReviewsUrl('https://www.spigotmc.org/resources/medieval-factions.79941'))
            .toBe('https://www.spigotmc.org/resources/medieval-factions.79941/reviews');
    });
});
