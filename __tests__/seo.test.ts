import { afterEach, describe, expect, it, vi } from 'vitest';
import { absoluteUrl, canonicalPath, siteBaseUrl, socialImageUrl } from '../utils/seo';

describe('siteBaseUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('uses NEXT_PUBLIC_BASE_URL when it is set', () => {
        vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://dansplugins.com');
        expect(siteBaseUrl()).toBe('https://dansplugins.com');
    });

    it('falls back to the local development origin when it is unset or empty', () => {
        vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');
        expect(siteBaseUrl()).toBe('http://localhost:3000');
    });
});

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

describe('socialImageUrl', () => {
    it('resolves a public/ path against the site origin', () => {
        expect(socialImageUrl('https://dansplugins.com', '/social-card.png'))
            .toBe('https://dansplugins.com/social-card.png');
    });

    it('adds a missing leading slash', () => {
        expect(socialImageUrl('https://dansplugins.com', 'social-card.png'))
            .toBe('https://dansplugins.com/social-card.png');
    });

    it('does not double up slashes when the base URL has a trailing slash', () => {
        expect(socialImageUrl('https://dansplugins.com/', '/social-card.png'))
            .toBe('https://dansplugins.com/social-card.png');
    });

    it('passes an already-absolute URL through unchanged', () => {
        expect(socialImageUrl('https://dansplugins.com', 'https://cdn.example.com/a.png'))
            .toBe('https://cdn.example.com/a.png');
        expect(socialImageUrl('https://dansplugins.com', 'http://cdn.example.com/a.png'))
            .toBe('http://cdn.example.com/a.png');
        expect(socialImageUrl('https://dansplugins.com', 'HTTPS://cdn.example.com/a.png'))
            .toBe('HTTPS://cdn.example.com/a.png');
    });

    it('trims surrounding whitespace', () => {
        expect(socialImageUrl('https://dansplugins.com', '  /social-card.png  '))
            .toBe('https://dansplugins.com/social-card.png');
    });

    it('returns null when there is no image to advertise', () => {
        expect(socialImageUrl('https://dansplugins.com', null)).toBeNull();
        expect(socialImageUrl('https://dansplugins.com', undefined)).toBeNull();
        expect(socialImageUrl('https://dansplugins.com', '')).toBeNull();
        expect(socialImageUrl('https://dansplugins.com', '   ')).toBeNull();
    });

    it('works with the local development default', () => {
        expect(socialImageUrl('http://localhost:3000', '/social-card.png'))
            .toBe('http://localhost:3000/social-card.png');
    });
});
