/**
 * @vitest-environment jsdom
 */
// What /resources/[slug] and /guides/[id] render when getServerSideProps
// answered 503 because dpc-api could not be reached (#612): a "temporarily
// unavailable" heading, the shared outage notice with its Try again button,
// and a noindex tag so a crawler does not file the notice as the page.
import React, {type ReactNode} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/', asPath: '/resources/medieval-factions', query: {}, push: vi.fn()})}));
vi.mock('next/head', () => ({default: ({children}: {children: ReactNode}) => <>{children}</>}));

import ResourcePage from '../pages/resources/[slug]';
import GuidePage from '../pages/guides/[id]';

afterEach(cleanup);

describe.each([
    ['plugin page', ResourcePage, 'This plugin page is temporarily unavailable'],
    ['guide page', GuidePage, 'This guide is temporarily unavailable'],
])('%s while dpc-api is down', (_label, Page, heading) => {
    it('says it is temporarily unavailable, offers a retry, and is noindex', () => {
        const {container} = render(<Page unavailable/>);

        expect(screen.getByRole('heading', {level: 1}).textContent).toBe(heading);
        const notice = screen.getByTestId('catalogue-unavailable');
        expect(within(notice).getByRole('button', {name: 'Try again'})).toBeTruthy();
        expect(container.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
        expect(container.querySelector('link[rel="canonical"]')).toBeNull();
        expect(screen.queryByText(/doesn.t exist/)).toBeNull();
    });
});
