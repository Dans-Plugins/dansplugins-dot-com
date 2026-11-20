/**
 * @vitest-environment jsdom
 */
// Renders /dev, the Developer Portal, to pin how it turns the backlog mirror
// into a page: the stat tiles total every repo's counts; each repo gets a
// signal (Quiet, Stale, Automation backlog, Needs triage, Active, checked in
// that order, so an old repo is Stale even when every PR is a draft); the
// signal filter narrows both tables; the repo and item columns sort in their
// documented first-click direction and flip on a second click; clicking a repo
// row scopes the open items to it and clicking again clears that; items show
// their type, claimant and feature-request count; and an empty or failed load
// says so. The backlog, likes, claims, feature-request and session modules are
// mocked, so nothing reaches the network.
import React from 'react';
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/dev', asPath: '/dev', query: {}, push: vi.fn()})}));
vi.mock('../services/backlogService', () => ({getBacklogSummary: vi.fn(), getBacklogItems: vi.fn()}));
vi.mock('../services/likeService', () => ({
    getLikeCounts: vi.fn(),
    getMyLikes: vi.fn(),
    likeTarget: vi.fn(),
    unlikeTarget: vi.fn(),
}));
vi.mock('../services/claimService', () => ({
    getActiveClaims: vi.fn(),
    getMyClaims: vi.fn(),
    claimItem: vi.fn(),
    releaseItem: vi.fn(),
}));
vi.mock('../services/featureRequestService', () => ({
    getFeatureRequests: vi.fn(),
    createFeatureRequest: vi.fn(),
    convertFeatureRequest: vi.fn(),
}));
vi.mock('../utils/session', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../utils/session')>()),
    getSessionToken: vi.fn(),
}));

import DevPortalPage from '../pages/dev/index';
import {getBacklogItems, getBacklogSummary, type BacklogItem, type RepoSummary} from '../services/backlogService';
import {getLikeCounts, getMyLikes} from '../services/likeService';
import {getActiveClaims, type Claim} from '../services/claimService';
import {getFeatureRequests, type FeatureRequest} from '../services/featureRequestService';
import {getSessionToken} from '../utils/session';

const DAY_MS = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

const summaryRow = (repo: string, openIssueCount: number, openPrCount: number, draftPrCount: number,
                    oldestOpenItemAt: string | null): RepoSummary =>
    ({repo, openIssueCount, openPrCount, draftPrCount, oldestOpenItemAt});

// One repo per signal. Wild-Pets has only draft PRs but is over two years old,
// so it must read as Stale, not Automation backlog.
const SUMMARY: RepoSummary[] = [
    summaryRow('Fiefs', 1, 1, 0, daysAgo(10)),
    summaryRow('Currencies', 0, 0, 0, null),
    summaryRow('Mailboxes', 3, 0, 0, daysAgo(20)),
    summaryRow('Democracy', 0, 2, 2, daysAgo(5)),
    summaryRow('Wild-Pets', 2, 1, 1, daysAgo(3 * 365)),
];

const item = (repo: string, number: number, itemType: BacklogItem['itemType'], title: string,
              draft = false, githubCreatedAt = daysAgo(number)): BacklogItem => ({
    repo,
    number,
    targetId: `${repo}#${number}`,
    itemType,
    title,
    draft,
    authorLogin: null,
    htmlUrl: `https://github.com/Dans-Plugins/${repo}/issues/${number}`,
    commentCount: 0,
    githubCreatedAt,
    githubUpdatedAt: githubCreatedAt,
});

const ITEMS: BacklogItem[] = [
    item('Fiefs', 1, 'ISSUE', 'Fief taxes broken'),
    item('Fiefs', 2, 'PULL_REQUEST', 'Fix fief taxes'),
    item('Democracy', 7, 'PULL_REQUEST', 'Ranked voting', true),
    item('Wild-Pets', 4, 'ISSUE', 'Pets wander off'),
];

const featureRequest = (id: string, repo: string, title: string): FeatureRequest => ({
    id, repo, title, description: '', authorUsername: 'alice', status: 'OPEN', convertedIssueUrl: null,
    createdAt: daysAgo(1),
});

const claim = (repo: string, number: number, claimantUsername: string): Claim =>
    ({repo, number, targetId: `${repo}#${number}`, claimantUsername, claimedAt: daysAgo(1)});

const signalGroup = () => screen.getByRole('group', {name: 'filter by signal'});
const pickSignal = (label: string) => fireEvent.click(within(signalGroup()).getByText(label));

// The repo table is the one with a "Repo" column header; its body rows, minus
// the header row.
const repoTable = () => screen.getByRole('columnheader', {name: 'Repo'}).closest('table') as HTMLElement;
const repoRows = () => within(repoTable()).getAllByRole('row').slice(1);
const repoOrder = () => repoRows().map((row) => (row.querySelector('td')?.textContent ?? '').replace(/ →$/, ''));
const repoRow = (repo: string) => screen.getByText(`${repo} →`).closest('tr') as HTMLElement;

