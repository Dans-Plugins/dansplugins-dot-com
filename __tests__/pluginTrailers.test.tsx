// @vitest-environment jsdom
//
// Plugin preview clips: the files and their budgets, the honesty labels on the
// chat recreations, how PluginTrailer loads (or does not load) a clip, and
// where the clips appear — the desktop details panel and the plugin's page,
// never the touch sheet.
import React from 'react';
import fs from 'fs';
import path from 'path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, within} from '@testing-library/react';

vi.mock('../components/LikeButton', () => ({default: () => null}));
vi.mock('next/router', () => ({useRouter: () => ({pathname: '/resources/[slug]', asPath: '/resources/x', query: {}, push: vi.fn()})}));

import {CATALOGUE_OPEN_DELAY_MS as OPEN_DELAY_MS, TOUCH_ONLY_QUERY} from '@kingdom-community/community-site-kit';
import PluginTrailer, {REDUCED_MOTION_QUERY} from '../components/PluginTrailer';
import PluginIconGrid, {type IconGridPlugin} from '../components/PluginIconGrid';
import ResourcePage from '../pages/resources/[slug]';
import {PLUGIN_TRAILERS, trailerAspectRatio, trailerFor} from '../utils/pluginTrailers';

const PUBLIC = path.join(__dirname, '..', 'public');
const CAPTURES = path.join(__dirname, '..', 'scripts', 'previews', 'captures');
// Per-file budgets: a plugin page loads one clip, and the home page none until
// a visitor opens a plugin's details.
const BUDGET = {webm: 450 * 1024, mp4: 650 * 1024, jpg: 120 * 1024};
const TRAILERS = Object.entries(PLUGIN_TRAILERS);

// The pixel size of a JPEG, from its SOF marker.
const jpegSize = (file: string): [number, number] => {
    const data = fs.readFileSync(file);
    let at = 2;
    while (at < data.length) {
        const marker = data[at + 1];
        const length = data.readUInt16BE(at + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
            return [data.readUInt16BE(at + 7), data.readUInt16BE(at + 5)];
        }
        at += 2 + length;
    }
    throw new Error(`no SOF marker in ${file}`);
};

// matchMedia: `matching` lists the queries that match; change() flips one and
// tells its listeners, as a browser does when a setting changes.
const stubMedia = (matching: string[] = []) => {
    const listeners = new Map<string, Set<(e: {matches: boolean}) => void>>();
    const on = new Set(matching);
    Object.defineProperty(window, 'matchMedia', {
        configurable: true, writable: true,
        value: (query: string) => ({
            get matches() { return on.has(query); }, media: query, onchange: null,
            addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
            addEventListener: (_: string, fn: (e: {matches: boolean}) => void) => {
                if (!listeners.has(query)) listeners.set(query, new Set());
                listeners.get(query)!.add(fn);
            },
            removeEventListener: (_: string, fn: (e: {matches: boolean}) => void) => listeners.get(query)?.delete(fn),
        }),
    });
    return {
        change(query: string, matches: boolean) {
            if (matches) on.add(query); else on.delete(query);
            act(() => listeners.get(query)?.forEach((fn) => fn({matches})));
        },
    };
};

// An IntersectionObserver whose answers the test gives: show(el, true|false).
const stubObserver = () => {
    const observers: {cb: (entries: {isIntersecting: boolean; target: Element}[]) => void; els: Set<Element>}[] = [];
    class Observer {
        private entry: {cb: (entries: {isIntersecting: boolean; target: Element}[]) => void; els: Set<Element>};
        constructor(cb: (entries: {isIntersecting: boolean; target: Element}[]) => void) {
            this.entry = {cb, els: new Set()};
            observers.push(this.entry);
        }
        observe(el: Element) { this.entry.els.add(el); }
        unobserve(el: Element) { this.entry.els.delete(el); }
        disconnect() { this.entry.els.clear(); }
    }
    vi.stubGlobal('IntersectionObserver', Observer);
    return {
        show(el: Element, isIntersecting: boolean) {
            act(() => observers.filter((o) => o.els.has(el)).forEach((o) => o.cb([{isIntersecting, target: el}])));
        },
    };
};

