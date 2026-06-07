import fs from 'fs';
import path from 'path';
import {afterAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {getNewsPosts} from '../utils/newsStorage';

const NEWS_FILE = path.join(process.cwd(), 'data', 'news.json');

const removeNewsFile = () => {
    if (fs.existsSync(NEWS_FILE)) {
        fs.rmSync(NEWS_FILE);
    }
};

const writeRaw = (contents: string) => {
    fs.mkdirSync(path.dirname(NEWS_FILE), {recursive: true});
    fs.writeFileSync(NEWS_FILE, contents);
};

describe('newsStorage.getNewsPosts', () => {
    beforeEach(() => {
        removeNewsFile();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(removeNewsFile);

    it('seeds the file with default posts when it is absent', () => {
        const posts = getNewsPosts();
        expect(posts.length).toBeGreaterThan(0);
        expect(fs.existsSync(NEWS_FILE)).toBe(true);
    });

    it('returns posts newest-first', () => {
        writeRaw(JSON.stringify({
            posts: [
                {id: 'old', title: 'Old', date: '2026-01-01', body: 'x', source: 'direct'},
                {id: 'new', title: 'New', date: '2026-12-31', body: 'y', source: 'direct'}
            ]
        }));
        const posts = getNewsPosts();
        expect(posts.map((p) => p.id)).toEqual(['new', 'old']);
    });

    it('normalizes optional fields to null and defaults an unknown source to "direct"', () => {
        writeRaw(JSON.stringify({
            posts: [{id: 'a', title: 'A', date: '2026-02-02', body: 'b', source: 'bogus'}]
        }));
        const [post] = getNewsPosts();
        expect(post.source).toBe('direct');
        expect(post.sourceUrl).toBeNull();
        expect(post.author).toBeNull();
    });

    it('never returns a post with an undefined field (must be serializable)', () => {
        writeRaw(JSON.stringify({posts: [{id: 'a', title: 'A', date: '2026-02-02', body: 'b'}]}));
        const [post] = getNewsPosts();
        for (const value of Object.values(post)) {
            expect(value).not.toBeUndefined();
        }
    });

    it('drops malformed posts but keeps valid ones', () => {
        writeRaw(JSON.stringify({
            posts: [
                {id: 'good', title: 'Good', date: '2026-03-03', body: 'ok', source: 'direct'},
                {id: 'bad-missing-title', date: '2026-03-04', body: 'no title'}
            ]
        }));
        const posts = getNewsPosts();
        expect(posts.map((p) => p.id)).toEqual(['good']);
    });

    it('serves defaults without overwriting the file when it contains invalid JSON', () => {
        writeRaw('not valid json {{{');
        const posts = getNewsPosts();
        expect(posts.length).toBeGreaterThan(0);
        // The user's (broken) file is preserved so an editing typo loses nothing.
        expect(fs.readFileSync(NEWS_FILE, 'utf8')).toBe('not valid json {{{');
    });
});
