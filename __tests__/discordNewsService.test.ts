import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiNewsPosts } from '../services/discordNewsService';

const stubFetch = (response: Partial<Response>) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));
};

const validApiPost = {
    id: 'discord-100',
    title: 'Server event',
    date: '2026-06-01',
    body: 'Join us this weekend.',
    source: 'discord',
    sourceUrl: 'https://discord.com/channels/1/2/100',
    author: 'Dan'
};

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('getApiNewsPosts', () => {
    it('maps a well-formed API response into NewsPost objects', async () => {
        stubFetch({ ok: true, json: async () => [validApiPost] });
        const posts = await getApiNewsPosts();
        expect(posts).toHaveLength(1);
        expect(posts[0]).toMatchObject({ id: 'discord-100', source: 'discord', author: 'Dan' });
    });

    it('returns an empty list on a non-ok response', async () => {
        stubFetch({ ok: false, status: 503, json: async () => ({}) });
        expect(await getApiNewsPosts()).toEqual([]);
    });

    it('returns an empty list when the payload is not an array', async () => {
        stubFetch({ ok: true, json: async () => ({ posts: [] }) });
        expect(await getApiNewsPosts()).toEqual([]);
    });

    it('drops malformed posts but keeps valid ones', async () => {
        stubFetch({ ok: true, json: async () => [validApiPost, { id: 'x' }, null] });
        const posts = await getApiNewsPosts();
        expect(posts).toHaveLength(1);
        expect(posts[0].id).toBe('discord-100');
    });

    it('returns an empty list when fetch rejects', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
        expect(await getApiNewsPosts()).toEqual([]);
    });
});
