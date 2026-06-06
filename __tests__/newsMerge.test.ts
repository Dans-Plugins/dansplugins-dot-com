import { describe, expect, it } from 'vitest';
import { mergeNewsPosts, NewsPost } from '../utils/newsStorage';

const post = (id: string, date: string, source: NewsPost['source'] = 'direct'): NewsPost => ({
    id,
    title: `Post ${id}`,
    date,
    body: 'body',
    source,
    sourceUrl: null,
    author: null
});

describe('mergeNewsPosts', () => {
    it('combines local and remote posts newest-first', () => {
        const local = [post('a', '2026-06-01')];
        const remote = [post('discord-1', '2026-06-03', 'discord'), post('discord-2', '2026-05-30', 'discord')];
        const merged = mergeNewsPosts(local, remote);
        expect(merged.map((p) => p.id)).toEqual(['discord-1', 'a', 'discord-2']);
    });

    it('lets a local post win over a remote post with the same id', () => {
        const local = [{ ...post('shared', '2026-06-01'), title: 'Local wins' }];
        const remote = [{ ...post('shared', '2026-06-01', 'discord'), title: 'Remote loses' }];
        const merged = mergeNewsPosts(local, remote);
        expect(merged).toHaveLength(1);
        expect(merged[0].title).toBe('Local wins');
    });

    it('handles empty inputs on either side', () => {
        expect(mergeNewsPosts([], [])).toEqual([]);
        expect(mergeNewsPosts([post('a', '2026-06-01')], [])).toHaveLength(1);
        expect(mergeNewsPosts([], [post('discord-1', '2026-06-01', 'discord')])).toHaveLength(1);
    });
});
