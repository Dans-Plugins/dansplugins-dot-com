/**
 * @vitest-environment jsdom
 */
// The /account page: signing in and creating an account (including the
// returnTo bounce-back, which must only follow internal paths), and, once
// signed in, the profile card, an expired session, logout, profile edits, the
// liked-items toolbox, and minting an API key. The auth, likes, catalogue and
// session modules are mocked; the page's own profile/API-key calls go through
// a stubbed fetch, so nothing reaches the network.
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';

const router = vi.hoisted(() => ({query: {} as Record<string, string>, push: vi.fn()}));
vi.mock('next/router', () => ({
    useRouter: () => ({pathname: '/account', asPath: '/account', query: router.query, push: router.push}),
}));
vi.mock('../services/authService', () => ({login: vi.fn(), register: vi.fn(), logout: vi.fn()}));
vi.mock('../services/likeService', () => ({getMyLikes: vi.fn()}));
vi.mock('../services/pluginCatalogueService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../services/pluginCatalogueService')>()),
    fetchCatalogueInBrowser: vi.fn(),
}));
vi.mock('../utils/session', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../utils/session')>()),
    getSessionToken: vi.fn(),
    saveSession: vi.fn(),
    clearSession: vi.fn(),
}));

import AccountPage from '../pages/account';
import {login, logout, register} from '../services/authService';
import {getMyLikes} from '../services/likeService';
import {fetchCatalogueInBrowser, type CataloguePlugin} from '../services/pluginCatalogueService';
import {clearSession, getSessionToken, saveSession} from '../utils/session';

const plugin = (id: string, title: string): CataloguePlugin => ({
    id, title, description: '', githubLink: '', spigotmcLink: null, bStatsId: null, icon: null, tags: [], requires: [],
});

const profileBody = (overrides: Record<string, unknown> = {}) => ({
    id: 'u1',
    username: 'dan',
    displayName: 'Dan',
    avatarUrl: null,
    bio: null,
    createdAt: '2025-03-04T12:00:00Z',
    badges: [],
    apiKeys: [],
    ...overrides,
});

type Handler = (url: string, init?: RequestInit) => Response;

