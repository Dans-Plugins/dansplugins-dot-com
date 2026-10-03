// @vitest-environment jsdom
//
// The "I'm working on this" control on the dev page: someone else's claim is
// shown as text, a signed-out click explains itself, a signed-in click claims
// through the claims API and reports the claimant to the parent, your own claim
// can be released, and a failed request says why.
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';

vi.mock('../services/claimService', () => ({
    claimItem: vi.fn(),
    releaseItem: vi.fn(),
}));

import ClaimButton from '../components/ClaimButton';
import {claimItem, releaseItem} from '../services/claimService';

// A JWT whose payload names `sub`; the header and signature are never checked
// client-side, so placeholders are enough.
const tokenFor = (sub: string) => `h.${btoa(JSON.stringify({sub}))}.s`;

const claim = () => screen.getByRole('button', {name: "I'm working on this"});
const release = () => screen.getByRole('button', {name: 'Release'});

beforeEach(() => {
    vi.mocked(claimItem).mockReset();
    vi.mocked(releaseItem).mockReset();
});

afterEach(() => {
    cleanup();
});

describe('ClaimButton', () => {
    it('shows someone else\'s claim as text, with no button', () => {
        render(<ClaimButton repo="Fiefs" number={12} claimantUsername="alice"
                            token={tokenFor('bob')} onChange={vi.fn()}/>);
        expect(screen.getByText('Claimed by alice')).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('explains, rather than calls the API, when a signed-out user clicks', async () => {
        const onChange = vi.fn();
        render(<ClaimButton repo="Fiefs" number={12} claimantUsername={null} token={null} onChange={onChange}/>);

        fireEvent.click(claim());
        expect(await screen.findByText('Sign in to claim an issue or PR.')).toBeTruthy();
        expect(screen.getByRole('button', {name: 'Sign in'})).toBeTruthy();
        expect(claimItem).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('claims, and reports the claimant the server returned', async () => {
        vi.mocked(claimItem).mockResolvedValue({
            ok: true,
            claim: {
                repo: 'Fiefs',
                number: 12,
                targetId: 'Fiefs#12',
                claimantUsername: 'bob-server',
                claimedAt: '2026-10-03T00:00:00Z',
            },
        });
        const onChange = vi.fn();
        render(<ClaimButton repo="Fiefs" number={12} claimantUsername={null}
                            token={tokenFor('bob')} onChange={onChange}/>);

        fireEvent.click(claim());
        await waitFor(() => expect(onChange).toHaveBeenCalledWith('bob-server'));
        expect(claimItem).toHaveBeenCalledWith(tokenFor('bob'), 'Fiefs', 12);
    });

    it('falls back to the signed-in username when the server returns no claim body', async () => {
        vi.mocked(claimItem).mockResolvedValue({ok: true});
        const onChange = vi.fn();
        render(<ClaimButton repo="Fiefs" number={12} claimantUsername={null}
                            token={tokenFor('bob')} onChange={onChange}/>);

        fireEvent.click(claim());
        await waitFor(() => expect(onChange).toHaveBeenCalledWith('bob'));
    });

    it('disables the button while a claim is in flight', async () => {
        let resolve: (result: {ok: true}) => void = () => {};
        vi.mocked(claimItem).mockReturnValue(new Promise<{ok: true}>((r) => { resolve = r; }));
        render(<ClaimButton repo="Fiefs" number={12} claimantUsername={null}
                            token={tokenFor('bob')} onChange={vi.fn()}/>);

        fireEvent.click(claim());
        await waitFor(() => expect((claim() as HTMLButtonElement).disabled).toBe(true));
        fireEvent.click(claim());
        expect(claimItem).toHaveBeenCalledTimes(1);

        resolve({ok: true});
        await waitFor(() => expect((claim() as HTMLButtonElement).disabled).toBe(false));
    });

    it('shows the server\'s message and does not report a change when the claim fails', async () => {
        vi.mocked(claimItem).mockResolvedValue({ok: false, message: 'Already claimed by alice'});
        const onChange = vi.fn();
        render(<ClaimButton repo="Fiefs" number={12} claimantUsername={null}
                            token={tokenFor('bob')} onChange={onChange}/>);

        fireEvent.click(claim());
        expect(await screen.findByText('Already claimed by alice')).toBeTruthy();
        expect(onChange).not.toHaveBeenCalled();
        // A failure is not a sign-in problem, so no "Sign in" action is offered.
        expect(screen.queryByRole('button', {name: 'Sign in'})).toBeNull();
    });

    it('offers Release on your own claim, and reports null once released', async () => {
        vi.mocked(releaseItem).mockResolvedValue({ok: true});
        const onChange = vi.fn();
        render(<ClaimButton repo="Fiefs" number={12} claimantUsername="bob"
                            token={tokenFor('bob')} onChange={onChange}/>);

        expect(screen.queryByText('Claimed by bob')).toBeNull();
        fireEvent.click(release());
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
        expect(releaseItem).toHaveBeenCalledWith(tokenFor('bob'), 'Fiefs', 12);
        expect(claimItem).not.toHaveBeenCalled();
    });

    it('shows the server\'s message when a release fails', async () => {
        vi.mocked(releaseItem).mockResolvedValue({ok: false, message: 'Network error — please try again.'});
        const onChange = vi.fn();
        render(<ClaimButton repo="Fiefs" number={12} claimantUsername="bob"
                            token={tokenFor('bob')} onChange={onChange}/>);

        fireEvent.click(release());
        expect(await screen.findByText('Network error — please try again.')).toBeTruthy();
        expect(onChange).not.toHaveBeenCalled();
    });
});
