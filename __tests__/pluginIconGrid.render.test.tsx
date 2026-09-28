// @vitest-environment jsdom
//
// The home page's icon grid: one tile per plugin, a details panel that opens on
// hover or keyboard focus, and the folded-away search and filters. jsdom does no
// layout, so this pins behaviour and structure; how the grid looks is checked by
// rendering the page in a browser.
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, within} from '@testing-library/react';

// LikeButton reaches the likes API on interaction; the panel renders it, so
// replace it with an inert stand-in rather than mount that machinery here.
vi.mock('../components/LikeButton', () => ({default: () => null}));
// PluginsSection loads like counts and the session on mount.
vi.mock('../services/likeService', () => ({
    getLikeCounts: vi.fn(async () => ({})),
    getMyLikes: vi.fn(async () => []),
}));
vi.mock('../utils/session', () => ({getSessionToken: vi.fn(async () => null)}));
vi.mock('next/router', () => ({useRouter: () => ({push: vi.fn()})}));

import PluginIconGrid, {CLOSE_DELAY_MS, OPEN_DELAY_MS, TOUCH_ONLY_QUERY, type IconGridPlugin} from '../components/PluginIconGrid';
import {PluginsSection} from '../pages/index';

const PLUGINS: IconGridPlugin[] = [
    {
        id: 'medieval-factions', title: 'Medieval Factions',
        description: 'Allows players to organize themselves into feudal, diplomatic, lawful groups akin to nations.',
        githubLink: 'https://github.com/Dans-Plugins/Medieval-Factions',
        spigotmcLink: 'https://www.spigotmc.org/resources/medieval-factions.79941/',
        icon: '/icons/mf.png', tags: ['factions', 'medieval'],
    },
    {
        id: 'medieval-cookery', title: 'Medieval Cookery',
        description: 'Allows server owners to add cooking recipes for an enhanced roleplay experience.',
        githubLink: 'https://github.com/Dans-Plugins/Medieval-Cookery',
        icon: null, tags: ['recipes'],
    },
    {
        id: 'fiefs', title: 'Fiefs', description: 'Allows players to create fiefs and manage them.',
        githubLink: 'https://github.com/Dans-Plugins/Fiefs', icon: '/icons/f.png', tags: ['factions'],
    },
];

const renderGrid = () => render(
    <PluginIconGrid plugins={PLUGINS} likeCounts={{}} likedSet={new Set()} token={null} onTagClick={vi.fn()}/>,
);

// A tile's caption; its full text also carries the fallback avatar's initial.
const captionOf = (tile: HTMLElement) => tile.querySelector('.icon-tile-caption')?.textContent;
const captions = () => screen.getAllByTestId('plugin-tile').map(captionOf);
const tileFor = (title: string) =>
    screen.getAllByTestId('plugin-tile').find((tile) => captionOf(tile) === title) as HTMLElement;

// The panel of the tile's own wrapper; closed panels are display:none.
const panelFor = (title: string) =>
    tileFor(title).parentElement!.querySelector('[data-testid="plugin-panel"]') as HTMLElement;
const isOpen = (title: string) => panelFor(title).style.display !== 'none';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('PluginIconGrid tiles', () => {
    it('renders one tile per plugin, each linking to the plugin\'s page', () => {
        renderGrid();
        expect(captions()).toEqual(['Medieval Factions', 'Medieval Cookery', 'Fiefs']);
        expect(tileFor('Fiefs').getAttribute('href')).toBe('/resources/fiefs');
    });

    it('uses the plugin\'s icon, and falls back to its initial when it has none', () => {
        renderGrid();
        expect(tileFor('Fiefs').querySelector('img')?.getAttribute('src')).toBe('/icons/f.png');
        expect(tileFor('Medieval Cookery').querySelector('img')).toBeNull();
        expect(tileFor('Medieval Cookery').textContent).toBe('MMedieval Cookery');
    });

    it('describes each tile by the plugin\'s description', () => {
        renderGrid();
        const describedBy = tileFor('Fiefs').getAttribute('aria-describedby') as string;
        expect(document.getElementById(describedBy)?.textContent).toBe('Allows players to create fiefs and manage them.');
    });

    it('starts with every panel closed', () => {
        renderGrid();
        PLUGINS.forEach(({title}) => expect(isOpen(title)).toBe(false));
        expect(screen.queryByRole('link', {name: 'Details'})).toBeNull();
    });
});

