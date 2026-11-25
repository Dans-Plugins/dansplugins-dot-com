/**
 * @vitest-environment jsdom
 */
// The home page's plugin grid when dpc-api has never answered: it must say the
// catalogue is unavailable and offer next steps (retry, or the plugins on
// GitHub), never an empty grid or a bare sentence.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/', asPath: '/', query: {}, push: vi.fn()})}));
vi.mock('../services/likeService', () => ({getLikeCounts: vi.fn().mockResolvedValue({}), getMyLikes: vi.fn().mockResolvedValue([])}));
vi.mock('../utils/session', () => ({getSessionToken: vi.fn().mockResolvedValue(null)}));

import {PluginsSection} from '../pages/index';

afterEach(cleanup);

describe('home page plugin grid with no catalogue', () => {
    it('explains the outage and offers a retry and a GitHub route', async () => {
        render(<PluginsSection initialPlugins={[]}/>);

        const notice = await screen.findByTestId('catalogue-unavailable');
        expect(notice.textContent).toContain('The plugin catalogue could not be loaded right now.');
        expect(within(notice).getByRole('button', {name: 'Try again'})).toBeTruthy();
        expect(within(notice).getByRole('link', {name: 'Browse the plugins on GitHub'}).getAttribute('href'))
            .toBe('https://github.com/Dans-Plugins');
    });
});