// Answers GET /profile/me with the given profile (or status) and hands any
// other call to `other`; unexpected calls fail loudly.
const stubApi = (profile: Response | (() => Response), other?: Handler) => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
        if (url.endsWith('/api/v1/profile/me') && (!init?.method || init.method === 'GET')) {
            return typeof profile === 'function' ? profile() : profile;
        }
        if (other) return other(url, init);
        throw new Error(`unexpected fetch ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

const ok = (body: unknown): Response => ({ok: true, status: 200, json: async () => body}) as Response;
const status = (code: number): Response => ({ok: false, status: code, json: async () => ({})}) as Response;

const fill = (label: RegExp | string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), {target: {value}});
const submit = (buttonName: string) =>
    fireEvent.submit(screen.getByRole('button', {name: buttonName}).closest('form') as HTMLFormElement);

beforeEach(() => {
    router.query = {};
    router.push.mockReset();
    vi.mocked(login).mockReset();
    vi.mocked(register).mockReset();
    vi.mocked(logout).mockReset();
    vi.mocked(getMyLikes).mockReset().mockResolvedValue([]);
    vi.mocked(fetchCatalogueInBrowser).mockReset().mockResolvedValue([plugin('fiefs', 'Fiefs')]);
    vi.mocked(getSessionToken).mockReset().mockResolvedValue(null);
    vi.mocked(saveSession).mockReset();
    vi.mocked(clearSession).mockReset();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unexpected fetch')));
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
});

describe('account page, signed out', () => {
    it('offers sign-in and create-account tabs without loading a profile', async () => {
        const fetchMock = stubApi(ok(profileBody()));
        render(<AccountPage/>);
        expect(screen.getByRole('tab', {name: 'Sign in'}).getAttribute('aria-selected')).toBe('true');
        expect(screen.getByRole('tab', {name: 'Create account'})).toBeTruthy();
        await waitFor(() => expect(getSessionToken).toHaveBeenCalled());
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('starts a session on sign-in and returns to an internal returnTo path', async () => {
        router.query = {returnTo: '/resources/fiefs'};
        vi.mocked(login).mockResolvedValue({status: 'authenticated', token: 'jwt', refreshToken: 'rt'});
        stubApi(ok(profileBody()));
        render(<AccountPage/>);
        fill(/^Username/, 'dan');
        fill(/^Password/, 'hunter22!');
        submit('Sign in');
        await screen.findByText('Logged in!');
        expect(login).toHaveBeenCalledWith('dan', 'hunter22!');
        expect(saveSession).toHaveBeenCalledWith({token: 'jwt', refreshToken: 'rt'});
        expect(router.push).toHaveBeenCalledWith('/resources/fiefs');
        await screen.findByText('Welcome, dan');
    });

    it.each(['//evil.example/phish', 'https://evil.example/phish', 'resources/fiefs'])(
        'does not follow a returnTo that is not an internal path (%s)',
        async (returnTo) => {
            router.query = {returnTo};
            vi.mocked(login).mockResolvedValue({status: 'authenticated', token: 'jwt', refreshToken: null});
            stubApi(ok(profileBody()));
            render(<AccountPage/>);
            fill(/^Username/, 'dan');
            fill(/^Password/, 'hunter22!');
            submit('Sign in');
            await screen.findByText('Logged in!');
            expect(router.push).not.toHaveBeenCalled();
        },
    );

    it('shows a refused sign-in and keeps the visitor signed out', async () => {
        vi.mocked(login).mockResolvedValue({status: 'refused', message: 'Invalid credentials.'});
        render(<AccountPage/>);
        fill(/^Username/, 'dan');
        fill(/^Password/, 'wrong');
        submit('Sign in');
        await screen.findByText('Invalid credentials.');
        expect(saveSession).not.toHaveBeenCalled();
        expect(router.push).not.toHaveBeenCalled();
        expect(screen.getByRole('tab', {name: 'Sign in'})).toBeTruthy();
    });

    it('moves a registered-but-not-signed-in visitor to the sign-in tab with the username kept', async () => {
        vi.mocked(register).mockResolvedValue({status: 'registered', message: 'Account created. Please sign in.'});
        render(<AccountPage/>);
        fireEvent.click(screen.getByRole('tab', {name: 'Create account'}));
        fill(/^Username/, 'newbie');
        fill(/^Password/, 'Passw0rd!long');
        submit('Create account');
        await screen.findByText('Account created. Please sign in.');
        expect(register).toHaveBeenCalledWith('newbie', 'Passw0rd!long');
        expect(saveSession).not.toHaveBeenCalled();
        expect(screen.getByRole('tab', {name: 'Sign in'}).getAttribute('aria-selected')).toBe('true');
        expect((screen.getByLabelText(/^Username/) as HTMLInputElement).value).toBe('newbie');
        expect((screen.getByLabelText(/^Password/) as HTMLInputElement).value).toBe('');
    });
});

describe('account page, signed in', () => {
    beforeEach(() => {
        vi.mocked(getSessionToken).mockResolvedValue('jwt');
    });

    it('loads the profile with its API keys and, for an admin, the catalogue editor link', async () => {
        const fetchMock = stubApi(ok(profileBody({
            admin: true,
            apiKeys: [{id: 'k1', keyPrefix: 'abcd', serverName: 'Survival', createdAt: '2025-03-05T12:00:00Z'}],
        })));
        render(<AccountPage/>);
        await screen.findByText('Welcome, dan');
        expect(fetchMock.mock.calls[0][1]?.headers).toEqual({Authorization: 'Bearer jwt'});
        expect(screen.getByText('Survival (abcd…)')).toBeTruthy();
        expect(screen.getByTestId('admin-link').textContent).toContain('Edit the plugin catalogue');
        expect(screen.getByRole('link', {name: 'View your public profile'}).getAttribute('href')).toBe('/u/dan');
    });

    it('has no catalogue editor link for a non-admin', async () => {
        stubApi(ok(profileBody()));
        render(<AccountPage/>);
        await screen.findByText('Welcome, dan');
        expect(screen.queryByTestId('admin-link')).toBeNull();
        expect(screen.getByText('No API keys yet. Create one below.')).toBeTruthy();
    });

    it('ends an expired session and asks the visitor to sign in again', async () => {
        stubApi(status(401));
        render(<AccountPage/>);
        await screen.findByText('Session expired. Please log in again.');
        expect(clearSession).toHaveBeenCalled();
        expect(screen.getByRole('tab', {name: 'Sign in'})).toBeTruthy();
    });

    it('names the HTTP status when the profile fails to load for another reason', async () => {
        stubApi(status(503));
        render(<AccountPage/>);
        await screen.findByText('Failed to load profile (HTTP 503).');
        expect(clearSession).not.toHaveBeenCalled();
    });

    it('revokes the token and clears the session on logout', async () => {
        stubApi(ok(profileBody()));
        render(<AccountPage/>);
        await screen.findByText('Welcome, dan');
        fireEvent.click(screen.getByRole('button', {name: 'Logout'}));
        expect(logout).toHaveBeenCalledWith('jwt');
        expect(clearSession).toHaveBeenCalled();
        expect(screen.getByText('Logged out.')).toBeTruthy();
        expect(screen.getByRole('tab', {name: 'Sign in'})).toBeTruthy();
    });

    it('names liked items from the catalogue and links each to where it lives', async () => {
        vi.mocked(getMyLikes).mockResolvedValue([
            {targetType: 'plugin', targetId: 'fiefs'},
            {targetType: 'guide', targetId: 'retired'},
        ]);
        stubApi(ok(profileBody()));
        render(<AccountPage/>);
        const fiefs = await screen.findByText('Fiefs');
        expect(fiefs.closest('a')?.getAttribute('href')).toBe('/#plugins');
        // A like whose id the catalogue no longer knows still shows, by its id.
        expect(screen.getByText('retired Guide').closest('a')?.getAttribute('href')).toBe('/guides/retired');
    });

    it('sends cleared profile fields as null when saving', async () => {
        let patchBody: unknown = null;
        stubApi(ok(profileBody({bio: 'old bio'})), (url, init) => {
            if (url.endsWith('/api/v1/profile/me') && init?.method === 'PATCH') {
                patchBody = JSON.parse(String(init.body));
                return ok(profileBody({displayName: null, bio: 'new bio'}));
            }
            throw new Error(`unexpected fetch ${init?.method} ${url}`);
        });
        render(<AccountPage/>);
        await waitFor(() => expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('Dan'));
        fill('Display name', '');
        fill('Bio', 'new bio');
        submit('Save profile');
        await screen.findByText('Profile saved.');
        expect(patchBody).toEqual({displayName: null, avatarUrl: null, bio: 'new bio'});
    });

    it('shows a newly created API key once and reloads the key list', async () => {
        let postInit: RequestInit | undefined;
        const fetchMock = stubApi(ok(profileBody()), (url, init) => {
            if (url.endsWith('/api/v1/profile/me/api-keys') && init?.method === 'POST') {
                postInit = init;
                return ok({apiKey: 'dpc_secret_key'});
            }
            throw new Error(`unexpected fetch ${init?.method} ${url}`);
        });
        render(<AccountPage/>);
        await screen.findByText('Welcome, dan');
        fill(/^Server Name/, 'Survival');
        submit('Create Key');
        await screen.findByText('dpc_secret_key');
        expect(JSON.parse(String(postInit?.body))).toEqual({serverName: 'Survival'});
        expect((postInit?.headers as Record<string, string>).Authorization).toBe('Bearer jwt');
        const profileLoads = () => fetchMock.mock.calls.filter(([url, init]) =>
            url.endsWith('/api/v1/profile/me') && !init?.method).length;
        await waitFor(() => expect(profileLoads()).toBe(2));
        expect((screen.getByLabelText(/^Server Name/) as HTMLInputElement).value).toBe('');
    });

    it('reports a failed API-key deletion', async () => {
        stubApi(
            ok(profileBody({apiKeys: [{id: 'k1', keyPrefix: '', serverName: 'Creative', createdAt: '2025-03-05T12:00:00Z'}]})),
            (url, init) => {
                if (url.endsWith('/api/v1/profile/me/api-keys/k1') && init?.method === 'DELETE') return status(500);
                throw new Error(`unexpected fetch ${init?.method} ${url}`);
            },
        );
        render(<AccountPage/>);
        // An empty key prefix shows just the server name, with no "(…)" suffix.
        await screen.findByText('Creative');
        fireEvent.click(screen.getByRole('button', {name: 'Delete API key'}));
        await screen.findByText('Failed to delete API key.');
    });
});
