// @vitest-environment jsdom
//
// The home page's heading outline. Its <h1> is visually hidden (the visible
// wordmark sits in the Blurb below the grid) and the catalogue section brings
// its own <h2>, so it is easy to end up with the outline opening on that h2.
// What is pinned is DOM order, which is what a screen reader's heading list
// follows: the first heading on / is its single <h1>, inside the main landmark,
// both with plugins in the catalogue and when the catalogue could not be read.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

// The page loads like counts and the session on mount; the Like button
// itself is not under test here.
vi.mock('../components/LikeButton', () => ({default: () => null}));
vi.mock('../services/likeService', () => ({
    getLikeCounts: vi.fn(async () => ({})),
    getMyLikes: vi.fn(async () => []),
}));
vi.mock('../utils/session', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../utils/session')>()),
    getSessionToken: vi.fn(async () => null),
}));
vi.mock('next/router', () => ({useRouter: () => ({pathname: '/', asPath: '/', query: {}, push: vi.fn()})}));

import Home from '../pages/index';
import {EXPERIENCE_CHOSEN_KEY} from '../utils/experience';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});

const PLUGIN = {
    id: 'fiefs',
    title: 'Fiefs',
    description: 'Allows players to create fiefs and manage them.',
    githubLink: 'https://github.com/Dans-Plugins/Fiefs',
    spigotmcLink: null,
    icon: null,
    tags: ['factions'],
    bStatsId: null,
    serverCount: null,
    testedVersions: null,
    spigotRating: null,
    latestVersion: null,
    latestDownloadUrl: null,
    downloadCount: null,
};

const renderHome = (plugins: unknown[]) => {
    // The first-visit splash is a dialog with its own h2; mark the choice as
    // made so the page's own outline is what is read.
    window.localStorage.setItem(EXPERIENCE_CHOSEN_KEY, 'true');
    const Page = Home as unknown as React.FC<Record<string, unknown>>;
    return render(<Page visits={null} startDate={null} pluginsWithCounts={plugins}/>);
};

const headingsInOrder = () => Array.from(document.body.querySelectorAll('h1, h2, h3, h4, h5, h6'));

describe('/ heading outline', () => {
    it.each([
        ['with plugins in the catalogue', [PLUGIN]],
        ['when the catalogue could not be loaded', []],
    ])('opens on the page h1, before the catalogue h2, %s', (_case, plugins) => {
        renderHome(plugins);

        const headings = headingsInOrder();
        expect(headings[0].tagName).toBe('H1');
        expect(headings[0].textContent).toBe("Dan's Plugins Community");
        expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
        expect(within(screen.getByRole('main')).getByRole('heading', {level: 1})).toBe(headings[0]);
        // The catalogue's own heading is still there, after the h1.
        expect(headings.slice(1).some((h) => h.tagName === 'H2' && h.textContent === 'Plugins')).toBe(true);
    });
});
