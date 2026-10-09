// @vitest-environment jsdom
//
// The feature-request list and form on /dev: it loads the requests (scoped to the
// repo filter) with their upvote counts, marks the ones this user upvoted, refuses
// to submit while signed out, posts trimmed input and reloads on success, and
// offers "Convert to GitHub issue" on open requests to any signed-in user (the
// admin check is server-side), surfacing the server's message when either fails.
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';

vi.mock('../services/featureRequestService', () => ({
    getFeatureRequests: vi.fn(),
    createFeatureRequest: vi.fn(),
    convertFeatureRequest: vi.fn(),
}));
vi.mock('../services/likeService', () => ({
    likeTarget: vi.fn(),
    unlikeTarget: vi.fn(),
    getLikeCounts: vi.fn(),
    getMyLikes: vi.fn(),
}));

import FeatureRequestSection from '../components/FeatureRequestSection';
import {
    convertFeatureRequest,
    createFeatureRequest,
    FeatureRequest,
    getFeatureRequests,
} from '../services/featureRequestService';
import {getLikeCounts, getMyLikes} from '../services/likeService';

const request = (overrides: Partial<FeatureRequest>): FeatureRequest => ({
    id: 'fr-1',
    repo: 'Fiefs',
    title: 'Fief taxes',
    description: 'Let lords tax their fiefs.',
    authorUsername: 'alice',
    status: 'OPEN',
    convertedIssueUrl: null,
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
});

const repos = ['Fiefs', 'Currencies'];

// The title and description fields, in render order. The plugin select is not a
// textbox, so it is not among them.
const fields = () => screen.getAllByRole('textbox') as HTMLInputElement[];
const submitButton = () => screen.getByRole('button', {name: 'Suggest it'});
// Submit the form directly, bypassing the browser's `required` check, so these
// tests exercise the component's own guards.
const submitForm = () => fireEvent.submit(submitButton().closest('form')!);
// Let the mount-time fetches settle.
const settle = () => act(async () => {});

beforeEach(() => {
    vi.mocked(getFeatureRequests).mockReset().mockResolvedValue([]);
    vi.mocked(createFeatureRequest).mockReset();
    vi.mocked(convertFeatureRequest).mockReset();
    vi.mocked(getLikeCounts).mockReset().mockResolvedValue({});
    vi.mocked(getMyLikes).mockReset().mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
});