// jsdom has no media playback; the component only needs play() and pause() to exist.
beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete (window as {matchMedia?: unknown}).matchMedia;
});

describe('Plugin trailer files', () => {
    it('turns an aspect into a CSS aspect ratio, square by default', () => {
        expect(trailerAspectRatio({})).toBe('1 / 1');
        expect(trailerAspectRatio({aspect: '16:10'})).toBe('16 / 10');
    });

    it('has a clip for each plugin given one, and none for a plugin without one', () => {
        expect(Object.keys(PLUGIN_TRAILERS).sort()).toEqual([
            'activity-tracker', 'bluemap-medieval-factions', 'currencies', 'dans-essentials', 'dans-plugin-manager',
            'dans-set-home', 'democracy', 'easy-links', 'fiefs', 'kdr-tracker', 'mailboxes', 'medieval-economy',
            'medieval-factions', 'medieval-roleplay-engine', 'mini-factions', 'nether-access-controller',
            'simple-skills', 'wild-pets',
        ]);
        // Dropped from the rollout, each for a reason in scripts/previews/README.md.
        for (const slug of ['alternate-account-finder', 'conquest-recipes', 'more-recipes', 'food-spoilage', 'no-more-creepers', 'player-lore', 'dans-spawn-system']) {
            expect(trailerFor(slug)).toBeNull();
        }
    });

    it.each(TRAILERS)('%s: files are named for it, exist, are small, and match its shape', (slug, trailer) => {
        expect(trailer.alt.length).toBeGreaterThan(40);
        expect(trailer.caption.length).toBeGreaterThan(20);
        expect(trailer.poster).toBe(`/trailers/${slug}.jpg`);
        if (trailer.webm) expect(trailer.webm).toBe(`/trailers/${slug}.webm`);
        if (trailer.mp4) expect(trailer.mp4).toBe(`/trailers/${slug}.mp4`);
        expect(trailer.webm || trailer.mp4).toBeTruthy();
        for (const file of [trailer.poster, trailer.webm, trailer.mp4].filter(Boolean) as string[]) {
            const ext = path.extname(file).slice(1) as keyof typeof BUDGET;
            expect(fs.statSync(path.join(PUBLIC, file)).size, file).toBeLessThan(BUDGET[ext]);
        }
        const [width, height] = jpegSize(path.join(PUBLIC, trailer.poster));
        expect(width / height).toBeCloseTo(trailer.aspect === '16:10' ? 1.6 : 1, 2);
    });

    it('leaves no file in public/trailers that no clip uses', () => {
        const used = new Set(TRAILERS.flatMap(([, t]) => [t.poster, t.webm, t.mp4].filter(Boolean).map((f) => path.basename(f!))));
        for (const file of fs.readdirSync(path.join(PUBLIC, 'trailers'))) {
            expect(used.has(file), file).toBe(true);
        }
    });

    // A chat clip draws a capture file: the server's own output, kept in the repo.
    const chatClips = TRAILERS.filter(([slug]) => fs.existsSync(path.join(CAPTURES, `${slug}.json`)));

    it('keeps the capture behind each chat clip, with real commands and replies in it', () => {
        // Every clip but BlueMap's (a recording of its web map) is a chat clip.
        expect(chatClips.map(([slug]) => slug).sort()).toEqual(
            TRAILERS.map(([slug]) => slug).filter((slug) => slug !== 'bluemap-medieval-factions').sort());
        for (const [slug] of chatClips) {
            const capture = JSON.parse(fs.readFileSync(path.join(CAPTURES, `${slug}.json`), 'utf8'));
            expect(capture.id).toBe(slug);
            expect(capture.server).toMatch(/Spigot/);
            const types = new Set(capture.events.map((e: {type: string}) => e.type));
            expect(types.has('sent') && types.has('chat')).toBe(true);
            // Colour codes as the server sent them, not plain text typed in
            // (MiniFactions 0.3.0 sends its replies uncoloured).
            if (slug !== 'mini-factions') {
                expect(capture.events.some((e: {motd?: string}) => /§/.test(e.motd ?? ''))).toBe(true);
            }
        }
    });

    it('labels every chat clip as a recreation, in its caption and its alt text', () => {
        for (const [, trailer] of chatClips) {
            expect(trailer.caption).toMatch(/recreated chat panel/i);
            expect(trailer.alt).toMatch(/recreation/i);
        }
    });
});

