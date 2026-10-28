// @vitest-environment jsdom
//
// Renders the shared page-metadata component to pin the tags every page hands
// to browser tabs, search engines and link scrapers (Discord above all): the
// title with the site name appended, the description, the canonical URL and
// og:url built from the current route, and the social preview image.
//
// next/head only writes to <head> inside a running Next.js app, so it is
// replaced with a pass-through and the tags are read from the render container.
// NEXT_PUBLIC_BASE_URL is read once at module scope by Seo.tsx, so it is set
// before the component is imported.
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render} from '@testing-library/react';
import type {ReactNode} from 'react';
import {readFileSync} from 'fs';
import {join} from 'path';

vi.hoisted(() => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://dansplugins.com';
});

const router = vi.hoisted(() => ({asPath: '/'}));
vi.mock('next/router', () => ({useRouter: () => ({pathname: router.asPath, asPath: router.asPath, query: {}, push: vi.fn()})}));
vi.mock('next/head', () => ({default: ({children}: {children: ReactNode}) => <>{children}</>}));

import Seo, {DEFAULT_SOCIAL_IMAGE, DEFAULT_SOCIAL_IMAGE_ALT, SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH} from '../components/Seo';

const SITE_NAME = "Dan's Plugins Community";

const meta = (container: HTMLElement, key: string): string | null =>
    container.querySelector(`meta[name="${key}"], meta[property="${key}"]`)?.getAttribute('content') ?? null;

const canonical = (container: HTMLElement): string | null =>
    container.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;

afterEach(() => {
    cleanup();
    router.asPath = '/';
});

describe('Seo title', () => {
    it('appends the site name to a page title everywhere the title is advertised', () => {
        const {container} = render(<Seo title="News"/>);

        const expected = `News — ${SITE_NAME}`;
        expect(container.querySelector('title')?.textContent).toBe(expected);
        expect(meta(container, 'og:title')).toBe(expected);
        expect(meta(container, 'twitter:title')).toBe(expected);
    });

    it('uses the site name alone when no title is given', () => {
        const {container} = render(<Seo/>);

        expect(container.querySelector('title')?.textContent).toBe(SITE_NAME);
        expect(meta(container, 'og:site_name')).toBe(SITE_NAME);
    });
});

describe('Seo description', () => {
    it('uses the given description for the page, Open Graph and Twitter tags', () => {
        const {container} = render(<Seo description="Every release, newest first."/>);

        expect(meta(container, 'description')).toBe('Every release, newest first.');
        expect(meta(container, 'og:description')).toBe('Every release, newest first.');
        expect(meta(container, 'twitter:description')).toBe('Every release, newest first.');
    });

    it('falls back to the site-wide description when none is given', () => {
        const {container} = render(<Seo/>);

        expect(meta(container, 'description')).toMatch(/^Free, open-source plugins for Minecraft servers/);
    });
});

describe('Seo canonical URL', () => {
    it('builds the canonical URL and og:url from the current route without its query string', () => {
        router.asPath = '/news?utm_source=discord';
        const {container} = render(<Seo/>);

        expect(canonical(container)).toBe('https://dansplugins.com/news');
        expect(meta(container, 'og:url')).toBe('https://dansplugins.com/news');
    });

    it('gives the home page a canonical URL ending in a slash', () => {
        const {container} = render(<Seo/>);

        expect(canonical(container)).toBe('https://dansplugins.com/');
    });

    it('prefers an explicit path over the current route', () => {
        router.asPath = '/u/[username]';
        const {container} = render(<Seo path="/u/dan"/>);

        expect(canonical(container)).toBe('https://dansplugins.com/u/dan');
    });

    it('emits no canonical URL while the route still holds an unresolved dynamic segment', () => {
        router.asPath = '/guides/[id]';
        const {container} = render(<Seo/>);

        expect(canonical(container)).toBeNull();
        expect(meta(container, 'og:url')).toBeNull();
    });

    it('emits no canonical URL when path is null', () => {
        router.asPath = '/news';
        const {container} = render(<Seo path={null}/>);

        expect(canonical(container)).toBeNull();
        expect(meta(container, 'og:url')).toBeNull();
    });
});

describe('Seo social image', () => {
    it('advertises the site card by default with its dimensions and alt text', () => {
        const {container} = render(<Seo/>);

        expect(meta(container, 'og:image')).toBe('https://dansplugins.com/social-card.png');
        expect(meta(container, 'og:image:width')).toBe('1200');
        expect(meta(container, 'og:image:height')).toBe('630');
        expect(meta(container, 'og:image:type')).toBe('image/png');
        expect(meta(container, 'og:image:alt')).toBe(DEFAULT_SOCIAL_IMAGE_ALT);
        expect(meta(container, 'twitter:card')).toBe('summary_large_image');
        expect(meta(container, 'twitter:image')).toBe('https://dansplugins.com/social-card.png');
        expect(meta(container, 'twitter:image:alt')).toBe(DEFAULT_SOCIAL_IMAGE_ALT);
    });

    it('points at a real PNG of the declared size, whose alt text is its card spec\'s', () => {
        const root = join(__dirname, '..');
        const bytes = readFileSync(join(root, 'public', DEFAULT_SOCIAL_IMAGE));
        expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect({width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)}).toEqual({
            width: Number(SOCIAL_IMAGE_WIDTH),
            height: Number(SOCIAL_IMAGE_HEIGHT)
        });
        const spec = JSON.parse(readFileSync(join(root, 'og-card', 'card.json'), 'utf8'));
        expect(spec.output).toBe(`../public${DEFAULT_SOCIAL_IMAGE}`);
        expect(DEFAULT_SOCIAL_IMAGE_ALT).toBe(spec.alt);
    });

    it('declares no dimensions for a page-supplied image, and alt text only when given', () => {
        const {container} = render(<Seo image="/trailers/fiefs.jpg"/>);

        expect(meta(container, 'og:image')).toBe('https://dansplugins.com/trailers/fiefs.jpg');
        expect(meta(container, 'og:image:width')).toBeNull();
        expect(meta(container, 'og:image:height')).toBeNull();
        expect(meta(container, 'og:image:alt')).toBeNull();
        expect(meta(container, 'twitter:image:alt')).toBeNull();
    });

    it('passes the alt text of a page-supplied image through to both card types', () => {
        const {container} = render(<Seo image="https://cdn.example.com/card.png" imageAlt="A faction map"/>);

        expect(meta(container, 'og:image')).toBe('https://cdn.example.com/card.png');
        expect(meta(container, 'og:image:alt')).toBe('A faction map');
        expect(meta(container, 'twitter:image:alt')).toBe('A faction map');
    });

    it('falls back to a summary card with no image tags when image is null', () => {
        const {container} = render(<Seo image={null}/>);

        expect(meta(container, 'og:image')).toBeNull();
        expect(meta(container, 'twitter:image')).toBeNull();
        expect(meta(container, 'og:image:alt')).toBeNull();
        expect(meta(container, 'twitter:card')).toBe('summary');
    });
});