describe('FeatureRequestSection', () => {
    it('loads every repo\'s requests when unfiltered and says when there are none', async () => {
        render(<FeatureRequestSection repos={repos} repoFilter="" token={null}/>);

        expect(await screen.findByText('No feature requests here yet — be the first.')).toBeTruthy();
        expect(getFeatureRequests).toHaveBeenCalledWith(undefined);
        expect(getLikeCounts).toHaveBeenCalledWith('feature_request');
    });

    it('scopes the request list and the heading to the repo filter', async () => {
        render(<FeatureRequestSection repos={repos} repoFilter="Currencies" token={null}/>);
        await settle();

        expect(getFeatureRequests).toHaveBeenCalledWith('Currencies');
        expect(screen.getByRole('heading', {name: 'Feature requests — Currencies'})).toBeTruthy();
    });

    it('renders each request with its upvote count, and a converted one with its issue link', async () => {
        vi.mocked(getFeatureRequests).mockResolvedValue([
            request({id: 'fr-1', title: 'Fief taxes'}),
            request({
                id: 'fr-2',
                title: 'Exchange rates',
                repo: 'Currencies',
                authorUsername: 'bob',
                status: 'CONVERTED',
                convertedIssueUrl: 'https://github.com/Dans-Plugins/Currencies/issues/9',
            }),
        ]);
        vi.mocked(getLikeCounts).mockResolvedValue({'fr-1': 5});
        render(<FeatureRequestSection repos={repos} repoFilter="" token={null}/>);

        expect(await screen.findByText('Fief taxes')).toBeTruthy();
        expect(screen.getByText('Exchange rates')).toBeTruthy();
        expect(screen.queryByText('No feature requests here yet — be the first.')).toBeNull();
        expect(screen.getByText(/Suggested by alice/)).toBeTruthy();
        expect(screen.getAllByText('Converted to issue')).toHaveLength(1);
        const link = screen.getByRole('link', {name: 'View the issue'});
        expect(link.getAttribute('href')).toBe('https://github.com/Dans-Plugins/Currencies/issues/9');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');

        // One heart per request; a request missing from the counts shows zero.
        const counts = screen.getAllByRole('button', {name: 'Like'}).map((b) => b.closest('div')!.textContent);
        expect(counts).toEqual(['5', '0']);
    });

    it('marks only the requests this user upvoted as feature requests', async () => {
        vi.mocked(getFeatureRequests).mockResolvedValue([
            request({id: 'fr-1', title: 'Fief taxes'}),
            request({id: 'fr-2', title: 'Fief wars'}),
        ]);
        vi.mocked(getMyLikes).mockResolvedValue([
            {targetType: 'feature_request', targetId: 'fr-1'},
            // Same id, different target type: not an upvote on fr-2's request.
            {targetType: 'plugin', targetId: 'fr-2'},
        ]);
        render(<FeatureRequestSection repos={repos} repoFilter="" token="jwt"/>);

        await waitFor(() => expect(screen.getAllByRole('button', {name: 'Unlike'})).toHaveLength(1));
        expect(screen.getAllByRole('button', {name: 'Like'})).toHaveLength(1);
        expect(getMyLikes).toHaveBeenCalledWith('jwt');
    });

    it('does not fetch the user\'s likes or offer conversion when signed out', async () => {
        vi.mocked(getFeatureRequests).mockResolvedValue([request({})]);
        render(<FeatureRequestSection repos={repos} repoFilter="" token={null}/>);

        await screen.findByText('Fief taxes');
        expect(getMyLikes).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', {name: 'Convert to GitHub issue'})).toBeNull();
    });

    it('asks a signed-out user to sign in instead of submitting', async () => {
        render(<FeatureRequestSection repos={repos} repoFilter="" token={null}/>);
        await settle();

        const [title, description] = fields();
        fireEvent.change(title, {target: {value: 'Fief taxes'}});
        fireEvent.change(description, {target: {value: 'Let lords tax their fiefs.'}});
        submitForm();

        expect(await screen.findByText('Sign in to suggest a feature.')).toBeTruthy();
        expect(createFeatureRequest).not.toHaveBeenCalled();
    });

    it('does not submit a title or description that is only whitespace', async () => {
        render(<FeatureRequestSection repos={repos} repoFilter="" token="jwt"/>);
        await settle();

        const [title, description] = fields();
        fireEvent.change(title, {target: {value: '   '}});
        fireEvent.change(description, {target: {value: 'Let lords tax their fiefs.'}});
        submitForm();
        await settle();

        expect(createFeatureRequest).not.toHaveBeenCalled();
    });

    it('submits trimmed input against the filtered repo, then clears the form and reloads', async () => {
        vi.mocked(createFeatureRequest).mockResolvedValue({ok: true, value: request({})});
        render(<FeatureRequestSection repos={repos} repoFilter="Currencies" token="jwt"/>);
        await settle();
        expect(getFeatureRequests).toHaveBeenCalledTimes(1);

        const [title, description] = fields();
        fireEvent.change(title, {target: {value: '  Exchange rates  '}});
        fireEvent.change(description, {target: {value: '  Convert between currencies.  '}});
        submitForm();

        await waitFor(() => expect(getFeatureRequests).toHaveBeenCalledTimes(2));
        expect(createFeatureRequest).toHaveBeenCalledWith('jwt', 'Currencies', 'Exchange rates', 'Convert between currencies.');
        expect(fields()[0].value).toBe('');
        expect(fields()[1].value).toBe('');
        expect((submitButton() as HTMLButtonElement).disabled).toBe(false);
    });

    it('defaults the plugin to the first repo when there is no filter', async () => {
        vi.mocked(createFeatureRequest).mockResolvedValue({ok: true, value: request({})});
        render(<FeatureRequestSection repos={repos} repoFilter="" token="jwt"/>);
        await settle();

        const [title, description] = fields();
        fireEvent.change(title, {target: {value: 'Fief taxes'}});
        fireEvent.change(description, {target: {value: 'Let lords tax their fiefs.'}});
        submitForm();

        await waitFor(() => expect(createFeatureRequest).toHaveBeenCalledWith('jwt', 'Fiefs', 'Fief taxes', 'Let lords tax their fiefs.'));
    });

    it('shows the server\'s message and keeps the input when submitting fails', async () => {
        vi.mocked(createFeatureRequest).mockResolvedValue({ok: false, message: 'Title is too long'});
        render(<FeatureRequestSection repos={repos} repoFilter="" token="jwt"/>);
        await settle();

        const [title, description] = fields();
        fireEvent.change(title, {target: {value: 'Fief taxes'}});
        fireEvent.change(description, {target: {value: 'Let lords tax their fiefs.'}});
        submitForm();

        expect(await screen.findByText('Title is too long')).toBeTruthy();
        expect(fields()[0].value).toBe('Fief taxes');
        expect(fields()[1].value).toBe('Let lords tax their fiefs.');
        expect(getFeatureRequests).toHaveBeenCalledTimes(1);
        expect((submitButton() as HTMLButtonElement).disabled).toBe(false);
    });

    it('offers conversion on open requests only, and reloads after converting', async () => {
        vi.mocked(getFeatureRequests).mockResolvedValue([
            request({id: 'fr-1', title: 'Fief taxes'}),
            request({id: 'fr-2', title: 'Fief wars', status: 'CONVERTED', convertedIssueUrl: 'https://example.com/1'}),
        ]);
        vi.mocked(convertFeatureRequest).mockResolvedValue({ok: true, value: request({status: 'CONVERTED'})});
        render(<FeatureRequestSection repos={repos} repoFilter="" token="jwt"/>);
        await screen.findByText('Fief taxes');

        const convert = screen.getAllByRole('button', {name: 'Convert to GitHub issue'});
        expect(convert).toHaveLength(1);
        fireEvent.click(convert[0]);

        await waitFor(() => expect(getFeatureRequests).toHaveBeenCalledTimes(2));
        expect(convertFeatureRequest).toHaveBeenCalledWith('jwt', 'fr-1');
    });

    it('shows the server\'s message when converting fails', async () => {
        vi.mocked(getFeatureRequests).mockResolvedValue([request({})]);
        vi.mocked(convertFeatureRequest).mockResolvedValue({ok: false, message: 'Admins only'});
        render(<FeatureRequestSection repos={repos} repoFilter="" token="jwt"/>);
        await screen.findByText('Fief taxes');

        fireEvent.click(screen.getByRole('button', {name: 'Convert to GitHub issue'}));

        expect(await screen.findByText('Admins only')).toBeTruthy();
        expect(getFeatureRequests).toHaveBeenCalledTimes(1);
    });
});