describe('PluginTrailer', () => {
    const trailer = PLUGIN_TRAILERS['medieval-factions'];

    it('loads nothing in a details panel until it is on screen, and drops the video when hidden again', () => {
        stubMedia();
        const io = stubObserver();
        render(<PluginTrailer trailer={trailer} load="visible"/>);
        const box = screen.getByTestId('plugin-trailer');
        expect(box.querySelector('img, video')).toBeNull();

        io.show(box, true);
        const video = screen.getByTestId('plugin-trailer-video') as HTMLVideoElement;
        expect(video.muted).toBe(true);
        expect(video.loop).toBe(true);
        expect(video.hasAttribute('playsinline')).toBe(true);
        expect([...video.querySelectorAll('source')].map((s) => s.getAttribute('src'))).toEqual([trailer.webm, trailer.mp4]);
        expect(screen.getByRole('img', {name: trailer.alt})).toBeTruthy();

        io.show(box, false);
        expect(box.querySelector('img, video')).toBeNull();
    });

    it('shows no clip in a panel where the browser cannot tell whether it is on screen', () => {
        stubMedia();
        vi.stubGlobal('IntersectionObserver', undefined);
        render(<PluginTrailer trailer={trailer} load="visible"/>);
        expect(screen.getByTestId('plugin-trailer').querySelector('img, video')).toBeNull();
    });

    it('shows the poster near the viewport on a plugin page, then the clip', () => {
        stubMedia();
        const io = stubObserver();
        render(<PluginTrailer trailer={trailer}/>);
        const box = screen.getByTestId('plugin-trailer');
        expect(screen.getByTestId('plugin-trailer-poster').getAttribute('src')).toBe(trailer.poster);
        io.show(box, true);
        expect(screen.getByTestId('plugin-trailer-video')).toBeTruthy();
    });

    it('shows only the still to a visitor who prefers reduced motion, following a change live', () => {
        const media = stubMedia([REDUCED_MOTION_QUERY]);
        const io = stubObserver();
        render(<PluginTrailer trailer={trailer}/>);
        io.show(screen.getByTestId('plugin-trailer'), true);
        expect(screen.queryByTestId('plugin-trailer-video')).toBeNull();
        expect(screen.getByTestId('plugin-trailer-poster')).toBeTruthy();
        expect(screen.queryByRole('button', {name: /preview clip/})).toBeNull();

        media.change(REDUCED_MOTION_QUERY, false);
        expect(screen.getByTestId('plugin-trailer-video')).toBeTruthy();
        media.change(REDUCED_MOTION_QUERY, true);
        expect(screen.queryByTestId('plugin-trailer-video')).toBeNull();
    });

    it('can be paused and played again', () => {
        stubMedia();
        const io = stubObserver();
        render(<PluginTrailer trailer={trailer}/>);
        io.show(screen.getByTestId('plugin-trailer'), true);
        const pause = screen.getByRole('button', {name: 'Pause the preview clip'});
        expect(pause.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(pause);
        const play = screen.getByRole('button', {name: 'Play the preview clip'});
        expect(play.getAttribute('aria-pressed')).toBe('true');
    });
});

const PLUGINS: IconGridPlugin[] = [
    {
        id: 'medieval-factions', title: 'Medieval Factions', description: 'Feudal, diplomatic, lawful groups.',
        githubLink: 'https://github.com/Dans-Plugins/Medieval-Factions', icon: null, tags: [],
    },
    {
        id: 'food-spoilage', title: 'Food Spoilage', description: 'Makes food turn into rotten flesh.',
        githubLink: 'https://github.com/Dans-Plugins/FoodSpoilage', icon: null, tags: [],
    },
];
const renderGrid = () => render(
    <PluginIconGrid plugins={PLUGINS} likeCounts={{}} likedSet={new Set()} token={null} onTagClick={vi.fn()}/>,
);
const tileFor = (title: string) => screen.getAllByTestId('catalogue-tile')
    .find((tile) => tile.querySelector('.catalogue-tile-caption')?.textContent === title) as HTMLElement;
const panelOf = (title: string) => tileFor(title).parentElement!.querySelector('[role="group"]') as HTMLElement;

describe('Preview clips in the home page grid', () => {
    it('puts a plugin\'s clip in its desktop panel, loading nothing while the panel is closed', () => {
        vi.useFakeTimers();
        const io = stubObserver();
        renderGrid();
        // Closed panels stay mounted (for their Like state), but load nothing.
        const box = within(panelOf('Medieval Factions')).getByTestId('plugin-trailer');
        expect(box.querySelector('img, video')).toBeNull();
        expect(within(panelOf('Food Spoilage')).queryByTestId('plugin-trailer')).toBeNull();

        fireEvent.mouseEnter(tileFor('Medieval Factions').parentElement!);
        act(() => vi.advanceTimersByTime(OPEN_DELAY_MS));
        io.show(box, true);
        expect(within(panelOf('Medieval Factions')).getByTestId('plugin-trailer-video')).toBeTruthy();
    });

    it('shows no clip in the touch bottom sheet, which stays as it was', () => {
        stubMedia([TOUCH_ONLY_QUERY]);
        stubObserver();
        renderGrid();
        fireEvent.click(tileFor('Medieval Factions'));
        const dialog = screen.getByRole('dialog', {name: 'Medieval Factions'});
        expect(within(dialog).queryByTestId('plugin-trailer')).toBeNull();
        expect(within(dialog).getByRole('link', {name: 'Details'}).getAttribute('href')).toBe('/resources/medieval-factions');
    });
});

describe('Preview clip on the plugin page', () => {
    const props = (trailer: unknown) => ({
        slug: 'medieval-factions', title: 'Medieval Factions', description: 'Feudal groups.',
        githubLink: 'https://github.com/Dans-Plugins/Medieval-Factions', spigotmcLink: null, icon: null,
        serverCount: null, latestVersion: null, testedVersions: null, spigotRating: null, spigotDownloads: null,
        versions: [], downloads: null, firstReleasedAt: null, lastUpdatedAt: null, tags: [],
        requires: [], expansions: [], related: [], usage: null, renderedAt: 0, trailer,
    });
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ok: false, status: 404, json: async () => ({})} as Response)));
    });

    it('shows the clip with its caption saying how it was made', () => {
        stubObserver();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render(<ResourcePage {...(props(PLUGIN_TRAILERS['medieval-factions']) as any)}/>);
        const figure = screen.getByTestId('plugin-preview');
        expect(within(figure).getByTestId('plugin-trailer-poster').getAttribute('src')).toBe('/trailers/medieval-factions.jpg');
        expect(figure.querySelector('figcaption')?.textContent).toMatch(/recreated chat panel/i);
    });

    it('has no preview section for a plugin without a clip', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render(<ResourcePage {...(props(null) as any)}/>);
        expect(screen.queryByTestId('plugin-preview')).toBeNull();
    });
});