const itemLinks = () => screen.queryAllByRole('link')
    .map((link) => link.textContent ?? '')
    .filter((text) => / #\d+ — /.test(text));
const itemRow = (name: string) => screen.getByRole('link', {name}).closest('tr') as HTMLElement;

// Clicks a column's sort label. Found through its header, since the Repo
// select above the item table is also a button labelled "Repo".
const sortBy = (column: string) =>
    fireEvent.click(within(screen.getByRole('columnheader', {name: column})).getByRole('button'));

const tile = (label: string) => (screen.getByText(label).closest('.MuiCard-root') as HTMLElement).textContent;

const renderLoaded = async () => {
    render(<DevPortalPage/>);
    await screen.findByText('Fiefs →');
};

beforeAll(() => {
    // jsdom does not implement scrollIntoView, which the jump links and repo
    // rows call.
    Object.defineProperty(Element.prototype, 'scrollIntoView', {value: vi.fn(), configurable: true, writable: true});
});

beforeEach(() => {
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    vi.mocked(getBacklogSummary).mockReset().mockResolvedValue(SUMMARY);
    vi.mocked(getBacklogItems).mockReset().mockResolvedValue(ITEMS);
    vi.mocked(getFeatureRequests).mockReset().mockResolvedValue([]);
    vi.mocked(getLikeCounts).mockReset().mockResolvedValue({});
    vi.mocked(getMyLikes).mockReset().mockResolvedValue([]);
    vi.mocked(getActiveClaims).mockReset().mockResolvedValue([]);
    vi.mocked(getSessionToken).mockReset().mockResolvedValue(null);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('/dev page', () => {
    it('has exactly one <h1>, naming the page, inside the main landmark', async () => {
        await renderLoaded();

        const headings = screen.getAllByRole('heading', {level: 1});
        expect(headings.map((h) => h.textContent)).toEqual(['Developer Portal']);
        expect(within(screen.getByRole('main')).getByRole('heading', {level: 1})).toBe(headings[0]);
    });

    it('totals every repo\'s open issues, PRs and drafts in the stat tiles', async () => {
        await renderLoaded();

        expect(tile('Open issues')).toBe('6Open issues');
        expect(tile('Open PRs')).toBe('4Open PRs');
        expect(tile('Stuck in draft')).toBe('3Stuck in draft');
    });

    it('gives each repo its signal, with Stale taking precedence over an all-draft PR list', async () => {
        await renderLoaded();

        const signalOf = (repo: string) => within(repoRow(repo)).getAllByRole('cell')[4].textContent;
        expect(signalOf('Fiefs')).toBe('Active');
        expect(signalOf('Currencies')).toBe('Quiet');
        expect(signalOf('Mailboxes')).toBe('Needs triage');
        expect(signalOf('Democracy')).toBe('Automation backlog');
        expect(signalOf('Wild-Pets')).toBe('Stale');
    });

    it('shows a repo\'s draft count beside its PR count only when it has drafts', async () => {
        await renderLoaded();

        const prsOf = (repo: string) => within(repoRow(repo)).getAllByRole('cell')[2].textContent;
        expect(prsOf('Fiefs')).toBe('1');
        expect(prsOf('Democracy')).toBe('2 (2)');
    });

    it('lists the repos in the order the API returned them until a column is sorted', async () => {
        await renderLoaded();

        expect(repoOrder()).toEqual(['Fiefs', 'Currencies', 'Mailboxes', 'Democracy', 'Wild-Pets']);
    });

    it('sorts the Issues column most-first on the first click and flips on the second', async () => {
        await renderLoaded();

        sortBy('Issues');
        expect(repoOrder()).toEqual(['Mailboxes', 'Wild-Pets', 'Fiefs', 'Currencies', 'Democracy']);

        sortBy('Issues');
        expect(repoOrder()).toEqual(['Currencies', 'Democracy', 'Fiefs', 'Wild-Pets', 'Mailboxes']);
    });

    it('sorts the Signal column most-urgent-first on the first click', async () => {
        await renderLoaded();

        sortBy('Signal');
        expect(repoOrder()).toEqual(['Wild-Pets', 'Mailboxes', 'Democracy', 'Fiefs', 'Currencies']);
    });

    it('sorts the Repo column alphabetically on the first click', async () => {
        await renderLoaded();

        sortBy('Repo');
        expect(repoOrder()).toEqual(['Currencies', 'Democracy', 'Fiefs', 'Mailboxes', 'Wild-Pets']);
    });

    it('narrows both tables to the picked signal and clears back to all', async () => {
        await renderLoaded();

        pickSignal('Automation backlog');
        expect(repoOrder()).toEqual(['Democracy']);
        expect(itemLinks()).toEqual(['Democracy #7 — Ranked voting']);
        expect(screen.getByText('Signal: Automation backlog')).toBeTruthy();

        pickSignal('All');
        expect(repoOrder()).toHaveLength(5);
        expect(itemLinks()).toHaveLength(4);
        expect(screen.queryByText('Signal: Automation backlog')).toBeNull();
    });

    it('says so when no repo or item matches the picked signal', async () => {
        vi.mocked(getBacklogSummary).mockResolvedValue([SUMMARY[0]]);
        vi.mocked(getBacklogItems).mockResolvedValue(ITEMS.filter((i) => i.repo === 'Fiefs'));
        await renderLoaded();

        pickSignal('Stale');
        expect(screen.getByText('No repos match this filter.')).toBeTruthy();
        expect(screen.getByText('Nothing matches these filters.')).toBeTruthy();
    });

    it('scopes the open items to a repo when its row is clicked, and clears on a second click', async () => {
        await renderLoaded();

        fireEvent.click(repoRow('Fiefs'));
        expect(screen.getByRole('heading', {level: 2, name: 'Open items — Fiefs'})).toBeTruthy();
        expect(itemLinks()).toEqual(['Fiefs #1 — Fief taxes broken', 'Fiefs #2 — Fix fief taxes']);
        expect(screen.getByText('Repo: Fiefs')).toBeTruthy();
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

        fireEvent.click(repoRow('Fiefs'));
        expect(screen.getByRole('heading', {level: 2, name: 'Open items'})).toBeTruthy();
        expect(itemLinks()).toHaveLength(4);
        expect(screen.queryByText('Repo: Fiefs')).toBeNull();
    });

    it('links each item to GitHub in a new tab and labels its type', async () => {
        await renderLoaded();

        const link = screen.getByRole('link', {name: 'Fiefs #1 — Fief taxes broken'});
        expect(link.getAttribute('href')).toBe('https://github.com/Dans-Plugins/Fiefs/issues/1');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');

        const typeOf = (name: string) => within(itemRow(name)).getAllByRole('cell')[1].textContent;
        expect(typeOf('Fiefs #1 — Fief taxes broken')).toBe('Issue');
        expect(typeOf('Fiefs #2 — Fix fief taxes')).toBe('PR');
        expect(typeOf('Democracy #7 — Ranked voting')).toBe('Draft PR');
    });

    it('shows who has claimed an item, and offers the claim button on the rest', async () => {
        vi.mocked(getActiveClaims).mockResolvedValue([claim('Wild-Pets', 4, 'alice')]);
        await renderLoaded();

        expect(await within(itemRow('Wild-Pets #4 — Pets wander off')).findByText('Claimed by alice')).toBeTruthy();
        expect(within(itemRow('Fiefs #1 — Fief taxes broken')).getByRole('button', {name: 'I\'m working on this'}))
            .toBeTruthy();
    });

    it('sorts items by interest most-first on the first click', async () => {
        vi.mocked(getLikeCounts).mockResolvedValue({'Democracy#7': 2, 'Wild-Pets#4': 5});
        await renderLoaded();
        expect(getLikeCounts).toHaveBeenCalledWith('issue');

        sortBy('Interested');
        await waitFor(() => expect(itemLinks()).toEqual([
            'Wild-Pets #4 — Pets wander off',
            'Democracy #7 — Ranked voting',
            'Fiefs #1 — Fief taxes broken',
            'Fiefs #2 — Fix fief taxes',
        ]));
    });

    it('counts feature requests per repo in the Ideas column', async () => {
        vi.mocked(getFeatureRequests).mockResolvedValue([
            featureRequest('fr-1', 'Mailboxes', 'Mailbox colours'),
            featureRequest('fr-2', 'Mailboxes', 'Parcel lockers'),
        ]);
        await renderLoaded();

        const ideasOf = (repo: string) => within(repoRow(repo)).getAllByRole('cell')[5].textContent;
        await waitFor(() => expect(ideasOf('Mailboxes')).toBe('2'));
        expect(ideasOf('Fiefs')).toBe('—');
    });

    it('does not fetch the user\'s likes while signed out', async () => {
        await renderLoaded();

        expect(getSessionToken).toHaveBeenCalled();
        expect(getMyLikes).not.toHaveBeenCalled();
    });

    it('explains that the first sync has not run when the backlog is empty', async () => {
        vi.mocked(getBacklogSummary).mockResolvedValue([]);
        vi.mocked(getBacklogItems).mockResolvedValue([]);
        render(<DevPortalPage/>);

        expect(await screen.findByText(
            'No backlog data yet — the sync runs on a schedule and may not have completed its first pass.'
        )).toBeTruthy();
        expect(tile('Open issues')).toBe('0Open issues');
        expect(tile('Oldest open item')).toBe('—Oldest open item');
    });

    it('says the backlog could not be loaded when a request fails', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.mocked(getBacklogSummary).mockRejectedValue(new Error('down'));
        render(<DevPortalPage/>);

        expect(await screen.findByText('We couldn’t load the backlog right now. Please try again later.')).toBeTruthy();
        expect(consoleError).toHaveBeenCalledWith('Failed to load backlog data:', expect.any(Error));
    });
});
