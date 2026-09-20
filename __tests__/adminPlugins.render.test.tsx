/**
 * @vitest-environment jsdom
 */
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {API_CATALOGUE} from './fixtures/catalogue';

// The page shell pulls in TopBar, which reads the router; give it a plain one.
vi.mock('next/router', () => ({useRouter: () => ({pathname: '/admin/plugins', asPath: '/admin/plugins', query: {}, push: vi.fn()})}));

import AdminPluginsPage from '../pages/admin/plugins';

// One fetch stub for the three calls the page makes: /profile/me (is the
// user an admin?), /api/v1/plugins (the list), and the PUT/POST on submit.
const stubApi = ({admin, onWrite}: {admin: boolean | 'fail'; onWrite?: (init: RequestInit) => Response}) =>
    vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/api/v1/profile/me')) {
            return admin === 'fail'
                ? {ok: false, status: 401} as Response
                : {ok: true, json: async () => ({username: 'dan', admin})} as Response;
        }
        if (init?.method === 'PUT' || init?.method === 'POST') {
            return onWrite ? onWrite(init) : {ok: true, json: async () => JSON.parse(String(init.body))} as Response;
        }
        return {ok: true, json: async () => API_CATALOGUE} as Response;
    });

beforeEach(() => {
    window.localStorage.setItem('dpc-token', 'tok');
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
});

describe('admin plugins page gates', () => {
    it('asks a signed-out visitor to sign in, without calling the API', () => {
        window.localStorage.removeItem('dpc-token');
        const fetchMock = stubApi({admin: true});
        vi.stubGlobal('fetch', fetchMock);
        render(<AdminPluginsPage/>);
        expect(screen.getByText(/needs a signed-in admin/)).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('tells a signed-in non-admin the API would refuse them', async () => {
        vi.stubGlobal('fetch', stubApi({admin: false}));
        render(<AdminPluginsPage/>);
        await waitFor(() => expect(screen.getByTestId('admins-only')).toBeTruthy());
        expect(screen.queryByTestId('add-plugin')).toBeNull();
    });

    it('reports an API it cannot reach', async () => {
        vi.stubGlobal('fetch', stubApi({admin: 'fail'}));
        render(<AdminPluginsPage/>);
        await waitFor(() => expect(screen.getByText(/could not be reached/)).toBeTruthy());
    });
});

describe('admin plugins page editing', () => {
    it('lists the catalogue and loads an entry into the form, tags as a comma list', async () => {
        vi.stubGlobal('fetch', stubApi({admin: true}));
        render(<AdminPluginsPage/>);
        await waitFor(() => expect(screen.getByTestId('edit-currencies')).toBeTruthy());
        fireEvent.click(screen.getByTestId('edit-currencies'));
        expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe('Currencies');
        expect((screen.getByLabelText(/^Tags/) as HTMLInputElement).value).toBe('economy, factions, medieval');
        // The slug is fixed once created, so it is not offered on an edit.
        expect(screen.queryByLabelText(/^Slug/)).toBeNull();
    });

    it('PUTs the whole entry with parsed tags and shows the saved notice', async () => {
        const writes: RequestInit[] = [];
        vi.stubGlobal('fetch', stubApi({admin: true, onWrite: (init) => {
            writes.push(init);
            return {ok: true, json: async () => ({...API_CATALOGUE[1], title: 'Currencies!', tags: ['economy', 'medieval']})} as Response;
        }}));
        render(<AdminPluginsPage/>);
        await waitFor(() => expect(screen.getByTestId('edit-currencies')).toBeTruthy());
        fireEvent.click(screen.getByTestId('edit-currencies'));
        fireEvent.change(screen.getByLabelText(/^Title/), {target: {value: 'Currencies!'}});
        fireEvent.change(screen.getByLabelText(/^Tags/), {target: {value: ' Economy, medieval,, '}});
        fireEvent.submit(screen.getByRole('form', {name: 'Edit currencies'}));

        await waitFor(() => expect(screen.getByTestId('form-notice').textContent).toContain('Currencies! saved'));
        expect(writes).toHaveLength(1);
        expect(writes[0].method).toBe('PUT');
        expect(JSON.parse(String(writes[0].body))).toEqual({
            slug: 'currencies', title: 'Currencies!',
            description: 'An expansion for Medieval Factions that allows faction owners to create and mint local currencies.',
            githubUrl: 'https://github.com/Dans-Plugins/Currencies',
            spigotmcUrl: 'https://www.spigotmc.org/resources/currencies.96381/', bstatsId: '12810', iconPath: '/icons/c.png',
            tags: ['economy', 'medieval'],
        });
    });

    it('POSTs a new plugin from the add form, and shows the API\'s field errors when it refuses', async () => {
        vi.stubGlobal('fetch', stubApi({admin: true, onWrite: () => ({
            ok: false, status: 400,
            json: async () => ({detail: 'Validation failed', errors: {slug: 'slug must be lower-case words joined by hyphens'}}),
        } as Response)}));
        render(<AdminPluginsPage/>);
        await waitFor(() => expect(screen.getByTestId('add-plugin')).toBeTruthy());
        fireEvent.change(screen.getByLabelText(/^Slug/), {target: {value: 'Bad Slug'}});
        fireEvent.change(screen.getByLabelText(/^Title/), {target: {value: 'New'}});
        fireEvent.change(screen.getByLabelText(/^Description/), {target: {value: 'Thing.'}});
        fireEvent.change(screen.getByLabelText(/^GitHub repository URL/), {target: {value: 'https://github.com/Dans-Plugins/New'}});
        fireEvent.submit(screen.getByRole('form', {name: 'Add a plugin'}));

        await waitFor(() => expect(screen.getByTestId('form-error').textContent).toBe('Some fields need attention.'));
        expect(screen.getByText('slug must be lower-case words joined by hyphens')).toBeTruthy();
    });
});