describe('PluginIconGrid details panel', () => {
    beforeEach(() => vi.useFakeTimers());

    it('opens on hover after a short delay, showing the description and actions', () => {
        renderGrid();
        fireEvent.mouseEnter(tileFor('Medieval Factions').parentElement!);
        expect(isOpen('Medieval Factions')).toBe(false);
        act(() => vi.advanceTimersByTime(OPEN_DELAY_MS));

        const panel = within(panelFor('Medieval Factions'));
        expect(isOpen('Medieval Factions')).toBe(true);
        expect(panel.getByText(/feudal, diplomatic, lawful groups/)).toBeTruthy();
        expect(panel.getByRole('link', {name: 'Details'}).getAttribute('href')).toBe('/resources/medieval-factions');
        expect(panel.getByRole('link', {name: 'Guide'}).getAttribute('href')).toBe('/guides/medieval-factions');
        expect(panel.getByRole('link', {name: 'GitHub'}).getAttribute('href')).toBe('https://github.com/Dans-Plugins/Medieval-Factions');
        expect(panel.getByRole('link', {name: 'SpigotMC'})).toBeTruthy();
    });

    it('closes after the pointer leaves, unless it comes back in time', () => {
        renderGrid();
        const wrapper = tileFor('Fiefs').parentElement!;
        fireEvent.mouseEnter(wrapper);
        act(() => vi.advanceTimersByTime(OPEN_DELAY_MS));

        // Crossing the gap onto the panel: out, then straight back in.
        fireEvent.mouseLeave(wrapper);
        act(() => vi.advanceTimersByTime(CLOSE_DELAY_MS - 50));
        fireEvent.mouseEnter(wrapper);
        act(() => vi.advanceTimersByTime(CLOSE_DELAY_MS));
        expect(isOpen('Fiefs')).toBe(true);

        fireEvent.mouseLeave(wrapper);
        act(() => vi.advanceTimersByTime(CLOSE_DELAY_MS));
        expect(isOpen('Fiefs')).toBe(false);
    });

    it('keeps only one panel open at a time', () => {
        renderGrid();
        fireEvent.mouseEnter(tileFor('Fiefs').parentElement!);
        act(() => vi.advanceTimersByTime(OPEN_DELAY_MS));
        fireEvent.mouseLeave(tileFor('Fiefs').parentElement!);
        fireEvent.mouseEnter(tileFor('Medieval Cookery').parentElement!);
        act(() => vi.advanceTimersByTime(OPEN_DELAY_MS));

        expect(isOpen('Medieval Cookery')).toBe(true);
        expect(isOpen('Fiefs')).toBe(false);
    });

    it('opens at once on keyboard focus, and Escape closes it and returns focus to the tile', () => {
        renderGrid();
        const tile = tileFor('Fiefs');
        act(() => tile.focus());
        expect(isOpen('Fiefs')).toBe(true);

        const details = within(panelFor('Fiefs')).getByRole('link', {name: 'Details'});
        act(() => details.focus());
        expect(isOpen('Fiefs')).toBe(true);

        fireEvent.keyDown(details, {key: 'Escape'});
        expect(isOpen('Fiefs')).toBe(false);
        expect(document.activeElement).toBe(tile);
    });

    it('closes when focus leaves the tile and its panel', () => {
        renderGrid();
        act(() => tileFor('Fiefs').focus());
        act(() => tileFor('Medieval Cookery').focus());
        expect(isOpen('Fiefs')).toBe(false);
        expect(isOpen('Medieval Cookery')).toBe(true);
    });
});

// A phone or tablet: the one pointer cannot hover. jsdom has no matchMedia,
// which MUI reads as a desktop, so the other tests need no stand-in.
const useTouchScreen = () => {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string) => ({
            matches: query === TOUCH_ONLY_QUERY,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }),
    });
};

const sheet = () => screen.queryByTestId('plugin-sheet');

