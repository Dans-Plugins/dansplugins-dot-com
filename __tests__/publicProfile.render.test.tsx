/**
 * @vitest-environment jsdom
 */
// The public profile at /u/{username}: it loads the profile named in the URL,
// shows a not-found notice for an unknown user, labels badges, and names each
// liked item from the catalogue (falling back to the raw id for a stale like).
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, waitFor, within} from '@testing-library/react';

let query: Record<string, string> = {};
vi.mock('next/router', () => ({useRouter: () => ({pathname: '/u/[username]', asPath: '/u/dan', query, push: vi.fn()})}));
vi.mock('../services/profileService', () => ({getPublicProfile: vi.fn()}));
vi.mock('../services/pluginCatalogueService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../services/pluginCatalogueService')>()),
    fetchCatalogueInBrowser: vi.fn(),
}));

import PublicProfilePage from '../pages/u/[username]';
import {getPublicProfile, type PublicProfile} from '../services/profileService';
import {fetchCatalogueInBrowser, type CataloguePlugin} from '../services/pluginCatalogueService';

const plugin = (id: string, title: string): CataloguePlugin => ({
    id, title, description: '', githubLink: '', spigotmcLink: null, bStatsId: null, icon: null, tags: [], requires: [],
});

const profile = (overrides: Partial<PublicProfile> = {}): PublicProfile => ({
    username: 'dan',
    displayName: null,
    avatarUrl: null,
    bio: null,
    createdAt: '2025-03-04T12:00:00Z',
    badges: [],
    likes: [],
    ...overrides,
});

beforeEach(() => {
    query = {username: 'dan'};
    vi.mocked(getPublicProfile).mockReset();
    vi.mocked(fetchCatalogueInBrowser).mockReset();
    vi.mocked(fetchCatalogueInBrowser).mockResolvedValue([plugin('fiefs', 'Fiefs'), plugin('currencies', 'Currencies')]);
    // Nothing on this page should reach the network unmocked.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unexpected fetch')));
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
});

const heading = () => screen.getByRole('heading', {level: 1});

describe('public profile page', () => {
    it('loads the profile for the username in the URL', async () => {
        query = {username: 'some user'};
        vi.mocked(getPublicProfile).mockResolvedValue(profile({username: 'some user'}));
        render(<PublicProfilePage/>);
        await waitFor(() => expect(heading().textContent).toBe('some user'));
        expect(getPublicProfile).toHaveBeenCalledWith('some user');
    });

    it('shows the display name as the heading, with the username, join date, badges and bio beneath', async () => {
        vi.mocked(getPublicProfile).mockResolvedValue(profile({
            displayName: 'Daniel',
            bio: 'Writes plugins.',
            badges: ['SERVER_OWNER', 'SOMETHING_NEW'],
        }));
        render(<PublicProfilePage/>);
        await waitFor(() => expect(heading().textContent).toBe('Daniel'));
        expect(screen.getByText('@dan')).toBeTruthy();
        expect(screen.getByText('Member since March 4, 2025')).toBeTruthy();
        // A known badge code gets its label; an unknown one renders raw.
        expect(screen.getByText('Server Owner')).toBeTruthy();
        expect(screen.getByText('SOMETHING_NEW')).toBeTruthy();
        expect(screen.getByText('Writes plugins.')).toBeTruthy();
    });

    it('falls back to the username as the heading, without a separate @username line', async () => {
        vi.mocked(getPublicProfile).mockResolvedValue(profile());
        render(<PublicProfilePage/>);
        await waitFor(() => expect(heading().textContent).toBe('dan'));
        expect(screen.queryByText('@dan')).toBeNull();
    });

    it('names liked items from the catalogue, sorted by title, linking plugins and guides', async () => {
        vi.mocked(getPublicProfile).mockResolvedValue(profile({
            likes: [
                {targetType: 'plugin', targetId: 'fiefs'},
                {targetType: 'guide', targetId: 'currencies'},
                {targetType: 'plugin', targetId: 'retired-plugin'},
            ],
        }));
        render(<PublicProfilePage/>);
        await waitFor(() => expect(screen.getByText('Currencies Guide')).toBeTruthy());
        // Scoped to the likes list: the TopBar drawer is a list of links too.
        const links = within(screen.getByText('Fiefs').closest('ul')!).getAllByRole('link');
        expect(links.map((a) => a.textContent)).toEqual([
            'Currencies Guideguide',
            'Fiefsplugin',
            // A like whose plugin left the catalogue keeps its raw id as the label.
            'retired-pluginplugin',
        ]);
        expect(links.map((a) => a.getAttribute('href'))).toEqual(['/guides/currencies', '/#plugins', '/#plugins']);
    });

    it('says so when the user has liked nothing', async () => {
        vi.mocked(getPublicProfile).mockResolvedValue(profile({displayName: 'Daniel'}));
        render(<PublicProfilePage/>);
        await waitFor(() => expect(screen.getByText(/Daniel hasn.t liked any plugins or guides yet\./)).toBeTruthy());
    });

    it('shows a not-found notice naming the username when there is no such profile', async () => {
        query = {username: 'ghost'};
        vi.mocked(getPublicProfile).mockResolvedValue(null);
        render(<PublicProfilePage/>);
        await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('No profile found for ghost.'));
        expect(screen.queryByRole('heading', {level: 1})).toBeNull();
    });

    it('keeps the spinner, and asks for nothing, until the router supplies a username', async () => {
        query = {};
        render(<PublicProfilePage/>);
        await waitFor(() => expect(fetchCatalogueInBrowser).toHaveBeenCalled());
        expect(screen.getByRole('progressbar')).toBeTruthy();
        expect(getPublicProfile).not.toHaveBeenCalled();
    });
});
