import { describe, expect, it } from 'vitest';
import { absoluteUrl, canonicalPath } from '../utils/seo';

describe('canonicalPath', () => {
    it('returns a plain path unchanged', () => {
        expect(canonicalPath('/news')).toBe('/news');
        expect(canonicalPath('/guides/medievalfactions')).toBe('/guides/medievalfactions');
    });

    it('keeps the root path as a single slash', () => {
        expect(canonicalPath('/')).toBe('/');
    });

    it('drops the query string so tracking parameters are not a separate resource', () => {
        expect(canonicalPath('/news?utm_source=discord')).toBe('/news');
        expect(canonicalPath('/?utm_source=discord')).toBe('/');
    });

    it('drops the fragment', () => {
        expect(canonicalPath('/about#team')).toBe('/about');
        expect(canonicalPath('/about?ref=x#team')).toBe('/about');
    });

    it('drops a trailing slash except on the root', () => {
        expect(canonicalPath('/news/')).toBe('/news');
        expect(canonicalPath('/guides/medievalfactions//')).toBe('/guides/medievalfactions');
    });

    it('adds a missing leading slash', () => {
        expect(canonicalPath('news')).toBe('/news');
    });

    it('returns null for an unresolved dynamic route template', () => {
        expect(canonicalPath('/guides/[id]')).toBeNull();
        expect(canonicalPath('/u/[username]')).toBeNull();
    });

    it('returns null for an empty route', () => {
        expect(canonicalPath('')).toBeNull();
        expect(canonicalPath('?utm_source=discord')).toBeNull();
    });
});

describe('absoluteUrl', () => {
    it('joins an origin to a path', () => {
        expect(absoluteUrl('https://dansplugins.com', '/news')).toBe('https://dansplugins.com/news');
    });

    it('does not double up slashes when the base URL has a trailing slash', () => {
        expect(absoluteUrl('https://dansplugins.com/', '/news')).toBe('https://dansplugins.com/news');
        expect(absoluteUrl('https://dansplugins.com//', '/news')).toBe('https://dansplugins.com/news');
    });

    it('keeps the root path as a trailing slash on the origin', () => {
        expect(absoluteUrl('https://dansplugins.com', '/')).toBe('https://dansplugins.com/');
        expect(absoluteUrl('https://dansplugins.com/', '/')).toBe('https://dansplugins.com/');
    });

    it('works with the local development default', () => {
        expect(absoluteUrl('http://localhost:3000', '/guides')).toBe('http://localhost:3000/guides');
    });
});