describe('PluginIconGrid on a touch screen', () => {
    beforeEach(useTouchScreen);
    afterEach(() => {
        delete (window as {matchMedia?: unknown}).matchMedia;
    });

    it('opens a bottom sheet on a tap instead of following the tile\'s link', () => {
        renderGrid();
        expect(sheet()).toBeNull();

        const followed = fireEvent.click(tileFor('Medieval Factions'));
        expect(followed).toBe(false);
        // The link itself stays, for crawlers and a page without script.
        expect(tileFor('Medieval Factions').getAttribute('href')).toBe('/resources/medieval-factions');

        const dialog = screen.getByRole('dialog', {name: 'Medieval Factions'});
        const inSheet = within(dialog);
        expect(inSheet.getByText(/feudal, diplomatic, lawful groups/)).toBeTruthy();
        expect(inSheet.getByRole('link', {name: 'Details'}).getAttribute('href')).toBe('/resources/medieval-factions');
        expect(inSheet.getByRole('link', {name: 'Guide'}).getAttribute('href')).toBe('/guides/medieval-factions');
        expect(inSheet.getByRole('link', {name: 'GitHub'})).toBeTruthy();
        expect(inSheet.getByRole('link', {name: 'SpigotMC'})).toBeTruthy();
    });

    it('opens no hover panel, on pointer or focus', () => {
        vi.useFakeTimers();
        renderGrid();
        fireEvent.mouseEnter(tileFor('Fiefs').parentElement!);
        act(() => vi.advanceTimersByTime(OPEN_DELAY_MS));
        act(() => tileFor('Fiefs').focus());
        expect(isOpen('Fiefs')).toBe(false);
    });

    it('closes from its close button and on Escape', () => {
        renderGrid();
        fireEvent.click(tileFor('Fiefs'));
        fireEvent.click(screen.getByRole('button', {name: 'Close'}));
        expect(screen.queryByRole('dialog')).toBeNull();

        fireEvent.click(tileFor('Fiefs'));
        fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'});
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('closes when the backdrop is tapped', () => {
        renderGrid();
        fireEvent.click(tileFor('Fiefs'));
        const backdrop = document.querySelector('.MuiBackdrop-root') as HTMLElement;
        fireEvent.click(backdrop);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});

describe('PluginIconGrid on a desktop', () => {
    it('opens no sheet on a click, which follows the tile\'s link', () => {
        renderGrid();
        const tile = tileFor('Fiefs');
        // Stop the event before the router would take it; the tile must not
        // have cancelled it on the way.
        let prevented: boolean | null = null;
        tile.addEventListener('click', (e) => {
            prevented = e.defaultPrevented;
            e.preventDefault();
        });
        fireEvent.click(tile);
        expect(prevented).toBe(false);
        expect(sheet()).toBeNull();
    });
});

describe('PluginsSection search and filters', () => {
    const catalogue = PLUGINS.map((plugin) => ({...plugin, bStatsId: null, spigotmcLink: plugin.spigotmcLink ?? null, icon: plugin.icon ?? null, tags: plugin.tags ?? [], firstReleasedAt: null}));
    const renderSection = () =>
        render(<PluginsSection initialPlugins={catalogue as React.ComponentProps<typeof PluginsSection>['initialPlugins']}/>);

    it('shows the grid first, with the controls folded behind one button', () => {
        renderSection();
        const toggle = screen.getByRole('button', {name: 'Search & filter'});
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(screen.getAllByTestId('plugin-tile')).toHaveLength(3);
    });

    it('expands the controls, which still filter the grid', () => {
        renderSection();
        const toggle = screen.getByRole('button', {name: 'Search & filter'});
        fireEvent.click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');

        fireEvent.change(screen.getByPlaceholderText('Search plugins…'), {target: {value: 'fief'}});
        expect(captions()).toEqual(['Fiefs']);
        expect(screen.getByTestId('filter-summary').textContent).toBe('Showing 1 of 3 plugins');
    });

    it('opens the controls when a tag in a panel starts filtering', () => {
        renderSection();
        const toggle = screen.getByRole('button', {name: 'Search & filter'});
        const factionsTile = tileFor('Fiefs');
        act(() => factionsTile.focus());
        const tag = within(factionsTile.parentElement!).getAllByTestId('plugin-tag')[0];
        fireEvent.click(tag);

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(captions().sort()).toEqual(['Fiefs', 'Medieval Factions']);
    });
});
