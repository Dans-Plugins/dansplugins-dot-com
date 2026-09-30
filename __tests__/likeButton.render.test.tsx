// @vitest-environment jsdom
//
// The heart shown on plugins, guides and resources: a signed-out click explains
// itself instead of navigating, a signed-in click toggles through the likes API
// and takes the server's count, and a failed request says so. The self-loading
// variant fetches its own count and whether this user already liked the target.
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';

vi.mock('../services/likeService', () => ({
    likeTarget: vi.fn(),
    unlikeTarget: vi.fn(),
    getLikeCounts: vi.fn(),
    getMyLikes: vi.fn(),
}));
vi.mock('../utils/session', () => ({getSessionToken: vi.fn()}));

import LikeButton from '../components/LikeButton';
import SelfLoadingLikeButton from '../components/SelfLoadingLikeButton';
import {getLikeCounts, getMyLikes, likeTarget, unlikeTarget} from '../services/likeService';
import {getSessionToken} from '../utils/session';

const heart = () => screen.getByRole('button', {name: /^(Like|Unlike)$/});
const shownCount = () => heart().closest('div')!.textContent;

beforeEach(() => {
    vi.mocked(likeTarget).mockReset();
    vi.mocked(unlikeTarget).mockReset();
    vi.mocked(getLikeCounts).mockReset();
    vi.mocked(getMyLikes).mockReset();
    vi.mocked(getSessionToken).mockReset();
});

afterEach(() => {
    cleanup();
});

describe('LikeButton', () => {
    it('renders the given count and liked state', () => {
        render(<LikeButton targetType="plugin" targetId="fiefs" count={7} liked={true} token="jwt"/>);
        expect(heart().getAttribute('aria-label')).toBe('Unlike');
        expect(heart().getAttribute('aria-pressed')).toBe('true');
        expect(shownCount()).toBe('7');
    });

    it('explains, rather than calls the API, when a signed-out user clicks', async () => {
        render(<LikeButton targetType="plugin" targetId="fiefs" count={3} liked={false} token={null}/>);
        fireEvent.click(heart());
        expect(await screen.findByText('Sign in to like plugins and guides.')).toBeTruthy();
        expect(screen.getByRole('button', {name: 'Sign in'})).toBeTruthy();
        expect(likeTarget).not.toHaveBeenCalled();
        expect(unlikeTarget).not.toHaveBeenCalled();
        expect(shownCount()).toBe('3');
    });

    it('likes, then unlikes, taking the count the server returns each time', async () => {
        vi.mocked(likeTarget).mockResolvedValue(42);
        vi.mocked(unlikeTarget).mockResolvedValue(41);
        render(<LikeButton targetType="guide" targetId="mf-intro" count={3} liked={false} token="jwt"/>);

        fireEvent.click(heart());
        await waitFor(() => expect(heart().getAttribute('aria-pressed')).toBe('true'));
        expect(likeTarget).toHaveBeenCalledWith('jwt', 'guide', 'mf-intro');
        // The server's count, not the local count plus one.
        expect(shownCount()).toBe('42');

        fireEvent.click(heart());
        await waitFor(() => expect(heart().getAttribute('aria-pressed')).toBe('false'));
        expect(unlikeTarget).toHaveBeenCalledWith('jwt', 'guide', 'mf-intro');
        expect(shownCount()).toBe('41');
    });

    it('disables the button while a request is in flight', async () => {
        let resolve: (count: number | null) => void = () => {};
        vi.mocked(likeTarget).mockReturnValue(new Promise<number | null>((r) => { resolve = r; }));
        render(<LikeButton targetType="plugin" targetId="fiefs" count={0} liked={false} token="jwt"/>);

        fireEvent.click(heart());
        await waitFor(() => expect((heart() as HTMLButtonElement).disabled).toBe(true));
        fireEvent.click(heart());
        expect(likeTarget).toHaveBeenCalledTimes(1);

        resolve(1);
        await waitFor(() => expect((heart() as HTMLButtonElement).disabled).toBe(false));
    });

    it('keeps the old state and says so when the request fails', async () => {
        vi.mocked(likeTarget).mockResolvedValue(null);
        render(<LikeButton targetType="plugin" targetId="fiefs" count={5} liked={false} token="jwt"/>);

        fireEvent.click(heart());
        expect(await screen.findByText('Couldn’t save your like — please try again.')).toBeTruthy();
        expect(heart().getAttribute('aria-pressed')).toBe('false');
        expect(shownCount()).toBe('5');
        // A failure is not a sign-in problem, so no "Sign in" action is offered.
        expect(screen.queryByRole('button', {name: 'Sign in'})).toBeNull();
    });

    it('follows new count and liked props from its parent', () => {
        const {rerender} = render(<LikeButton targetType="plugin" targetId="fiefs" count={0} liked={false} token="jwt"/>);
        rerender(<LikeButton targetType="plugin" targetId="fiefs" count={9} liked={true} token="jwt"/>);
        expect(shownCount()).toBe('9');
        expect(heart().getAttribute('aria-pressed')).toBe('true');
    });
});

describe('SelfLoadingLikeButton', () => {
    it('loads the target\'s count and does not ask for likes when signed out', async () => {
        vi.mocked(getLikeCounts).mockResolvedValue({fiefs: 4, other: 99});
        vi.mocked(getSessionToken).mockResolvedValue(null);
        render(<SelfLoadingLikeButton targetType="plugin" targetId="fiefs"/>);

        await waitFor(() => expect(shownCount()).toBe('4'));
        expect(getLikeCounts).toHaveBeenCalledWith('plugin');
        expect(getMyLikes).not.toHaveBeenCalled();
        expect(heart().getAttribute('aria-pressed')).toBe('false');
    });

    it('shows zero for a target with no likes yet', async () => {
        vi.mocked(getLikeCounts).mockResolvedValue({other: 2});
        vi.mocked(getSessionToken).mockResolvedValue(null);
        render(<SelfLoadingLikeButton targetType="plugin" targetId="fiefs"/>);

        // Let the mocked fetches settle before reading the count, so this checks
        // the missing-id fallback rather than the initial state.
        await act(async () => {});
        expect(getLikeCounts).toHaveBeenCalledWith('plugin');
        expect(shownCount()).toBe('0');
    });

    it('marks the target liked when the signed-in user liked this type and id', async () => {
        vi.mocked(getLikeCounts).mockResolvedValue({'mf-intro': 1});
        vi.mocked(getSessionToken).mockResolvedValue('jwt');
        vi.mocked(getMyLikes).mockResolvedValue([{targetType: 'guide', targetId: 'mf-intro'}]);
        render(<SelfLoadingLikeButton targetType="guide" targetId="mf-intro"/>);

        await waitFor(() => expect(heart().getAttribute('aria-pressed')).toBe('true'));
        expect(getMyLikes).toHaveBeenCalledWith('jwt');
    });

    it('does not count a like on the same id under another target type', async () => {
        vi.mocked(getLikeCounts).mockResolvedValue({});
        vi.mocked(getSessionToken).mockResolvedValue('jwt');
        vi.mocked(getMyLikes).mockResolvedValue([{targetType: 'plugin', targetId: 'mf-intro'}]);
        render(<SelfLoadingLikeButton targetType="guide" targetId="mf-intro"/>);

        await waitFor(() => expect(getMyLikes).toHaveBeenCalledWith('jwt'));
        await act(async () => {});
        expect(heart().getAttribute('aria-pressed')).toBe('false');
    });
});
