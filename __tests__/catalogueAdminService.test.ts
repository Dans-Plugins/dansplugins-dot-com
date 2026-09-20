import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    EMPTY_UPSERT,
    createPlugin,
    fetchIsAdmin,
    parseTags,
    updatePlugin,
    upsertFrom,
} from '../services/catalogueAdminService';
import {API_CATALOGUE} from './fixtures/catalogue';

const UPSERT = {
    slug: 'new-plugin', title: 'New Plugin', description: 'Does a thing.',
    githubUrl: 'https://github.com/Dans-Plugins/New-Plugin', spigotmcUrl: '', bstatsId: '', iconPath: '', tags: ['survival'],
};

const savedRow = {...API_CATALOGUE[0], slug: 'new-plugin', title: 'New Plugin', tags: ['survival']};

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('parseTags', () => {
    it('splits on commas, trims, lower-cases, drops blanks and duplicates, keeps order', () => {
        expect(parseTags(' medieval, Factions,, factions , ')).toEqual(['medieval', 'factions']);
        expect(parseTags('')).toEqual([]);
    });
});

describe('upsertFrom', () => {
    it('spells an absent optional as "", the way the form holds it', () => {
        expect(upsertFrom({
            id: 'medieval-cookery', title: 'Medieval Cookery', description: 'Cooking.', githubLink: 'https://github.com/x/y',
            spigotmcLink: null, bStatsId: null, icon: null, tags: ['recipes'],
        })).toEqual({
            slug: 'medieval-cookery', title: 'Medieval Cookery', description: 'Cooking.', githubUrl: 'https://github.com/x/y',
            spigotmcUrl: '', bstatsId: '', iconPath: '', tags: ['recipes'],
        });
        expect(EMPTY_UPSERT.tags).toEqual([]);
    });
});

describe('fetchIsAdmin', () => {
    it('reads the admin flag off /profile/me, sending the token', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => ({username: 'a', admin: true})} as Response);
        vi.stubGlobal('fetch', fetchMock);
        expect(await fetchIsAdmin('tok')).toBe(true);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/profile\/me$/);
        expect(init.headers.Authorization).toBe('Bearer tok');
    });

    it('is false for a profile without the flag (an older API), and null when the call fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => ({username: 'a'})} as Response));
        expect(await fetchIsAdmin('tok')).toBe(false);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 401} as Response));
        expect(await fetchIsAdmin('tok')).toBeNull();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
        expect(await fetchIsAdmin('tok')).toBeNull();
    });
});

describe('createPlugin / updatePlugin', () => {
    it('POSTs the body with the token and maps the saved row back to the page shape', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => savedRow} as Response);
        vi.stubGlobal('fetch', fetchMock);
        const result = await createPlugin('tok', UPSERT);
        expect(result).toEqual({ok: true, value: expect.objectContaining({id: 'new-plugin', title: 'New Plugin', tags: ['survival']})});
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/plugins$/);
        expect(init.method).toBe('POST');
        expect(init.headers.Authorization).toBe('Bearer tok');
        expect(JSON.parse(init.body)).toEqual(UPSERT);
    });

    it('PUTs to the slug in the path, percent-encoded', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => savedRow} as Response);
        vi.stubGlobal('fetch', fetchMock);
        await updatePlugin('tok', 'new plugin', UPSERT);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/plugins\/new%20plugin$/);
        expect(init.method).toBe('PUT');
    });

    it('turns a validation problem into field errors', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false, status: 400,
            json: async () => ({detail: 'Validation failed', errors: {slug: 'slug must be lower-case words joined by hyphens'}}),
        } as Response));
        expect(await createPlugin('tok', UPSERT)).toEqual({
            ok: false, message: 'Some fields need attention.',
            fieldErrors: {slug: 'slug must be lower-case words joined by hyphens'},
        });
    });

    it('uses the API\'s detail when it has one, and a status-specific message otherwise', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 409, json: async () => ({detail: "A plugin with slug 'x' already exists"})} as Response));
        expect(await createPlugin('tok', UPSERT)).toMatchObject({ok: false, message: "A plugin with slug 'x' already exists"});
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 403, json: async () => { throw new Error('no body'); }} as unknown as Response));
        expect(await updatePlugin('tok', 'x', UPSERT)).toEqual({ok: false, message: 'Only an admin can edit the catalogue.'});
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 401, json: async () => ({})} as Response));
        expect(await updatePlugin('tok', 'x', UPSERT)).toMatchObject({ok: false, message: 'Your session has expired. Please sign in again.'});
    });

    it('reports an unreachable API without throwing', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
        expect(await createPlugin('tok', UPSERT)).toEqual({ok: false, message: 'Could not reach the API.'});
    });
});
