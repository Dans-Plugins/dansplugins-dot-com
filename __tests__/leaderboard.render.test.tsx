/**
 * @vitest-environment jsdom
 */
// The faction leaderboard at /leaderboard: it asks dpc-api for factions by
// member count, ranks the top three with a trophy, shows each faction's
// description, sync age, server and links, copies a server address on click,
// says so when nothing has synced, and offers a Retry when the fetch fails.
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/leaderboard', asPath: '/leaderboard', query: {}, push: vi.fn()})}));

import LeaderboardPage from '../pages/leaderboard';
import {getApiBaseUrl} from '../utils/apiBase';

const NOW = Date.parse('2026-10-03T16:00:00Z');
const THREE_DAYS_AGO = '2026-09-30T16:00:00Z';

interface FactionFixture {
    id: string;
    name: string;
    serverId: string;
    memberCount: number;
    description: string | null;
    serverIp: string | null;
    discordLink: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

const faction = (name: string, memberCount: number, overrides: Partial<FactionFixture> = {}): FactionFixture => ({
    id: name.toLowerCase(),
    name,
    serverId: 'kfe',
    memberCount,
    description: null,
    serverIp: null,
    discordLink: null,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: THREE_DAYS_AGO,
    ...overrides,
});

const page = (content: FactionFixture[]) => ({
    ok: true,
    status: 200,
    json: async () => ({content, totalElements: content.length, totalPages: 1, number: 0}),
});

const failed = (status: number) => ({ok: false, status, json: async () => ({})});

const fetchMock = vi.fn();

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window.navigator, 'clipboard');
});

// The table's body rows, without the header row.
const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('faction leaderboard page', () => {
    it('asks dpc-api for up to 50 factions sorted by member count, most first', async () => {
        fetchMock.mockResolvedValue(page([]));
        render(<LeaderboardPage/>);
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        expect(fetchMock).toHaveBeenCalledWith(`${getApiBaseUrl()}/api/v1/factions?sort=memberCount,desc&size=50`);
    });

    it('lists factions in the order returned, a trophy for the top three and a number from fourth on', async () => {
        fetchMock.mockResolvedValue(page([
            faction('Alpha', 40),
            faction('Bravo', 30),
            faction('Charlie', 20),
            faction('Delta', 10),
        ]));
        render(<LeaderboardPage/>);
        await screen.findByText('Alpha');

        const rows = bodyRows();
        expect(rows).toHaveLength(4);
        expect(rows.map((row) => within(row).getAllByRole('cell')[1].querySelector('p')?.textContent))
            .toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
        for (const row of rows.slice(0, 3)) {
            expect(within(row).queryByTestId('EmojiEventsIcon')).not.toBeNull();
        }
        expect(within(rows[3]).queryByTestId('EmojiEventsIcon')).toBeNull();
        expect(within(rows[3]).getAllByRole('cell')[0].textContent).toBe('4');
        expect(rows.map((row) => within(row).getAllByRole('cell')[3].textContent)).toEqual(['40', '30', '20', '10']);
    });

    it('shows a faction\'s description, how long ago it synced, and its server id', async () => {
        fetchMock.mockResolvedValue(page([faction('Alpha', 5, {description: 'Holders of the north.', serverId: 'kfe-main'})]));
        render(<LeaderboardPage/>);
        await screen.findByText('Alpha');
        const row = bodyRows()[0];
        expect(within(row).getByText('Holders of the north.')).toBeTruthy();
        expect(within(row).getByText('Updated 3 days ago')).toBeTruthy();
        expect(within(row).getByText('kfe-main')).toBeTruthy();
    });

    it('leaves out the server address and Discord link when a faction has not published them', async () => {
        fetchMock.mockResolvedValue(page([faction('Alpha', 5)]));
        render(<LeaderboardPage/>);
        await screen.findByText('Alpha');
        const row = bodyRows()[0];
        expect(within(row).queryByTestId('ContentCopyIcon')).toBeNull();
        expect(within(row).queryByRole('link', {name: /Discord/})).toBeNull();
    });

    it('links a published Discord in a new tab', async () => {
        fetchMock.mockResolvedValue(page([faction('Alpha', 5, {discordLink: 'https://discord.gg/example'})]));
        render(<LeaderboardPage/>);
        await screen.findByText('Alpha');
        const link = within(bodyRows()[0]).getByRole('link', {name: /Discord/});
        expect(link.getAttribute('href')).toBe('https://discord.gg/example');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('copies a published server address when its chip is clicked, and says so', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        // jsdom has no Clipboard API; add one for this test only.
        Object.defineProperty(window.navigator, 'clipboard', {value: {writeText}, configurable: true});
        fetchMock.mockResolvedValue(page([faction('Alpha', 5, {serverIp: 'play.example.net'})]));
        render(<LeaderboardPage/>);
        fireEvent.click(await screen.findByText('play.example.net'));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith('play.example.net'));
        expect(await screen.findByText('Server address copied to clipboard')).toBeTruthy();
    });

    it('says no factions have synced when the list is empty', async () => {
        fetchMock.mockResolvedValue(page([]));
        render(<LeaderboardPage/>);
        expect(await screen.findByText(/No factions have been synced yet\./)).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('names the HTTP status when dpc-api answers with an error', async () => {
        fetchMock.mockResolvedValue(failed(503));
        render(<LeaderboardPage/>);
        expect((await screen.findByRole('alert')).textContent).toContain('Failed to load factions (HTTP 503).');
    });

    it('gives a plain message, not the exception, when the request itself fails', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        render(<LeaderboardPage/>);
        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('We couldn’t load the leaderboard right now. Please try again.');
        expect(alert.textContent).not.toContain('Failed to fetch');
        expect(consoleError).toHaveBeenCalled();
    });

    it('fetches again on Retry and replaces the error with the factions', async () => {
        fetchMock.mockResolvedValueOnce(failed(500)).mockResolvedValueOnce(page([faction('Alpha', 5)]));
        render(<LeaderboardPage/>);
        const alert = await screen.findByRole('alert');
        fireEvent.click(within(alert).getByRole('button', {name: 'Retry'}));
        expect(await screen.findByText('Alpha')).toBeTruthy();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
